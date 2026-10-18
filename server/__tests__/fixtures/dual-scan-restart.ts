import assert from "node:assert/strict";
import { db, pool } from "../../db";
import { DualScanSessionStore } from "../../dual-scan-storage";
import { readDualScanContent } from "../../dual-scan-content";

// Executed in a separate OS process; no parent memory or connection is reused.
async function resume() {
try {
  const [id, organizationId, openPath] = process.argv.slice(2);
  const store = new DualScanSessionStore(db);
  const session = await store.get(id, organizationId);
  assert.ok(session);
  assert.equal(session.status, "closed-captured");
  assert.ok(session.closedScanPath);
  assert.equal(await readDualScanContent(session.closedScanPath), "closed capture fixture");
  session.openScanPath = openPath;
  session.openScanFormat = "obj";
  session.status = "open-captured";
  session.updatedAt = new Date();
  await store.save(session, organizationId);
  assert.equal(await readDualScanContent(openPath), "open capture fixture");
  assert.equal(await store.get(id, "another-organization"), undefined);
  console.log("Resumed persisted scan in a fresh process");
} finally {
  await pool.end();
}
}

resume().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
