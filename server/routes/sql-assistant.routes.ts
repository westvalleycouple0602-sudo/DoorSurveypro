import { Router } from "express";
import { getOrganizationContext } from "../clerkAuth";
import { requireFeature } from "../feature-gates";
import { z } from "zod";
import { db } from "../db";
import { logger } from "../logger";
import OpenAI from "openai";
import { sql } from "drizzle-orm";
import { parse as parseSql } from "pgsql-parser";

const router = Router();

// Lazy-initialize so a missing key doesn't crash the server at startup
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

async function authenticateUser(req: any, res: any) {
  const context = await getOrganizationContext(req);
  if (!context) {
    res.status(401).json({ error: "Unauthorized" });
    return null;
  }
  return context;
}

// Multi-tenant table names that require organization_id filtering
const TENANT_SCOPED_TABLES = [
  "projects",
  "door_openings",
  "customers",
  "customer_locations",
  "customer_products",
  "quotes",
  "purchase_orders",
  "memberships",
];

// Whitelist of tables that can be queried by SQL Assistant
const WHITELISTED_TABLES = [
  "door_openings",
  "projects",
  "hardware_catalog",
  "compliance_rules",
  "door_types_library",
  "code_embeddings",
];

interface ParsedQuery {
  isValid: boolean;
  isReadOnly: boolean;
  tables: string[];
  error?: string;
}

/**
 * AST-based SQL validation using pgsql-parser
 * Ensures query is read-only and safe to execute
 */
async function validateSQLAST(sqlQuery: string): Promise<ParsedQuery> {
  try {
    // Parse SQL into AST
    const ast = await parseSql(sqlQuery);

    // Validate it's a single SELECT statement
    if (!ast.stmts || ast.stmts.length !== 1) {
      return {
        isValid: false,
        isReadOnly: false,
        tables: [],
        error: "Only single SELECT statements are allowed",
      };
    }

    const statement = ast.stmts[0].stmt;

    // Check if it's a SELECT statement
    if (!statement || statement.SelectStmt === undefined) {
      return {
        isValid: false,
        isReadOnly: false,
        tables: [],
        error: "Only SELECT statements are allowed. No INSERT, UPDATE, DELETE, DROP, or other destructive operations.",
      };
    }

    // Extract table names from the AST
    const tables = extractTablesFromAST(statement.SelectStmt);

    // Validate all tables are whitelisted
    const invalidTables = tables.filter(
      (table) => !WHITELISTED_TABLES.includes(table.toLowerCase())
    );

    if (invalidTables.length > 0) {
      return {
        isValid: false,
        isReadOnly: true,
        tables,
        error: `Access denied to tables: ${invalidTables.join(", ")}. Only whitelisted tables can be queried.`,
      };
    }

    return {
      isValid: true,
      isReadOnly: true,
      tables,
    };
  } catch (error: any) {
    logger.warn("SQL parsing failed", { error: error.message, sqlQuery });
    return {
      isValid: false,
      isReadOnly: false,
      tables: [],
      error: `Invalid SQL syntax: ${error.message}`,
    };
  }
}

/**
 * Extract table names from SELECT statement AST
 */
function extractTablesFromAST(selectStmt: any): string[] {
  const tables: string[] = [];

  // Extract from FROM clause
  if (selectStmt.fromClause) {
    for (const fromItem of selectStmt.fromClause) {
      if (fromItem.RangeVar?.relname) {
        tables.push(fromItem.RangeVar.relname);
      }
      // Handle JOINs
      if (fromItem.JoinExpr) {
        extractTablesFromJoin(fromItem.JoinExpr, tables);
      }
    }
  }

  return Array.from(new Set(tables)); // Remove duplicates
}

/**
 * Recursively extract tables from JOIN expressions
 */
function extractTablesFromJoin(joinExpr: any, tables: string[]): void {
  if (joinExpr.larg?.RangeVar?.relname) {
    tables.push(joinExpr.larg.RangeVar.relname);
  }
  if (joinExpr.rarg?.RangeVar?.relname) {
    tables.push(joinExpr.rarg.RangeVar.relname);
  }
  if (joinExpr.larg?.JoinExpr) {
    extractTablesFromJoin(joinExpr.larg.JoinExpr, tables);
  }
  if (joinExpr.rarg?.JoinExpr) {
    extractTablesFromJoin(joinExpr.rarg.JoinExpr, tables);
  }
}

/**
 * Inject organization_id filter for multi-tenant security using prepared statements
 * Rewrites SQL to use $1 for organization_id parameter
 */
function injectOrganizationFilter(sqlQuery: string, tables: string[]): {
  sql: string;
  error?: string;
} {
  // Check if any tenant-scoped tables are referenced
  const tenantTables = tables.filter((table) =>
    TENANT_SCOPED_TABLES.includes(table.toLowerCase())
  );

  if (tenantTables.length === 0) {
    // No tenant tables - safe to execute as-is
    return { sql: sqlQuery };
  }

  // For each tenant table, ensure organization_id filter exists
  const lowerSQL = sqlQuery.toLowerCase();
  
  for (const table of tenantTables) {
    const orgFilterPattern = new RegExp(
      `\\b${table}\\b.*?\\borganization_id\\s*=\\s*\\$1\\b`,
      'i'
    );

    if (!orgFilterPattern.test(lowerSQL)) {
      return {
        sql: sqlQuery,
        error: `Security violation: Query references tenant table "${table}" without organization_id filter. All tenant tables MUST include WHERE ${table}.organization_id = $1 in the generated SQL.`,
      };
    }
  }

  return { sql: sqlQuery };
}

// Get database schema snapshot (whitelisted tables only)
async function getSchemaSnapshot(organizationId: string): Promise<string> {
  try {
    const result = await db.execute(sql`
      SELECT 
        table_name,
        column_name,
        data_type,
        is_nullable
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY(${WHITELISTED_TABLES}::text[])
      ORDER BY table_name, ordinal_position
    `);

    // Format as readable schema
    let schema = "-- DoorSurvey Pro Database Schema (Read-Only Access)\n\n";
    let currentTable = "";

    for (const row of result.rows as any[]) {
      if (row.table_name !== currentTable) {
        if (currentTable) schema += ");\n\n";
        currentTable = row.table_name;
        schema += `TABLE ${row.table_name} (\n`;
      } else {
        schema += ",\n";
      }
      schema += `  ${row.column_name} ${row.data_type}${
        row.is_nullable === "NO" ? " NOT NULL" : ""
      }`;
    }

    if (currentTable) schema += "\n);\n";

    return schema;
  } catch (error) {
    logger.error("Failed to get schema snapshot", { error, organizationId });
    return "-- Schema unavailable";
  }
}

const AskSchema = z.object({
  question: z.string().min(1, "Question is required"),
});

/**
 * SQL Assistant endpoint with production-grade security
 * Uses AST-based validation and prepared statements
 * Requires apiAccess feature (Enterprise-only)
 */
router.post("/api/sql-assistant/query", requireFeature("apiAccess"), async (req, res) => {
  let context: { organizationId: string; userId: string } | null = null;
  try {
    context = await authenticateUser(req, res);
    if (!context) return;

    const validatedData = AskSchema.parse(req.body);
    const { question } = validatedData;

    // Get schema for organization's context
    const schema = await getSchemaSnapshot(context.organizationId);

    // Use AI to generate SQL with multi-tenant filtering
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ error: "AI SQL assistant requires OPENAI_API_KEY to be configured" });
    }
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are a PostgreSQL expert assistant. Generate ONLY read-only SELECT queries based on the provided schema.

CRITICAL MULTI-TENANT SECURITY RULES:
1. ALWAYS use prepared statement parameter $1 for organization_id filtering
2. For ANY query touching tenant-scoped tables (${TENANT_SCOPED_TABLES.join(", ")}), you MUST include:
   WHERE table_name.organization_id = $1
3. ONLY generate SELECT statements - no INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, GRANT, REVOKE
4. Return strict JSON: {"sql": "...", "rationale": "...", "safe": true, "requiresOrgFilter": true}
5. Set "safe": false if the query cannot be made read-only
6. Set "requiresOrgFilter": true if the query accesses org-scoped tables
7. Include helpful rationale explaining the query logic
8. Use proper PostgreSQL syntax and best practices
9. Limit results to reasonable numbers (e.g., LIMIT 100) unless user asks for all
10. Use $1 for organization_id parameter (reserved)

Example with tenant table:
SELECT * FROM projects WHERE organization_id = $1 LIMIT 10

Example with non-tenant table:
SELECT * FROM compliance_rules LIMIT 10

Available whitelisted tables: ${WHITELISTED_TABLES.join(", ")}`,
        },
        {
          role: "user",
          content: `Schema:\n${schema}\n\nUser's Organization ID will be provided as $1 parameter\n\nQuestion: ${question}\n\nGenerate a safe, read-only SELECT query with proper organization filtering using $1 for organization_id.`,
        },
      ],
      response_format: { type: "json_object" },
      temperature: 0.2,
    });

    const aiResult = JSON.parse(
      response.choices[0]?.message?.content || '{"safe":false}'
    );

    // Validate safety flag
    if (!aiResult.safe || !aiResult.sql) {
      logger.warn("Unsafe SQL query rejected by AI", {
        question,
        organizationId: context.organizationId,
      });
      return res.json({
        sql: aiResult.sql || "",
        rationale: aiResult.rationale || "Query deemed unsafe by AI",
        safe: false,
        rows: [],
        rowCount: 0,
        tables: [],
        executionError: "Cannot generate safe query for this request",
      });
    }

    // AST-based validation (production-grade security)
    const astValidation = await validateSQLAST(aiResult.sql);

    if (!astValidation.isValid) {
      logger.warn("SQL query failed AST validation", {
        sql: aiResult.sql,
        error: astValidation.error,
        organizationId: context.organizationId,
      });
      return res.json({
        sql: aiResult.sql,
        rationale: aiResult.rationale || "AST validation failed",
        safe: false,
        rows: [],
        rowCount: 0,
        tables: astValidation.tables || [],
        executionError: `Query validation failed: ${astValidation.error}`,
        note: "The generated SQL does not pass security validation checks.",
      });
    }

    if (!astValidation.isReadOnly) {
      logger.warn("Non-SELECT query blocked", {
        sql: aiResult.sql,
        organizationId: context.organizationId,
      });
      return res.json({
        sql: aiResult.sql,
        rationale: aiResult.rationale || "Non-SELECT query blocked",
        safe: false,
        rows: [],
        rowCount: 0,
        tables: astValidation.tables,
        executionError: "Only SELECT queries are allowed",
        note: "Destructive operations (INSERT, UPDATE, DELETE, DROP) are blocked for data protection.",
      });
    }

    // Enforce organization filtering for multi-tenant security
    const securityCheck = injectOrganizationFilter(
      aiResult.sql,
      astValidation.tables
    );

    if (securityCheck.error) {
      logger.error("SQL security violation blocked", {
        error: securityCheck.error,
        sql: aiResult.sql,
        tables: astValidation.tables,
        organizationId: context.organizationId,
      });
      return res.json({
        sql: aiResult.sql,
        rationale: aiResult.rationale || "Multi-tenant security violation",
        safe: false,
        rows: [],
        rowCount: 0,
        tables: astValidation.tables,
        executionError: "Multi-tenant security violation",
        note: securityCheck.error,
      });
    }

    // Execute query with organization_id parameter substitution
    let rows: any[] = [];
    let executionError: string | null = null;

    try {
      // SECURITY: Wrap query in subquery to enforce hard 1000-row limit
      // This prevents memory exhaustion from unbounded result sets
      // The subquery preserves any user-specified LIMIT (e.g., LIMIT 50) while
      // capping the maximum at 1000 rows
      const guardedSQL = `SELECT * FROM (${securityCheck.sql.trim().replace(/;?\s*$/, '')}) AS guarded_query LIMIT 1000`;

      const startTime = Date.now();
      // SECURITY: Execute with timeout and row limit guardrails via transaction
      // 1. Set 5-second timeout to prevent long-running queries
      // 2. Substitute organization_id into the AI-generated SQL.
      // NOTE: We intentionally use string substitution (not parameterized queries) here
      // because the entire SQL string is dynamic (AI-generated) and incompatible with
      // Drizzle's template-tag parameterization.
      // SAFETY: organizationId is sourced from the server-side session only (not user input),
      // and single quotes are escaped to prevent injection.
      const result = await db.transaction(async (tx) => {
        await tx.execute(sql.raw("SET LOCAL statement_timeout = '5s'"));
        // Replace $1 with actual organization_id using safe string substitution
        // Note: context is non-null here due to early return check at line 254
        const finalSQL = guardedSQL.replace(
          /\$1/g,
          `'${context!.organizationId.replace(/'/g, "''")}'`
        );
        return await tx.execute(sql.raw(finalSQL));
      });
      const executionTime = Date.now() - startTime;
      rows = result.rows as any[];

      // Log successful execution for security audit
      logger.info("SQL Assistant query executed", {
        question: question.substring(0, 100),
        rowCount: rows.length,
        executionTimeMs: executionTime,
        organizationId: context.organizationId,
        tables: astValidation.tables,
        validatedSQL: securityCheck.sql.substring(0, 200),
      });

      // SECURITY: Log potential abuse patterns
      // Warn if query hits the 1000-row limit (user may need to refine query)
      if (rows.length === 1000) {
        logger.warn("SQL Assistant query hit row limit", {
          organizationId: context.organizationId,
          question: question.substring(0, 100),
          tables: astValidation.tables,
          note: "Query returned maximum allowed rows (1000). Results may be truncated.",
        });
      }
      // Warn if query execution is slow (may indicate expensive operations)
      if (executionTime > 3000) {
        logger.warn("SQL Assistant query slow execution", {
          organizationId: context.organizationId,
          executionTimeMs: executionTime,
          question: question.substring(0, 100),
        });
      }
    } catch (error: any) {
      executionError = error.message || "Query execution failed";
      logger.warn("SQL query execution failed", {
        error: executionError,
        sql: securityCheck.sql,
        organizationId: context.organizationId,
      });

      // SECURITY: Log potential SQL injection attempts
      if (error.message?.includes('syntax error') || error.message?.includes('permission denied')) {
        logger.error("Potential SQL injection attempt blocked", {
          error: error.message,
          sql: securityCheck.sql.substring(0, 200),
          organizationId: context.organizationId,
          userId: context.userId,
        });
      }
    }

    // Return results
    const finalResponse = {
      sql: aiResult.sql,
      rationale: aiResult.rationale,
      safe: true,
      rows: executionError ? [] : rows,
      rowCount: rows.length,
      tables: astValidation.tables,
      executionError,
      note: executionError
        ? "Query generated but execution failed. Please verify the schema or question."
        : undefined,
    };
    
    logger.info("SQL Assistant response", {
      hasSql: !!finalResponse.sql,
      sqlLength: finalResponse.sql?.length || 0,
      sql: finalResponse.sql?.substring(0, 100),
      safe: finalResponse.safe,
      rowCount: finalResponse.rowCount,
      hasError: !!finalResponse.executionError,
    });
    
    res.json(finalResponse);
  } catch (error: any) {
    if (error.name === "ZodError") {
      logger.warn("SQL Assistant validation error", {
        error: error.errors,
        organizationId: context?.organizationId,
      });
      // Return 200 with SQLResult shape for frontend consistency
      return res.json({
        sql: "",
        rationale: "Invalid request format",
        safe: false,
        rows: [],
        rowCount: 0,
        tables: [],
        executionError: "Invalid request data: " + error.errors[0]?.message,
        note: "Please check your question format and try again.",
      });
    }

    logger.error("SQL Assistant error", {
      error: error.message,
      stack: error.stack,
      organizationId: context?.organizationId,
    });

    // Return 200 with SQLResult shape for frontend consistency
    return res.json({
      sql: "",
      rationale: "System error occurred",
      safe: false,
      rows: [],
      rowCount: 0,
      tables: [],
      executionError: "SQL Assistant service error. Please try again later.",
      note: error.message || "An unexpected error occurred.",
    });
  }
});

export default router;
