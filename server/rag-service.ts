import OpenAI from "openai";
import { db } from "./db";
import { codeEmbeddings } from "@shared/schema";
import { logger } from "./logger";
import { sql } from "drizzle-orm";
import {
  ragSearchOptionsSchema,
  codeSearchResultSchema,
  type RagSearchOptions,
  type CodeSearchResult as SchemaCodeSearchResult,
} from "@shared/schemas/compliance.schema";

/**
 * RAG Service for Code Compliance
 * Handles embedding generation, storage, and semantic search for building codes (IBC/ADA/NFPA)
 */

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

// Generate embeddings using OpenAI text-embedding-3-small (with 15s timeout)
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    // Add timeout guard for OpenAI API call
    const response = await Promise.race([
      getOpenAI().embeddings.create({
        model: "text-embedding-3-small",
        input: text,
        encoding_format: "float",
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Embedding generation timeout after 15s")), 15000)
      ),
    ]);

    return response.data[0].embedding;
  } catch (error) {
    logger.error("Failed to generate embedding", { error, textLength: text.length });
    throw new Error("Embedding generation failed");
  }
}

// Store code section with embedding
export async function storeCodeEmbedding(params: {
  chunk: string;
  codeType: string; // IBC, ADA, NFPA, etc.
  section?: string;
  chapter?: string;
  page?: number;
  edition?: string;
  title?: string;
  category?: string; // egress, fire, accessibility, etc.
}): Promise<string> {
  try {
    const embedding = await generateEmbedding(params.chunk);

    const [inserted] = await db.insert(codeEmbeddings).values({
      chunk: params.chunk,
      embedding: embedding, // Pass array directly - pgvector handles conversion
      codeType: params.codeType,
      section: params.section,
      chapter: params.chapter,
      page: params.page,
      edition: params.edition,
      title: params.title,
      category: params.category,
    }).returning({ id: codeEmbeddings.id });

    logger.info("Stored code embedding", { 
      id: inserted.id, 
      codeType: params.codeType, 
      section: params.section 
    });

    return inserted.id;
  } catch (error) {
    logger.error("Failed to store code embedding", { error, params });
    throw new Error("Failed to store embedding");
  }
}

export interface CodeSearchResult {
  id: string;
  chunk: string;
  codeType: string;
  section: string | null;
  chapter: string | null;
  page: number | null;
  edition: string | null;
  title: string | null;
  category: string | null;
  similarity: number; // Cosine similarity score (0-1)
}

// Semantic search for relevant code sections
export async function searchCodeSections(
  query: string,
  options: Partial<RagSearchOptions> = {}
): Promise<CodeSearchResult[]> {
  try {
    // VALIDATE & CLAMP OPTIONS: Use schema to ensure safe values
    const validatedOptions = ragSearchOptionsSchema.parse(options);
    const { limit, codeTypes, categories, minSimilarity } = validatedOptions;

    // Generate embedding for search query
    const queryEmbedding = await generateEmbedding(query);

    // Build SQL query with filters
    let sqlQuery = sql`
      SELECT 
        id,
        chunk,
        code_type,
        section,
        chapter,
        page,
        edition,
        title,
        category,
        1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) AS similarity
      FROM code_embeddings
      WHERE 1 = 1
    `;

    // Add code type filter
    if (codeTypes && codeTypes.length > 0) {
      sqlQuery = sql`${sqlQuery} AND code_type = ANY(${codeTypes}::text[])`;
    }

    // Add category filter
    if (categories && categories.length > 0) {
      sqlQuery = sql`${sqlQuery} AND category = ANY(${categories}::text[])`;
    }

    // Add similarity threshold
    sqlQuery = sql`${sqlQuery} 
      AND (1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector)) >= ${minSimilarity}
      ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
      LIMIT ${limit}
    `;

    const results = await db.execute(sqlQuery);

    logger.info("Code search completed", {
      query: query.substring(0, 100),
      resultsCount: results.rows.length,
      filters: { codeTypes, categories, minSimilarity }
    });

    // DEFENSIVE VALIDATION: Validate DB results to prevent runtime errors
    const validatedResults: CodeSearchResult[] = [];
    for (const row of results.rows) {
      try {
        const validated = codeSearchResultSchema.parse({
          id: row.id,
          chunk: row.chunk,
          codeType: row.code_type,
          section: row.section,
          chapter: row.chapter,
          page: row.page,
          edition: row.edition,
          title: row.title,
          category: row.category,
          similarity: parseFloat(row.similarity as string),
        });
        validatedResults.push(validated);
      } catch (validationError) {
        logger.warn("Invalid code search result from DB, skipping", {
          row: { id: row.id, codeType: row.code_type },
          error: validationError,
        });
      }
    }

    return validatedResults;
  } catch (error) {
    logger.error("Code search failed", { error, query });
    throw new Error("Code search failed");
  }
}

// Batch store multiple code sections
export async function batchStoreCodeEmbeddings(
  sections: Array<{
    chunk: string;
    codeType: string;
    section?: string;
    chapter?: string;
    page?: number;
    edition?: string;
    title?: string;
    category?: string;
  }>
): Promise<{ success: number; failed: number; }> {
  let success = 0;
  let failed = 0;

  for (const section of sections) {
    try {
      await storeCodeEmbedding(section);
      success++;
    } catch (error) {
      failed++;
      logger.error("Failed to store section in batch", { section, error });
    }
  }

  logger.info("Batch embedding storage completed", { success, failed, total: sections.length });
  return { success, failed };
}

// Format search results as citations for AI prompts
export function formatCitations(results: CodeSearchResult[]): string {
  return results
    .map((r, idx) => {
      const citation = [
        `[${idx + 1}]`,
        r.codeType,
        r.section ? `§${r.section}` : null,
        r.title,
        r.page ? `(p.${r.page})` : null,
      ]
        .filter(Boolean)
        .join(" ");

      return `${citation}\n${r.chunk}\nRelevance: ${(r.similarity * 100).toFixed(1)}%\n`;
    })
    .join("\n");
}
