import type { DoorSurveyPayload, BuildingCodeStandard } from "@shared/types/doorSurvey";
import { logger } from "../logger";

export interface RetrievedDoc {
  id: string;
  text: string;
  sourceName: string;
  standard?: BuildingCodeStandard | "MANUFACTURER";
  sectionRef?: string;
}

/**
 * Build a natural-language query to send to the vector index
 * for a specific opening, emphasizing Div 08 & Div 28.
 */
export function buildRagQueryForOpening(payload: DoorSurveyPayload): string {
  const { project, opening } = payload;

  const standardsSet = new Set([...project.standards, ...opening.compliance.standardsChecked]);
  const standards = Array.from(standardsSet).join(", ");

  const isFireDoor = opening.doorLeaf.fireRatingMinutes > 0;

  const parts: string[] = [];

  parts.push(
    `${project.buildingType} building door opening with tag ${
      opening.doorTag
    } in room ${opening.spaceName}.`
  );

  parts.push(
    `Opening type: ${opening.openingType}, handing: ${opening.handing}.`
  );

  if (isFireDoor) {
    parts.push(
      `This is a fire-rated door (${opening.doorLeaf.fireRatingMinutes} minutes).`
    );
  }

  if (opening.hardware.lockFunction) {
    parts.push(`Lock function: ${opening.hardware.lockFunction}.`);
  }

  if (opening.hardware.exitDevice) {
    parts.push(`Exit device present: ${opening.hardware.exitDevice}.`);
  }

  const electronicSecurity = opening.hardware.electronicSecurity || [];
  const hasElectronic =
    electronicSecurity.length > 0 ||
    opening.hardware.electrifiedHardware.length > 0;

  if (hasElectronic) {
    const devTypes = electronicSecurity
      .map((d) => d.type)
      .join(", ");
    parts.push(
      `There are Division 28 electronic security devices: ${devTypes}.`
    );
  }

  parts.push(
    `We need requirements and best practices for standards: ${standards}, particularly Division 08 (Openings) and Division 28 (Electronic Safety and Security).`
  );

  return parts.join(" ");
}

/**
 * Check if RAG/vector search is available.
 * Currently stubbed - requires pgvector extension and embeddings API.
 */
function isRagAvailable(): boolean {
  // RAG requires:
  // 1. pgvector extension in database
  // 2. Embeddings API access (not available in Replit AI Integrations)
  // Feature-flagged until these are configured
  return false;
}

/**
 * Perform a pgvector similarity search with metadata filters
 * tuned for Div 08 / Div 28 + the project's buildingType.
 * 
 * Currently stubbed - returns empty array until pgvector and embeddings are configured.
 */
export async function searchRelevantDocsForOpening(
  payload: DoorSurveyPayload,
  opts?: { limit?: number }
): Promise<RetrievedDoc[]> {
  if (!isRagAvailable()) {
    logger.debug("RAG search disabled - pgvector/embeddings not configured");
    return [];
  }

  const limit = opts?.limit ?? 8;
  const query = buildRagQueryForOpening(payload);

  // TODO: Implement when pgvector and embeddings are available
  // 1. Embed query using text-embedding-3-small or similar
  // 2. Perform similarity search using <-> operator
  // 3. Filter by division and building type
  
  logger.info("RAG query built", { query, limit });
  
  return [];
}

/**
 * Embed text using OpenAI embeddings API.
 * Currently stubbed - not available in Replit AI Integrations.
 */
export async function embedText(text: string): Promise<number[]> {
  // NOTE: Embeddings API is NOT supported by Replit AI Integrations
  // This would require a separate OpenAI API key or alternative embedding service
  throw new Error("Embeddings API not available - requires separate configuration");
}
