import assert from "node:assert/strict";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { eq } from "drizzle-orm";
import { db, pool } from "../db";
import { DualScanSessionStore, DualScanConflictError } from "../dual-scan-storage";
import { dualScanSessions, type DualScanSessionData } from "../../shared/schemas/dual-scans.schema";
import { readDualScanContent } from "../dual-scan-content";
import { objectStorageService } from "../objectStorage";
import type { DoorAnalysisResult, DoorDrawingSet } from "../../shared/cad-drawing-types";

after(async () => { await pool.end(); });

function fixture(): DualScanSessionData {
  return {
    id: `test_dss_${randomUUID()}`, organizationId: `test_org_${randomUUID()}`,
    projectId: `test_project_${randomUUID()}`, openingId: `test_opening_${randomUUID()}`,
    status: "pending-closed", createdAt: new Date(), updatedAt: new Date(),
  };
}

test("unfinished capture survives process restart and resumes without changing uploads", async () => {
  const store = new DualScanSessionStore(db);
  const session = fixture();
  const dir = await mkdtemp(path.join(tmpdir(), "dual-scan-test-"));
  const closedPath = path.join(dir, "closed.ply");
  const openPath = path.join(dir, "open.obj");
  try {
    await writeFile(closedPath, "closed capture fixture");
    await writeFile(openPath, "open capture fixture");
    await store.create(session);
    session.closedScanPath = closedPath;
    session.closedScanFormat = "ply";
    session.status = "closed-captured";
    await store.save(session, session.organizationId);
    const { stdout } = await promisify(execFile)(
      path.resolve("node_modules/.bin/tsx"),
      ["server/__tests__/fixtures/dual-scan-restart.ts", session.id, session.organizationId, openPath],
    );
    assert.match(stdout, /Resumed persisted scan/);
    const resumed = await new DualScanSessionStore(db).get(session.id, session.organizationId);
    assert.ok(resumed);
    assert.equal(resumed.status, "open-captured");
    assert.equal(resumed.projectId, session.projectId);
    assert.equal(resumed.openingId, session.openingId);
    assert.equal(resumed.closedScanPath, closedPath);
    assert.equal(resumed.openScanPath, openPath);
    assert.equal(resumed.openScanFormat, "obj");
    assert.equal(resumed.closedScanFormat, "ply");
    assert.ok(resumed.createdAt instanceof Date);
    assert.equal(await readFile(closedPath, "utf8"), "closed capture fixture");
  } finally {
    await db.delete(dualScanSessions).where(eq(dualScanSessions.id, session.id));
    await rm(dir, { recursive: true, force: true });
  }
});

test("organization-scoped reads and writes reject another tenant, even with a known ID", async () => {
  const store = new DualScanSessionStore(db);
  const session = fixture();
  try {
    await store.create(session);
    assert.equal(await store.get(session.id, "foreign-org"), undefined);
    assert.equal(await store.exists(session.id), true);
    assert.equal(await store.exists("nonexistent-session"), false);
    await assert.rejects(store.save(session, "foreign-org"), DualScanConflictError);
    await assert.rejects(store.save({
      ...session, organizationId: "foreign-org", status: "failed",
    }, "foreign-org"), DualScanConflictError);
    assert.equal((await store.get(session.id, session.organizationId))?.status, "pending-closed");
  } finally {
    await db.delete(dualScanSessions).where(eq(dualScanSessions.id, session.id));
  }
});

test("analysis, drawings and interrupted processing persist; retry and stale-write protection work", async () => {
  const store = new DualScanSessionStore(db);
  const session = fixture();
  try {
    await store.create(session);
    const stale = await store.get(session.id, session.organizationId);
    assert.ok(stale);
    session.closedScanPath = `/lidar-scans/${session.organizationId}/closed/file.ply`;
    session.openScanPath = `/lidar-scans/${session.organizationId}/open/file.json`;
    session.status = "processing";
    await store.save(session, session.organizationId);
    await assert.rejects(store.save(stale, session.organizationId), DualScanConflictError);
    const recovered = await new DualScanSessionStore(db).get(session.id, session.organizationId);
    assert.ok(recovered);
    assert.equal(recovered.status, "processing");
    assert.equal(recovered.closedScanPath, session.closedScanPath);
    recovered.status = "failed";
    await store.save(recovered, recovered.organizationId);
    recovered.status = "processing";
    await store.save(recovered, recovered.organizationId);
    recovered.analysisResult = { confidence: { overall: 0.9 } } as DoorAnalysisResult;
    recovered.drawingSet = {
      id: "drawing-set", generatedAt: new Date(), drawings: [
        { id: "drawing", type: "elevation", svgContent: "<svg>retained</svg>" },
      ],
    } as DoorDrawingSet;
    recovered.status = "completed";
    recovered.completedAt = new Date();
    await store.save(recovered, recovered.organizationId);
    const completed = await new DualScanSessionStore(db).get(session.id, session.organizationId);
    assert.ok(completed);
    assert.deepEqual(completed.analysisResult, recovered.analysisResult);
    assert.deepEqual(completed.drawingSet, recovered.drawingSet);
    assert.deepEqual(completed.completedAt, recovered.completedAt);
    assert.equal(completed.status, "completed");
  } finally {
    await db.delete(dualScanSessions).where(eq(dualScanSessions.id, session.id));
  }
});

test("object references are downloaded using the existing storage contract; missing captures fail", async () => {
  const original = objectStorageService.getLidarScanFile;
  const key = "/lidar-scans/test-org/test-scan/closed.ply";
  try {
    objectStorageService.getLidarScanFile = async storageKey => {
      assert.equal(storageKey, key);
      return { download: async () => [Buffer.from("stored cloud capture")] } as any;
    };
    assert.equal(await readDualScanContent(key), "stored cloud capture");
    objectStorageService.getLidarScanFile = async () => { throw new Error("Object not found"); };
    await assert.rejects(readDualScanContent(key), /Object not found/);
    await assert.rejects(readDualScanContent("/tmp/nonexistent-dual-scan-fixture.ply"), /ENOENT/);
  } finally {
    objectStorageService.getLidarScanFile = original;
  }
});
