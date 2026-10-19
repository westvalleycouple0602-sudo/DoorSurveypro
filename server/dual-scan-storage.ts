import { and, eq } from "drizzle-orm";
import type { db } from "./db";
import { dualScanSessions, type DualScanSessionData } from "../shared/schemas/dual-scans.schema";

export class DualScanConflictError extends Error {
  constructor() {
    super("Scan session changed. Reload the session and retry.");
  }
}

function hydrate(row: typeof dualScanSessions.$inferSelect): DualScanSessionData {
  const data = row.data;
  return {
    ...data,
    id: row.id,
    organizationId: row.organizationId,
    projectId: row.projectId,
    openingId: row.openingId,
    revision: row.revision,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    completedAt: data.completedAt ? new Date(data.completedAt) : undefined,
    drawingSet: data.drawingSet ? {
      ...data.drawingSet, generatedAt: new Date(data.drawingSet.generatedAt),
    } : undefined,
  };
}

export class DualScanSessionStore {
  constructor(private database: typeof db) {}

  async create(session: DualScanSessionData): Promise<void> {
    await this.database.insert(dualScanSessions).values({
      id: session.id, organizationId: session.organizationId,
      projectId: session.projectId, openingId: session.openingId,
      data: session, createdAt: session.createdAt, updatedAt: session.updatedAt,
    });
    session.revision = 0;
  }

  async get(id: string, organizationId: string): Promise<DualScanSessionData | undefined> {
    const [row] = await this.database.select().from(dualScanSessions).where(and(
      eq(dualScanSessions.id, id), eq(dualScanSessions.organizationId, organizationId),
    ));
    return row ? hydrate(row) : undefined;
  }

  // Only reveals existence, to preserve the API's existing 403/404 distinction.
  async exists(id: string): Promise<boolean> {
    const rows = await this.database.select({ id: dualScanSessions.id })
      .from(dualScanSessions).where(eq(dualScanSessions.id, id));
    return rows.length > 0;
  }

  async save(session: DualScanSessionData, organizationId: string): Promise<void> {
    if (session.organizationId !== organizationId) throw new DualScanConflictError();
    const revision = session.revision ?? 0;
    const rows = await this.database.update(dualScanSessions).set({
      data: session, updatedAt: session.updatedAt, revision: revision + 1,
    }).where(and(
      eq(dualScanSessions.id, session.id),
      eq(dualScanSessions.organizationId, organizationId),
      eq(dualScanSessions.revision, revision),
    )).returning({ id: dualScanSessions.id });
    if (!rows.length) throw new DualScanConflictError();
    session.revision = revision + 1;
  }
}
