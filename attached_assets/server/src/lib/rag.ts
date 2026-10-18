// Minimal RAG helpers (stubs). Replace with your pg/pgvector implementation.
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function searchRulesEmbedding(queryEmbedding: number[], k: number = 8) {
  // Example: SELECT id, chunk, page, section FROM doc_chunks ORDER BY embedding <-> $1 LIMIT k;
  // Implement with pgvector and return top matches.
  return [];
}
