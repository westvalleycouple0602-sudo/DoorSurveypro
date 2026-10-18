import { z } from "zod";

/**
 * Strict Zod schemas for RAG-Enhanced Compliance Validation
 * Provides type-safe validation from frontend forms → backend API → AI responses
 */

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const DOOR_TYPES = [
  "hinged-single",
  "hinged-double",
  "hinged-pair",
  "sliding-single",
  "sliding-double",
  "folding",
  "overhead",
  "revolving",
  "automatic",
  "pivot",
] as const;

export const FIRE_RATINGS = [
  "none",
  "20min",
  "45min",
  "60min",
  "90min",
  "3hr",
] as const;

export const LOCK_TYPES = [
  "standard",
  "panic-hardware",
  "exit-device",
  "electric-strike",
  "magnetic",
  "card-reader",
  "biometric",
  "keypad",
] as const;

export const THRESHOLD_TYPES = [
  "standard",
  "ada-compliant",
  "flush",
  "weatherstrip",
] as const;

export const HARDWARE_GRADES = [
  "Grade 1",
  "Grade 2", 
  "Grade 3",
] as const;

export const SEVERITY_LEVELS = [
  "critical",
  "warning",
  "info",
] as const;

export const CODE_TYPES = [
  "IBC",
  "ADA",
  "NFPA",
  "SDI",
  "BHMA",
  "FGI",
  "AAADM",
  "NEC",
  "SITE",
] as const;

export const CODE_CATEGORIES = [
  "egress",
  "fire",
  "accessibility",
  "hardware",
  "structural",
  "electrical",
] as const;

// ============================================================================
// OPENING SCHEMA (Request Input)
// ============================================================================

/**
 * Strict schema for door opening specifications
 * - Coerces numeric strings from forms to numbers
 * - Enforces enums for categorical fields
 * - Provides sensible defaults for optional fields
 */
export const openingSchema = z.object({
  // Identification (optional for new openings)
  id: z.string().optional(),
  
  // Door Type & Dimensions
  doorType: z.enum(DOOR_TYPES).default("hinged-single"),
  width: z.coerce.number().min(0).max(120).default(36), // inches
  clearWidth: z.coerce.number().min(0).max(120).default(32), // inches
  height: z.coerce.number().min(0).max(144).default(84), // inches
  
  // Fire Safety
  fireRating: z.enum(FIRE_RATINGS).default("none"),
  hardwareFireRating: z.enum(FIRE_RATINGS).default("none"),
  
  // Hardware Specifications
  hardwareGrade: z.enum(HARDWARE_GRADES).optional(),
  lockType: z.enum(LOCK_TYPES).default("standard"),
  threshold: z.enum(THRESHOLD_TYPES).default("standard"),
  closingForce: z.coerce.number().min(0).max(15).default(5), // lbf
  
  // Accessibility & Features
  isAccessible: z.boolean().default(false),
  hasAutomaticOperator: z.boolean().default(false),
  isExterior: z.boolean().default(false),
  
  // Occupancy & Usage
  occupancyLoad: z.coerce.number().min(0).default(0),
  buildingType: z.string().optional(),
  adaRequired: z.boolean().optional(),
  
  // Additional Context (optional)
  location: z.string().optional(),
  notes: z.string().optional(),
}).strict(); // Reject unknown fields

export type OpeningInput = z.infer<typeof openingSchema>;

// ============================================================================
// COMPLIANCE REQUEST SCHEMA
// ============================================================================

/**
 * Request schema for /api/compliance/check-with-citations
 */
export const complianceRequestSchema = z.object({
  opening: openingSchema,
  query: z.string().trim().max(500).optional(), // Optional natural language question
}).strict();

export type ComplianceRequest = z.infer<typeof complianceRequestSchema>;

// ============================================================================
// AI RESPONSE SCHEMA (LLM Output)
// ============================================================================

/**
 * Schema for AI-generated compliance assessment
 * Used to validate GPT-4o-mini structured JSON output
 */
const violationSchema = z.object({
  ruleId: z.string(), // e.g., "IBC-1010.1.1"
  severity: z.enum(SEVERITY_LEVELS),
  description: z.string(),
  citation: z.string(), // e.g., "IBC §1010.1.1 (2021)"
  recommendation: z.string(),
});

export const aiResponseSchema = z.object({
  summary: z.string().default(""),
  violations: z.array(violationSchema).default([]),
  compliantAreas: z.array(z.string()).default([]),
  missingInputs: z.array(z.string()).default([]),
  citations: z.array(z.string()).default([]), // Citation numbers used, e.g., ["[1]", "[2]"]
});

export type ComplianceAIResponse = z.infer<typeof aiResponseSchema>;
export type ComplianceViolation = z.infer<typeof violationSchema>;

// ============================================================================
// RAG SEARCH OPTIONS SCHEMA
// ============================================================================

/**
 * Schema for RAG vector search parameters
 * - Clamps limit to 1-50 range
 * - Clamps minSimilarity to 0-1 range
 * - Validates code types and categories against known values
 */
export const ragSearchOptionsSchema = z.object({
  limit: z.coerce.number().min(1).max(50).default(8),
  minSimilarity: z.coerce.number().min(0).max(1).default(0.6),
  codeTypes: z.array(z.enum(CODE_TYPES)).optional(),
  categories: z.array(z.enum(CODE_CATEGORIES)).optional(),
}).default({});

export type RagSearchOptions = z.infer<typeof ragSearchOptionsSchema>;

// ============================================================================
// RAG SEARCH RESULT SCHEMA (Database Output)
// ============================================================================

/**
 * Schema for RAG search results from vector database
 * Validates structure of code sections returned by searchCodeSections()
 */
export const codeSearchResultSchema = z.object({
  id: z.string(),
  chunk: z.string(),
  codeType: z.string(),
  section: z.string().nullable(),
  chapter: z.string().nullable(),
  page: z.number().nullable(),
  edition: z.string().nullable(),
  title: z.string().nullable(),
  category: z.string().nullable(),
  similarity: z.number().min(0).max(1),
});

export type CodeSearchResult = z.infer<typeof codeSearchResultSchema>;

// ============================================================================
// FULL RESPONSE SCHEMA (API Response)
// ============================================================================

/**
 * Complete response schema for /api/compliance/check-with-citations
 * Combines AI assessment + RAG results + metadata
 */
export const complianceResponseSchema = z.object({
  // AI Assessment
  summary: z.string().default(""),
  violations: z.array(violationSchema).default([]),
  compliantAreas: z.array(z.string()).default([]),
  missingInputs: z.array(z.string()).default([]),
  citations: z.array(z.string()).default([]),
  
  // RAG Results (truncated for response)
  ragResults: z.array(z.object({
    codeType: z.string(),
    section: z.string().nullable(),
    title: z.string().nullable(),
    chunk: z.string(), // Truncated to 300 chars
    similarity: z.number().min(0).max(1),
    page: z.number().nullable(),
  })).default([]),
  
  // Metadata
  timestamp: z.string(),
});

export type ComplianceResponse = z.infer<typeof complianceResponseSchema>;

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Safely parse AI response with fallback handling
 * Returns partial data on validation failure instead of throwing
 */
export function parseAIResponse(data: unknown): ComplianceAIResponse {
  const result = aiResponseSchema.safeParse(data);
  
  if (result.success) {
    return result.data;
  }
  
  // Fallback: Return empty structure with error noted
  console.error("AI response validation failed:", result.error);
  return {
    summary: "Validation response could not be fully parsed",
    violations: [],
    compliantAreas: [],
    missingInputs: ["Complete response parsing failed"],
    citations: [],
  };
}

/**
 * Validate and clamp RAG search options
 */
export function validateRagOptions(options: unknown): RagSearchOptions {
  return ragSearchOptionsSchema.parse(options);
}

/**
 * Coerce form input strings to opening schema
 * Useful for frontend form submissions where numeric fields come as strings
 */
export function coerceOpeningInput(input: unknown): OpeningInput {
  return openingSchema.parse(input);
}
