/**
 * Database Configuration and Connection Pooling
 * 
 * This module configures PostgreSQL connection pooling for optimal performance
 * in both development and production environments.
 */

import { drizzle } from "drizzle-orm/neon-serverless";
import { Pool, neonConfig } from "@neondatabase/serverless";
import * as schema from "../../shared/schema";
import { logger } from "../logger";

// Configure Neon for WebSocket connections
neonConfig.fetchConnectionCache = true;

// Connection pool configuration
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  
  // Connection pool settings (optimized for serverless)
  max: process.env.NODE_ENV === "production" ? 20 : 5, // Max connections in pool
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Timeout after 10 seconds if no connection available
  
  // Statement timeout (prevent long-running queries)
  statement_timeout: 30000, // 30 seconds
  
  // Query timeout (prevent hung queries)
  query_timeout: 30000, // 30 seconds
};

// Create connection pool
const pool = new Pool(poolConfig);

// Pool error handling
pool.on("error", (err) => {
  logger.error("Unexpected database pool error", { error: err.message, stack: err.stack });
});

pool.on("connect", () => {
  logger.debug("New database connection established");
});

pool.on("remove", () => {
  logger.debug("Database connection removed from pool");
});

// Create Drizzle database instance with schema
export const db = drizzle(pool, { schema, logger: false });

// Export pool for direct access if needed
export { pool };

/**
 * Get pool statistics for monitoring
 */
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}

/**
 * Gracefully close database connections
 */
export async function closeDatabase() {
  try {
    await pool.end();
    logger.info("Database connections closed");
  } catch (error) {
    logger.error("Error closing database connections", { error });
    throw error;
  }
}

/**
 * Test database connection
 */
export async function testConnection(): Promise<boolean> {
  try {
    const result = await pool.query("SELECT NOW() as now");
    logger.info("Database connection test successful", { timestamp: result.rows[0].now });
    return true;
  } catch (error) {
    logger.error("Database connection test failed", { error });
    return false;
  }
}

// Log pool configuration on startup
if (process.env.NODE_ENV === "production") {
  logger.info("Database pool configured", {
    maxConnections: poolConfig.max,
    idleTimeout: poolConfig.idleTimeoutMillis,
    connectionTimeout: poolConfig.connectionTimeoutMillis,
  });
}
