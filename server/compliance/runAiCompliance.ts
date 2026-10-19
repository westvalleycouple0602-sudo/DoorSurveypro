import OpenAI from "openai";
import { buildAiCompliancePrompt, type AiComplianceResponse, type RetrievedDoc } from "./aiCompliancePrompt";
import { evaluateCompliance } from "./complianceRules";
import type { DoorSurveyPayload, ComplianceResult, ComplianceIssue } from "@shared/types/doorSurvey";
import { logger } from "../logger";

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const AI_MODEL = "gpt-5.1-mini";
const AI_TIMEOUT_MS = 15000;
const MAX_RETRIEVED_DOCS = 8;
const MAX_DOC_TEXT_LENGTH = 2000;

// Check if AI integration is available
function isAiAvailable(): boolean {
  return !!(
    process.env.AI_INTEGRATIONS_OPENAI_BASE_URL &&
    process.env.AI_INTEGRATIONS_OPENAI_API_KEY
  );
}

// Create OpenAI client lazily
function getOpenAIClient(): OpenAI | null {
  if (!isAiAvailable()) {
    return null;
  }
  return new OpenAI({
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  });
}

export interface HybridComplianceResult {
  summary: string;
  compliance: ComplianceResult;
  aiIssues: AiComplianceResponse["issues"];
  aiEnabled: boolean;
}

function sanitizeDocs(docs: RetrievedDoc[]): RetrievedDoc[] {
  return docs.slice(0, MAX_RETRIEVED_DOCS).map((doc) => ({
    ...doc,
    text: doc.text.length > MAX_DOC_TEXT_LENGTH 
      ? doc.text.slice(0, MAX_DOC_TEXT_LENGTH) + "..." 
      : doc.text,
  }));
}

async function callAiWithTimeout(
  client: OpenAI,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const completion = await client.chat.completions.create(
      {
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
        max_completion_tokens: 4096,
      },
      { signal: controller.signal }
    );

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      throw new Error("Empty response from AI");
    }
    return raw;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function runHybridCompliance(
  payload: DoorSurveyPayload,
  retrievedDocs: RetrievedDoc[] = []
): Promise<HybridComplianceResult> {
  // 1. Deterministic rule engine (always runs)
  const ruleResult = evaluateCompliance(payload);

  // 2. Check if AI is available
  const client = getOpenAIClient();
  if (!client) {
    logger.info("AI compliance disabled - no OpenAI integration configured");
    return {
      summary: "Compliance check completed using deterministic rules only. AI analysis not available.",
      compliance: ruleResult,
      aiIssues: [],
      aiEnabled: false,
    };
  }

  // 3. AI layer with timeout and guardrails
  try {
    const sanitizedDocs = sanitizeDocs(retrievedDocs);
    const { systemPrompt, userPrompt } = buildAiCompliancePrompt(payload, sanitizedDocs);

    const raw = await callAiWithTimeout(client, systemPrompt, userPrompt);

    let aiResult: AiComplianceResponse;
    try {
      aiResult = JSON.parse(raw) as AiComplianceResponse;
    } catch (parseError) {
      logger.error("Failed to parse AI compliance response", { raw, error: parseError });
      throw new Error("Invalid JSON response from AI");
    }

    // Validate aiResult structure
    if (!aiResult.summary || !Array.isArray(aiResult.issues)) {
      logger.error("Invalid AI response structure", { aiResult });
      throw new Error("Invalid AI response structure");
    }

    // 4. Merge AI issues into deterministic issues
    const mergedIssues: ComplianceIssue[] = [
      ...ruleResult.issues,
      ...aiResult.issues.map((issue) => ({
        standard: issue.standard,
        codeRef: issue.codeRef,
        severity: issue.severity,
        message: issue.message,
      })),
    ];

    const passes = mergedIssues.every((i) => i.severity !== "critical");

    return {
      summary: aiResult.summary,
      compliance: {
        ...ruleResult,
        passes,
        issues: mergedIssues,
      },
      aiIssues: aiResult.issues,
      aiEnabled: true,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    const isTimeout = errorMessage.includes("abort") || errorMessage.includes("timeout");
    
    logger.error("AI compliance check failed, falling back to deterministic rules", { 
      error: errorMessage,
      isTimeout,
    });
    
    return {
      summary: isTimeout 
        ? "Compliance check completed using deterministic rules only. AI analysis timed out."
        : "Compliance check completed using deterministic rules only. AI analysis encountered an error.",
      compliance: ruleResult,
      aiIssues: [],
      aiEnabled: false,
    };
  }
}

export { evaluateCompliance } from "./complianceRules";
export type { RetrievedDoc } from "./aiCompliancePrompt";
