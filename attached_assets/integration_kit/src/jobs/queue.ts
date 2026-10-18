import { Queue } from "bullmq";
import IORedis from "ioredis";

const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379");
export const syncQueue = new Queue("integration-syncs", { connection });

// Example
// await syncQueue.add("hubspotFullSync", { tenantId: "abc" });
