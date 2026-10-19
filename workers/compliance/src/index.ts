import 'dotenv/config';
import { connect, StringCodec, NatsConnection } from 'nats';
import pkg from 'pg';
import OpenAI from 'openai';

const { Pool } = pkg;
const sc = StringCodec();

// Simple console logger for worker
const logger = {
  info: (msg: string, data?: any) => console.log(JSON.stringify({ level: 'info', msg, ...data, timestamp: new Date().toISOString() })),
  error: (msg: string, data?: any) => console.error(JSON.stringify({ level: 'error', msg, ...data, timestamp: new Date().toISOString() })),
  warn: (msg: string, data?: any) => console.warn(JSON.stringify({ level: 'warn', msg, ...data, timestamp: new Date().toISOString() })),
};

interface SurveyIngestedEvent {
  openingId: string;
  projectId: string;
  organizationId: string;
  userId: string;
  doorType: string;
  timestamp: string;
}

interface ComplianceViolation {
  code: string;
  category: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  citations: string[];
  recommendation: string;
}

/**
 * Check opening compliance using the existing RAG-based compliance validation
 * This reuses the same logic as the synchronous compliance-checker but runs asynchronously
 */
async function checkOpeningCompliance(
  pool: any,
  openingId: string,
  organizationId: string,
  openaiClient: OpenAI | null
): Promise<ComplianceViolation[]> {
  try {
    // Fetch opening details
    const openingResult = await pool.query(`
      SELECT * FROM door_openings WHERE id = $1
    `, [openingId]);
    
    if (!openingResult.rows || openingResult.rows.length === 0) {
      logger.warn('Opening not found', { openingId });
      return [];
    }
    
    const opening = openingResult.rows[0];
    
    // Fetch relevant building code sections using RAG (if OpenAI is configured)
    let violations: ComplianceViolation[] = [];
    
    if (openaiClient) {
      try {
        // Use RAG to find relevant compliance rules
        const query = `door opening ${opening.door_type || 'commercial'} ${opening.fire_rating || ''} accessibility requirements`;
        
        const embeddingResponse = await openaiClient.embeddings.create({
          model: 'text-embedding-3-small',
          input: query,
        });
        
        const embedding = embeddingResponse.data[0].embedding;
        
        // Query pgvector for similar compliance rules
        const complianceResult = await pool.query(`
          SELECT 
            code_section,
            category,
            full_text,
            embedding <=> $1::vector AS distance
          FROM building_code_embeddings
          WHERE embedding <=> $1::vector < 0.5
          ORDER BY distance
          LIMIT 5
        `, [`[${embedding.join(',')}]`]);
        
        // Validate opening against retrieved rules
        for (const rule of complianceResult.rows || []) {
          const violation = await validateAgainstRule(opening, rule, openaiClient);
          if (violation) {
            violations.push(violation);
          }
        }
      } catch (error: any) {
        logger.error('RAG compliance check failed', { 
          error: error.message,
          openingId,
        });
      }
    }
    
    // Basic rule-based checks (always run, even without OpenAI)
    const basicViolations = performBasicComplianceChecks(opening);
    violations = violations.concat(basicViolations);
    
    return violations;
  } catch (error: any) {
    logger.error('Compliance check failed', {
      error: error.message,
      openingId,
    });
    return [];
  }
}

/**
 * Validate opening against a specific compliance rule using OpenAI
 */
async function validateAgainstRule(
  opening: any,
  rule: any,
  openaiClient: OpenAI
): Promise<ComplianceViolation | null> {
  try {
    const prompt = `Analyze if this door opening complies with the building code requirement.

Opening Details:
- Type: ${opening.door_type}
- Fire Rating: ${opening.fire_rating || 'None'}
- Width: ${opening.clear_width_mm || 'Unknown'} mm
- Swing Direction: ${opening.swing_direction || 'Unknown'}

Building Code Requirement:
${rule.full_text}

Respond with JSON:
{
  "complies": true/false,
  "violation": "description if non-compliant",
  "recommendation": "how to fix"
}`;

    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0,
    });
    
    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    if (!result.complies && result.violation) {
      return {
        code: rule.code_section,
        category: rule.category,
        severity: 'major' as const,
        description: result.violation,
        citations: [rule.code_section],
        recommendation: result.recommendation || 'Consult building code requirements',
      };
    }
    
    return null;
  } catch (error: any) {
    logger.error('Rule validation failed', { error: error.message });
    return null;
  }
}

/**
 * Perform basic compliance checks without AI
 */
function performBasicComplianceChecks(opening: any): ComplianceViolation[] {
  const violations: ComplianceViolation[] = [];
  
  // ADA 404.2.3: Clear width minimum 32 inches (813mm)
  const clearWidthMm = opening.clear_width_mm ? Number(opening.clear_width_mm) : null;
  if (clearWidthMm !== null && clearWidthMm < 813) {
    violations.push({
      code: 'ADA-404.2.3',
      category: 'Accessibility',
      severity: 'major',
      description: `Clear width of ${clearWidthMm}mm is below the required minimum of 813mm (32 inches)`,
      citations: ['ADA 404.2.3'],
      recommendation: 'Increase clear opening width to at least 813mm (32 inches) to comply with ADA requirements',
    });
  }
  
  // Fire-rated doors must have proper hardware
  if (opening.fire_rating && !opening.has_fire_rated_hardware) {
    violations.push({
      code: 'IBC-716.5',
      category: 'Fire Safety',
      severity: 'critical',
      description: 'Fire-rated door requires fire-rated hardware',
      citations: ['IBC 716.5'],
      recommendation: 'Install UL-listed fire-rated hardware appropriate for the door\'s fire rating',
    });
  }
  
  return violations;
}

/**
 * Store compliance violations in database
 */
async function storeViolations(
  pool: any,
  nc: NatsConnection,
  openingId: string,
  organizationId: string,
  violations: ComplianceViolation[]
): Promise<void> {
  for (const violation of violations) {
    try {
      await pool.query(`
        INSERT INTO compliance_violations (
          organization_id,
          opening_id,
          code,
          category,
          severity,
          description,
          citations,
          recommendation,
          status,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        organizationId,
        openingId,
        violation.code,
        violation.category,
        violation.severity,
        violation.description,
        JSON.stringify(violation.citations),
        violation.recommendation,
        'open',
      ]);
      
      logger.info('Violation created', {
        openingId,
        code: violation.code,
        severity: violation.severity,
      });
      
      // Publish event for notification/webhook
      await publishEvent(nc, 'violation.created', {
        openingId,
        organizationId,
        code: violation.code,
        severity: violation.severity,
        description: violation.description,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Failed to store violation', {
        error: error.message,
        openingId,
        code: violation.code,
      });
    }
  }
}

/**
 * Publish event helper
 */
async function publishEvent(nc: NatsConnection, subject: string, data: any): Promise<void> {
  try {
    const payload = sc.encode(JSON.stringify(data));
    nc.publish(subject, payload);
  } catch (error: any) {
    logger.error('Failed to publish event', { error: error.message, subject });
  }
}

async function main() {
  const natsUrl = process.env.NATS_URL || 'nats://localhost:4222';
  const databaseUrl = process.env.DATABASE_URL;
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!databaseUrl) {
    logger.error('DATABASE_URL not configured', {});
    process.exit(1);
  }
  
  // OpenAI is optional - worker will use basic checks if not configured
  const openaiClient = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;
  if (!openaiClient) {
    logger.warn('OPENAI_API_KEY not configured - using basic compliance checks only', {});
  }
  
  try {
    // Connect to NATS
    const nc: NatsConnection = await connect({ 
      servers: natsUrl,
      maxReconnectAttempts: -1,
      reconnectTimeWait: 2000,
    });
    logger.info('Connected to NATS', { server: natsUrl });
    
    // Connect to database
    const pool = new Pool({ connectionString: databaseUrl });
    logger.info('Connected to database', {});
    
    // Subscribe to survey.ingested events
    const sub = nc.subscribe('survey.ingested');
    logger.info('Compliance worker listening on survey.ingested', {});
    
    // Process events
    for await (const m of sub) {
      try {
        const event: SurveyIngestedEvent = JSON.parse(sc.decode(m.data));
        logger.info('Received survey.ingested event', { 
          openingId: event.openingId,
          organizationId: event.organizationId,
        });
        
        // Check compliance
        const violations = await checkOpeningCompliance(
          pool,
          event.openingId,
          event.organizationId,
          openaiClient
        );
        
        if (violations.length > 0) {
          logger.info('Compliance violations found', { 
            openingId: event.openingId,
            count: violations.length,
          });
          
          // Store violations
          await storeViolations(pool, nc, event.openingId, event.organizationId, violations);
        } else {
          logger.info('No compliance violations found', { 
            openingId: event.openingId,
          });
        }
      } catch (error: any) {
        logger.error('Event processing error', { 
          error: error.message,
          stack: error.stack,
        });
      }
    }
  } catch (error: any) {
    logger.error('Worker startup failed', { 
      error: error.message,
      natsUrl,
    });
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
  logger.info('Received SIGTERM, shutting down gracefully', {});
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('Received SIGINT, shutting down gracefully', {});
  process.exit(0);
});

main().catch((error) => {
  logger.error('Fatal error', { error: error.message });
  process.exit(1);
});
