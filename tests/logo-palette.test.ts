import assert from "node:assert/strict";
import test from "node:test";
import sharp from "sharp";
import { extractLogoPalette } from "../server/lib/logo-palette";
import { PgDialect, pgTable, text } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { insertUserIntegrationSchema } from "../shared/schema";

test("logo extraction retains a saturated color from a PNG", async () => {
  const png = await sharp({
    create: { width: 40, height: 20, channels: 4, background: "#ef2020" },
  }).png().toBuffer();
  const palette = await extractLogoPalette(png);
  const red = Object.values(palette).filter(s => s !== null)
    .some(s => s.rgb[0] > 180 && s.rgb[1] < 90 && s.rgb[2] < 90);
  assert.ok(red);
});

test("JPEG and WebP still decode through the replacement decoder", async () => {
  for (const format of ["jpeg", "webp"] as const) {
    const image = await sharp({
      create: { width: 20, height: 20, channels: 3, background: "#20d040" },
    }).toFormat(format).toBuffer();
    const palette = await extractLogoPalette(image);
    assert.ok(Object.values(palette).some(s => s !== null && s.rgb[1] > 120));
  }
});

test("transparent and white logos produce no saturated palette", async () => {
  for (const background of ["#ffffff", { r: 0, g: 0, b: 0, alpha: 0 }]) {
    const image = await sharp({
      create: { width: 20, height: 20, channels: 4, background },
    }).png().toBuffer();
    const palette = await extractLogoPalette(image);
    assert.equal(palette.Vibrant, null);
  }
});

test("malformed images fail explicitly", async () => {
  await assert.rejects(extractLogoPalette(Buffer.from("not an image")));
});

test("patched Drizzle escapes SQL identifiers containing quotes", () => {
  const table = pgTable('test"; DROP TABLE users; --', { id: text("id") });
  const query = new PgDialect().sqlToQuery(sql`select * from ${table}`);
  assert.equal(query.sql, 'select * from "test""; DROP TABLE users; --"');
});

test("Drizzle-Zod schemas still validate after the ORM upgrade", () => {
  assert.equal(insertUserIntegrationSchema.safeParse({}).success, false);
  assert.ok(insertUserIntegrationSchema.shape);
});
