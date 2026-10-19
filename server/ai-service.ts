import OpenAI from "openai";
import { logError, logger } from "./logger";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own OpenAI API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// Using gpt-4o (GPT-4 Omni) which supports vision and is the latest stable OpenAI model with vision capabilities
const MODEL = "gpt-4o";
// For structured outputs with guaranteed JSON formatting, use gpt-4o-mini
const STRUCTURED_OUTPUT_MODEL = "gpt-4o-mini";

interface PhotoAnalysisResult {
  doorType?: string;
  width?: string;
  height?: string;
  thickness?: string;
  material?: string;
  frameType?: string;
  frameWidth?: string;
  frameDepth?: string;
  frameGauge?: string;
  hardware?: string[];
  manufacturer?: string;
  model?: string;
  fireRating?: string;
  confidence: number;
  suggestions: string[];
}

interface MeasurementValidation {
  isValid: boolean;
  confidence: number;
  anomalies: string[];
  suggestions: string[];
  correctedValues?: {
    width?: string;
    height?: string;
    thickness?: string;
  };
}

interface ComplianceExplanation {
  violation: string;
  explanation: string;
  impact: string;
  solutions: string[];
  estimatedCost?: string;
  urgency: "critical" | "high" | "medium" | "low";
}

interface DamageDetectionResult {
  hasDamage: boolean;
  damageTypes: string[];
  severity: "none" | "minor" | "moderate" | "severe" | "critical";
  damageLocations: string[];
  damageDescriptions: string[];
  repairRecommendations: string[];
  estimatedRepairCost?: string;
  urgency: "immediate" | "high" | "medium" | "low";
  confidence: number;
}

interface ConditionReport {
  overallCondition: "excellent" | "good" | "fair" | "poor" | "critical";
  conditionScore: number; // 0-100
  doorCondition: {
    rating: string;
    issues: string[];
  };
  frameCondition: {
    rating: string;
    issues: string[];
  };
  hardwareCondition: {
    rating: string;
    issues: string[];
  };
  damageAssessment: DamageDetectionResult;
  safetyHazards: string[];
  maintenanceNeeded: string[];
  replacementRecommended: boolean;
  estimatedLifeRemaining?: string;
  timestamp: string;
}

export async function analyzePhotoForSpecs(
  imageBase64: string,
  buildingType?: string
): Promise<PhotoAnalysisResult> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert commercial door and frame surveyor with 20+ years of experience. Analyze door photos to extract precise specifications following ANSI/SDI A250.8 and ANSI/BHMA standards.

Extract all visible specifications including:
- Door dimensions (width, height, thickness in inches)
- Door type (single, double, sliding, etc.)
- Material (hollow metal, wood, glass, aluminum)
- Frame specifications (width, depth, gauge)
- Hardware (locks, closers, hinges, exit devices)
- Fire ratings (if visible on labels)
- Manufacturer and model information

Provide confidence scores and practical suggestions for the surveyor.
Return data in JSON format.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this commercial door photo${buildingType ? ` from a ${buildingType}` : ''}. Extract all visible specifications, measurements, hardware, and provide confidence scores for each field.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      doorType: result.doorType,
      width: result.width,
      height: result.height,
      thickness: result.thickness,
      material: result.material,
      frameType: result.frameType,
      frameWidth: result.frameWidth,
      frameDepth: result.frameDepth,
      frameGauge: result.frameGauge,
      hardware: result.hardware || [],
      manufacturer: result.manufacturer,
      model: result.model,
      fireRating: result.fireRating,
      confidence: result.confidence || 0.7,
      suggestions: result.suggestions || []
    };
  } catch (error) {
    logError(error as Error, { context: 'ai-photo-analysis', buildingType });
    throw new Error('Failed to analyze photo with AI');
  }
}

export async function validateMeasurements(
  measurements: {
    width: string;
    height: string;
    thickness?: string;
    doorType?: string;
    buildingType?: string;
  }
): Promise<MeasurementValidation> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert commercial door surveyor specializing in measurement validation. 
          
Standard commercial door dimensions:
- Single doors: 3'0" × 7'0" (36" × 84"), 3'0" × 8'0" (36" × 96"), 3'6" × 7'0" (42" × 84")
- Double doors: 6'0" × 7'0" (72" × 84"), 6'0" × 8'0" (72" × 96")
- Thickness: 1-3/4" (1.75") or 1-3/8" (1.375") standard
- ADA requirements: Minimum 32" clear width (typically 36" door)

Identify anomalies, provide confidence scores, and suggest corrections if needed.
Return data in JSON format.`
        },
        {
          role: "user",
          content: `Validate these door measurements:
Width: ${measurements.width}
Height: ${measurements.height}
Thickness: ${measurements.thickness || 'not specified'}
Door Type: ${measurements.doorType || 'not specified'}
Building Type: ${measurements.buildingType || 'not specified'}

Check for:
1. Unusual dimensions vs. industry standards
2. ADA compliance issues
3. Measurement format errors (feet/inches notation)
4. Typical sizing for building type
5. Safety or code concerns

Provide anomalies, suggestions, and corrected values if needed.`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1500
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      isValid: result.isValid !== false,
      confidence: result.confidence || 0.8,
      anomalies: result.anomalies || [],
      suggestions: result.suggestions || [],
      correctedValues: result.correctedValues
    };
  } catch (error) {
    logError(error as Error, { context: 'ai-measurement-validation', measurements });
    throw new Error('Failed to validate measurements with AI');
  }
}

export async function explainCompliance(
  violation: {
    ruleCode: string;
    description: string;
    severity: string;
  },
  doorSpecs: {
    width?: string;
    height?: string;
    doorType?: string;
    buildingType?: string;
  }
): Promise<ComplianceExplanation> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a building code compliance expert specializing in commercial door installations. Explain code violations in clear, practical terms and provide actionable solutions.

Cover:
- Why the violation matters (safety, accessibility, legal)
- Practical impact on building occupants
- Step-by-step solutions with product recommendations
- Estimated costs for remediation
- Urgency level based on safety and legal requirements

Use industry terminology but explain clearly for non-experts.
Return data in JSON format.`
        },
        {
          role: "user",
          content: `Explain this compliance violation:

Code: ${violation.ruleCode}
Violation: ${violation.description}
Severity: ${violation.severity}

Door Specifications:
- Width: ${doorSpecs.width || 'not specified'}
- Height: ${doorSpecs.height || 'not specified'}
- Type: ${doorSpecs.doorType || 'not specified'}
- Building Type: ${doorSpecs.buildingType || 'not specified'}

Provide:
1. Clear explanation of why this violates code
2. Real-world impact (safety, accessibility, legal)
3. 2-3 specific solutions with product recommendations
4. Estimated cost range for remediation
5. Urgency level (critical/high/medium/low)`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      violation: violation.description,
      explanation: result.explanation || '',
      impact: result.impact || '',
      solutions: result.solutions || [],
      estimatedCost: result.estimatedCost,
      urgency: result.urgency || 'medium'
    };
  } catch (error) {
    logError(error as Error, { context: 'ai-compliance-explanation', ruleCode: violation.ruleCode });
    throw new Error('Failed to explain compliance violation with AI');
  }
}

export async function detectDamage(
  imageBase64: string,
  doorType?: string
): Promise<DamageDetectionResult> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert commercial door inspector specializing in damage assessment and structural integrity. Analyze door and frame photos to detect all visible damage, wear, and safety issues.

Identify damage types:
- Structural: dents, cracks, warping, rust/corrosion, holes
- Finish: scratches, paint damage, discoloration, staining
- Hardware: loose/broken hinges, damaged locks, worn closers
- Safety: sharp edges, protruding parts, missing components
- Weathering: water damage, sun fade, deterioration

For each issue found:
- Classify severity (minor/moderate/severe/critical)
- Describe exact location and extent
- Provide repair vs. replacement recommendation
- Estimate urgency and cost impact

Return comprehensive damage assessment in JSON format.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Inspect this commercial door${doorType ? ` (${doorType})` : ''} for damage, wear, safety hazards, and structural issues. Provide detailed damage assessment with severity ratings and repair recommendations.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 2000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      hasDamage: result.hasDamage !== false,
      damageTypes: result.damageTypes || [],
      severity: result.severity || "none",
      damageLocations: result.damageLocations || [],
      damageDescriptions: result.damageDescriptions || [],
      repairRecommendations: result.repairRecommendations || [],
      estimatedRepairCost: result.estimatedRepairCost,
      urgency: result.urgency || "low",
      confidence: result.confidence || 0.8,
    };
  } catch (error) {
    logError(error as Error, { context: 'ai-damage-detection', doorType });
    throw new Error('Failed to detect damage with AI');
  }
}

export async function generateConditionReport(
  imageBase64: string,
  doorType?: string,
  buildingType?: string
): Promise<ConditionReport> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a certified building inspector with expertise in commercial door systems. Generate comprehensive condition reports assessing overall door assembly health, safety, and lifecycle status.

Assess three main areas:
1. Door condition: surface, core, edges, glazing
2. Frame condition: jambs, head, threshold, anchoring
3. Hardware condition: hinges, locks, closers, exit devices, seals

Rate each on scale: excellent/good/fair/poor/critical
Calculate overall condition score (0-100)
Identify safety hazards requiring immediate attention
Recommend maintenance, repair, or replacement
Estimate remaining useful life

Consider building type, usage intensity, and code compliance.
Return structured condition report in JSON format.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Generate comprehensive condition report for this commercial door${doorType ? ` (${doorType})` : ''}${buildingType ? ` in a ${buildingType}` : ''}. Include overall assessment, component ratings, damage analysis, safety evaluation, and maintenance recommendations.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 3000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      overallCondition: result.overallCondition || "good",
      conditionScore: result.conditionScore || 75,
      doorCondition: result.doorCondition || { rating: "good", issues: [] },
      frameCondition: result.frameCondition || { rating: "good", issues: [] },
      hardwareCondition: result.hardwareCondition || { rating: "good", issues: [] },
      damageAssessment: result.damageAssessment || {
        hasDamage: false,
        damageTypes: [],
        severity: "none",
        damageLocations: [],
        damageDescriptions: [],
        repairRecommendations: [],
        urgency: "low",
        confidence: 0.8,
      },
      safetyHazards: result.safetyHazards || [],
      maintenanceNeeded: result.maintenanceNeeded || [],
      replacementRecommended: result.replacementRecommended || false,
      estimatedLifeRemaining: result.estimatedLifeRemaining,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    logError(error as Error, { context: 'ai-condition-report', doorType, buildingType });
    throw new Error('Failed to generate condition report with AI');
  }
}

export async function suggestCorrections(
  originalData: any,
  userCorrectedData: any,
  context: string
): Promise<{ insights: string[]; patterns: string[] }> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a machine learning system analyzing user corrections to improve future predictions. 
          
Identify patterns in corrections to learn:
- Common AI mistakes (e.g., misreading certain door types)
- User preferences (e.g., preferred measurement formats)
- Context-specific patterns (e.g., hospital doors vs. office doors)
- Systematic biases in measurements or specifications

Provide actionable insights for improving future AI predictions.
Return data in JSON format.`
        },
        {
          role: "user",
          content: `Analyze this correction:

Context: ${context}

Original AI Data:
${JSON.stringify(originalData, null, 2)}

User Corrected Data:
${JSON.stringify(userCorrectedData, null, 2)}

What patterns or insights can improve future predictions?`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      insights: result.insights || [],
      patterns: result.patterns || []
    };
  } catch (error) {
    logError(error as Error, { context: 'ai-correction-analysis' });
    return { insights: [], patterns: [] };
  }
}

// ENHANCED: AI-Powered Comprehensive Vision Analysis
export interface ComprehensiveVisionAnalysis {
  specifications: {
    doorType?: string;
    width?: string;
    height?: string;
    material?: string;
    hardware?: string[];
    confidence: number;
  };
  damageDetection: {
    hasDamage: boolean;
    damageTypes: string[];
    severity: string;
    urgency: string;
    damageDescriptions: string[];
    repairRecommendations: string[];
  };
  conditionReport: {
    overallCondition: string;
    conditionScore: number;
    doorCondition: {
      rating: string;
      issues: string[];
    };
    frameCondition: {
      rating: string;
      issues: string[];
    };
    hardwareCondition: {
      rating: string;
      issues: string[];
    };
    maintenanceNeeded: string[];
    safetyHazards: string[];
    replacementRecommended: boolean;
    estimatedLifeRemaining?: string;
  };
}

export async function analyzeImageComprehensive(
  imageBase64: string,
  doorType: string,
  buildingType: string
): Promise<ComprehensiveVisionAnalysis> {
  try {
    // Normalize image format
    const normalizedImage = imageBase64.startsWith('data:') 
      ? imageBase64 
      : `data:image/jpeg;base64,${imageBase64}`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert commercial door inspector. Analyze door images comprehensively for specifications, damage, and overall condition. Provide detailed, actionable insights.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this ${doorType} door in a ${buildingType} building. Provide comprehensive assessment including:

1. Specifications (type, dimensions, material, hardware)
2. Damage detection (types, severity, urgency)
3. Overall condition report (door, frame, hardware ratings)
4. Safety hazards and maintenance needs

Return JSON with this exact structure:
{
  "specifications": {
    "doorType": "single/double/sliding/etc",
    "width": "36 inches",
    "height": "84 inches",
    "material": "hollow metal/wood/glass",
    "hardware": ["lever handle", "closer"],
    "confidence": 0.85
  },
  "damageDetection": {
    "hasDamage": true/false,
    "damageTypes": ["scratches", "dents"],
    "severity": "none/minor/moderate/severe/critical",
    "urgency": "none/routine/soon/immediate",
    "damageDescriptions": ["detailed descriptions"],
    "repairRecommendations": ["specific fixes"]
  },
  "conditionReport": {
    "overallCondition": "excellent/good/fair/poor/critical",
    "conditionScore": 75,
    "doorCondition": {"rating": "good", "issues": []},
    "frameCondition": {"rating": "fair", "issues": ["paint peeling"]},
    "hardwareCondition": {"rating": "good", "issues": []},
    "maintenanceNeeded": ["lubricate hinges"],
    "safetyHazards": [],
    "replacementRecommended": false,
    "estimatedLifeRemaining": "5-7 years"
  }
}`
            },
            {
              type: "image_url",
              image_url: {
                url: normalizedImage
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 3000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as ComprehensiveVisionAnalysis;
  } catch (error) {
    logError(error as Error, { context: 'ai-comprehensive-vision', doorType, buildingType });
    throw new Error('Failed to analyze image with AI vision');
  }
}

// ENHANCED: AI-Powered Compliance Validation with Detailed Interpretation
export interface EnhancedComplianceValidation {
  violations: Array<{
    code: string;
    description: string;
    severity: string;
    currentValue: string;
    requiredValue: string;
    citation: string;
    aiExplanation: string;
    fixSuggestion: string;
    estimatedCost?: string;
    riskScore: number;
  }>;
  compliant: boolean;
  violationCount: number;
  criticalViolations: number;
  aiSummary: string;
  prioritizedActions: string[];
  estimatedTotalCost?: string;
}

export async function validateComplianceWithAI(doorSpecs: {
  clearWidth: string;
  openingForce: string;
  nominalWidth: string;
  fireRating: string;
  hardwareFireRating: string;
  occupancyLoad: string;
  lockType: string;
}): Promise<EnhancedComplianceValidation> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert in building codes (IBC, ADA, NFPA 80, NFPA 101, IFC) and commercial door compliance. Analyze specifications, identify violations, provide clear explanations, and recommend fixes.`
        },
        {
          role: "user",
          content: `Validate door specifications against building codes:

Clear Width: ${doorSpecs.clearWidth} inches
Opening Force: ${doorSpecs.openingForce} lbs
Nominal Width: ${doorSpecs.nominalWidth} inches
Fire Rating - Door: ${doorSpecs.fireRating}
Fire Rating - Hardware: ${doorSpecs.hardwareFireRating}
Occupancy Load: ${doorSpecs.occupancyLoad} people
Lock Type: ${doorSpecs.lockType}

Check against:
- ADA: Clear width ≥32", opening force ≤5 lbs
- IBC: Egress width ≥32", panic hardware if occupancy ≥50
- NFPA 80: Door/hardware fire ratings must match, positive latching
- NFPA 101: Egress requirements

Return JSON:
{
  "violations": [
    {
      "code": "ADA-404.2.3",
      "description": "Clear opening width requirement",
      "severity": "critical/major/minor",
      "currentValue": "30 inches",
      "requiredValue": "32 inches minimum",
      "citation": "ADA Standards Section 404.2.3",
      "aiExplanation": "Plain language why this matters for accessibility",
      "fixSuggestion": "Replace with 36\" door and frame assembly",
      "estimatedCost": "$2,500-$4,000",
      "riskScore": 85
    }
  ],
  "compliant": false,
  "violationCount": 3,
  "criticalViolations": 1,
  "aiSummary": "Overall assessment in 2-3 sentences",
  "prioritizedActions": ["Most urgent first", "Second priority"],
  "estimatedTotalCost": "$5,000-$8,000"
}`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 3000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    return result as EnhancedComplianceValidation;
  } catch (error) {
    logError(error as Error, { context: 'ai-compliance-validation', doorSpecs });
    throw new Error('Failed to validate compliance with AI');
  }
}

// ENHANCED: AI-Powered Hardware Recommendations
export interface AIHardwareRecommendation {
  topRecommendation: string;
  reasoning: string;
  alternatives: Array<{
    product: string;
    tier: string;
    pros: string[];
    cons: string[];
    estimatedCost: string;
  }>;
  installationGuidance: string[];
  complianceNotes: string[];
  budgetAnalysis: {
    economyOption: string;
    standardOption: string;
    premiumOption: string;
  };
}

export async function recommendHardwareWithAI(params: {
  buildingType: string;
  trafficLevel: string;
  fireRating: string;
  adaRequired: string;
  securityLevel: string;
  budgetMax?: string;
  category: string;
}): Promise<AIHardwareRecommendation> {
  try {
    const response = await openai.chat.completions.create({
      model: STRUCTURED_OUTPUT_MODEL,
      messages: [
        {
          role: "system",
          content: `You are a commercial door hardware specialist. Provide specific, actionable product recommendations with detailed reasoning, alternatives, installation guidance, and cost analysis.`
        },
        {
          role: "user",
          content: `You are a commercial door hardware specialist. Provide specific hardware recommendations for this project:

Building Type: ${params.buildingType}
Traffic Level: ${params.trafficLevel}
Fire Rating: ${params.fireRating}
ADA Required: ${params.adaRequired}
Security Level: ${params.securityLevel}
Budget Max: ${params.budgetMax || 'flexible'}
Category: ${params.category}

REQUIREMENTS - YOU MUST PROVIDE ALL OF THE FOLLOWING:
1. A topRecommendation (specific product with manufacturer)
2. Detailed reasoning explaining why this is the best choice
3. EXACTLY 3 alternatives (economy, standard, premium) - each with product name, tier, at least 2 pros, at least 2 cons, and estimated cost
4. At least 3 installationGuidance steps
5. At least 2 complianceNotes about ADA, fire rating, or security standards
6. Budget analysis with economyOption, standardOption, and premiumOption

RESPOND WITH VALID JSON IN THIS EXACT FORMAT:
{
  "topRecommendation": "Specific product name with manufacturer (e.g., 'Schlage L9000 Series Mortise Lock')",
  "reasoning": "Detailed explanation of why this product is optimal for the specified requirements",
  "alternatives": [
    {
      "product": "Economy: [Specific manufacturer and model]",
      "tier": "economy",
      "pros": ["specific benefit 1", "specific benefit 2"],
      "cons": ["specific limitation 1", "specific limitation 2"],
      "estimatedCost": "$XXX-$XXX"
    },
    {
      "product": "Standard: [Specific manufacturer and model]",
      "tier": "standard",
      "pros": ["specific benefit 1", "specific benefit 2"],
      "cons": ["specific limitation 1", "specific limitation 2"],
      "estimatedCost": "$XXX-$XXX"
    },
    {
      "product": "Premium: [Specific manufacturer and model]",
      "tier": "premium",
      "pros": ["specific benefit 1", "specific benefit 2"],
      "cons": ["specific limitation 1", "specific limitation 2"],
      "estimatedCost": "$XXX-$XXX"
    }
  ],
  "installationGuidance": [
    "Step 1: Specific installation instruction",
    "Step 2: Critical alignment or adjustment detail",
    "Step 3: Testing or verification step"
  ],
  "complianceNotes": [
    "ADA compliance: Specific requirement met",
    "Fire rating: Compatibility note"
  ],
  "budgetAnalysis": {
    "economyOption": "Total project cost for economy tier",
    "standardOption": "Total project cost for standard tier (recommended)",
    "premiumOption": "Total project cost for premium tier"
  }
}`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 3000
    });

    const responseText = response.choices[0].message.content || '{}';
    
    logger.info('AI Hardware Recommendation Response', { 
      responseLength: responseText.length,
      responsePreview: responseText.substring(0, 500)
    });
    
    const result = JSON.parse(responseText);
    
    logger.info('AI Response Parsed', {
      hasAlternatives: !!result.alternatives,
      alternativesCount: result.alternatives?.length || 0,
      hasComplianceNotes: !!result.complianceNotes,
      complianceNotesCount: result.complianceNotes?.length || 0,
      hasInstallationGuidance: !!result.installationGuidance,
      installationCount: result.installationGuidance?.length || 0,
      hasBudgetAnalysis: !!result.budgetAnalysis,
      hasTopRecommendation: !!result.topRecommendation,
      hasReasoning: !!result.reasoning
    });
    
    // Validate response has all required fields
    const validationErrors: string[] = [];
    if (!result.topRecommendation) validationErrors.push('Missing topRecommendation');
    if (!result.reasoning) validationErrors.push('Missing reasoning');
    if (!result.alternatives || !Array.isArray(result.alternatives) || result.alternatives.length === 0) {
      validationErrors.push('Missing or empty alternatives array');
    }
    if (!result.installationGuidance || !Array.isArray(result.installationGuidance) || result.installationGuidance.length === 0) {
      validationErrors.push('Missing or empty installationGuidance array');
    }
    if (!result.complianceNotes || !Array.isArray(result.complianceNotes) || result.complianceNotes.length === 0) {
      validationErrors.push('Missing or empty complianceNotes array');
    }
    if (!result.budgetAnalysis) validationErrors.push('Missing budgetAnalysis');
    
    if (validationErrors.length > 0) {
      logger.warn('AI Response Validation Failed - Using Fallback Data', {
        validationErrors,
        params,
        responsePreview: responseText.substring(0, 200)
      });
      
      // Supplement with defaults to ensure non-empty response
      result.alternatives = result.alternatives || [];
      result.installationGuidance = result.installationGuidance || [];
      result.complianceNotes = result.complianceNotes || [];
      
      // If still empty, add fallback data
      if (result.alternatives.length === 0) {
        result.alternatives = [
          {
            product: `Economy: Standard ${params.category} Hardware`,
            tier: 'economy',
            pros: ['Cost-effective solution', 'Meets basic requirements'],
            cons: ['Standard durability', 'Limited customization options'],
            estimatedCost: '$150-$300'
          },
          {
            product: `Standard: Commercial Grade ${params.category}`,
            tier: 'standard',
            pros: ['Good durability', 'Industry-standard compliance'],
            cons: ['Moderate pricing', 'Standard warranty'],
            estimatedCost: '$400-$700'
          },
          {
            product: `Premium: Heavy-Duty ${params.category} System`,
            tier: 'premium',
            pros: ['Superior quality', 'Extended warranty', 'Maximum durability'],
            cons: ['Higher investment', 'May require professional installation'],
            estimatedCost: '$800-$1,500'
          }
        ];
      }
      
      if (result.installationGuidance.length === 0) {
        result.installationGuidance = [
          'Verify door preparation matches hardware specifications',
          'Follow manufacturer installation instructions carefully',
          'Test operation and adjust as needed for proper function'
        ];
      }
      
      if (result.complianceNotes.length === 0) {
        result.complianceNotes = [
          `ADA Compliance: ${params.adaRequired === 'yes' ? 'Required - select ADA-compliant hardware' : 'Not required'}`,
          `Fire Rating: ${params.fireRating ? `Must meet ${params.fireRating} fire rating requirements` : 'Standard fire rating acceptable'}`
        ];
      }
      
      if (!result.budgetAnalysis) {
        result.budgetAnalysis = {
          economyOption: 'Contact supplier for economy tier pricing',
          standardOption: 'Contact supplier for standard tier pricing (recommended)',
          premiumOption: 'Contact supplier for premium tier pricing'
        };
      }
      
      if (!result.topRecommendation) {
        result.topRecommendation = result.alternatives[1]?.product || 'Commercial grade hardware recommended';
      }
      
      if (!result.reasoning) {
        result.reasoning = `Based on ${params.buildingType} building type with ${params.trafficLevel} traffic, commercial-grade hardware is recommended to meet durability and compliance requirements.`;
      }
    }
    
    return result as AIHardwareRecommendation;
  } catch (error) {
    logger.error('AI Hardware Recommendation Error', {
      error: error instanceof Error ? error.message : String(error),
      params
    });
    logError(error as Error, { context: 'ai-hardware-recommendations', params });
    throw new Error('Failed to generate hardware recommendations with AI');
  }
}

// ====== PDF CATALOG PROCESSING ======

interface CatalogItem {
  category: string;
  manufacturer: string;
  model: string;
  specifications: string;
  notes: string;
}

export async function processPdfCatalog(pdfFilePath: string): Promise<CatalogItem[]> {
  try {
    // Import required modules dynamically
    const Tesseract = await import('tesseract.js');
    const fs = await import('fs');
    
    // For now, we'll use a simplified approach:
    // In production, you would convert PDF pages to images first
    // For this implementation, we'll assume the PDF is a scanned document
    // and use OCR directly on it
    
    // Read the PDF file (simplified - in production, convert PDF to images first)
    const fileBuffer = fs.readFileSync(pdfFilePath);
    
    // Perform OCR on the PDF
    const worker = await Tesseract.createWorker('eng');
    
    let text: string;
    try {
      ({ data: { text } } = await worker.recognize(fileBuffer));
    } finally {
      await worker.terminate();
    }
    
    // Use OpenAI to parse the extracted text into structured catalog data
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert at extracting structured catalog data from unstructured text. 
          
Parse the provided text and extract catalog items with the following fields:
- category: door, frame, hardware, automation, access-control
- manufacturer: Company name
- model: Product model number or name
- specifications: Technical specs (dimensions, materials, ratings, etc.)
- notes: Additional information

Return a JSON array of catalog items. Extract as many items as you can identify from the text.
If information is missing for a field, use reasonable defaults or leave it empty.`
        },
        {
          role: "user",
          content: `Extract all catalog items from this text:\n\n${text}`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 4000
    });

    const result = JSON.parse(response.choices[0].message.content || '{"items":[]}');
    return result.items || [];
  } catch (error) {
    logError(error as Error, { context: 'pdf-catalog-processing', pdfFilePath });
    throw new Error('Failed to process PDF catalog with AI');
  }
}
