/**
 * Code Embeddings Ingestion Script
 * Populates the code_embeddings table from existing compliance rules
 * Run with: npx tsx server/scripts/ingest-code-embeddings.ts
 */

import { db } from "../db";
import { complianceRules } from "@shared/schema";
import { batchStoreCodeEmbeddings } from "../rag-service";
import { logger } from "../logger";
import { sql } from "drizzle-orm";

async function ingestComplianceRules() {
  logger.info("Starting compliance rules ingestion...");

  try {
    // Fetch all active compliance rules
    const rules = await db
      .select()
      .from(complianceRules)
      .where(sql`active = 'yes'`);

    logger.info(`Found ${rules.length} active compliance rules to process`);

    // Transform rules into embeddable chunks
    const sections = rules.map(rule => {
      // Create rich text chunk combining title and description
      const chunk = `${rule.title}\n\n${rule.description}\n\nCode: ${rule.code}\nSeverity: ${rule.severity}`;

      // Extract code type from code prefix (e.g., "IBC-1010.1.1" -> "IBC")
      const codeType = rule.code.split("-")[0] || "UNKNOWN";

      // Map codeType to category
      const categoryMap: Record<string, string> = {
        IBC: "building_code",
        NFPA: "fire_code",
        ADA: "accessibility",
        ANSI: "manufacturing_standard",
      };

      return {
        chunk,
        codeType,
        section: rule.code,
        title: rule.title,
        category: categoryMap[codeType] || rule.codeType,
        edition: "2021", // Default edition
      };
    });

    // Batch store embeddings
    logger.info(`Processing ${sections.length} sections...`);
    const result = await batchStoreCodeEmbeddings(sections);

    logger.info("Ingestion completed!", {
      total: sections.length,
      success: result.success,
      failed: result.failed,
    });

    if (result.failed > 0) {
      logger.warn(`${result.failed} sections failed to process`);
    }

    process.exit(0);
  } catch (error) {
    logger.error("Ingestion failed", { error });
    process.exit(1);
  }
}

// Run ingestion
ingestComplianceRules();
