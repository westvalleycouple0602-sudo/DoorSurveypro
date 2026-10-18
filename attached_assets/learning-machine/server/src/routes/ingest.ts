import { Router } from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { openings, captures } from '../../drizzle/schema.js';
import { publish } from '../natsBus.js';
import { eq } from 'drizzle-orm';

export const router = Router();

const Capture = z.object({
  kind: z.enum(['photo','video','lidar','barcode','note']),
  s3Url: z.string().url(),
  sha256: z.string().length(64),
  widthPx: z.number().int().optional(),
  heightPx: z.number().int().optional(),
  exif: z.any().optional(),
});

const SurveyPacket = z.object({
  projectId: z.string().uuid(),
  doorType: z.string(),
  locationLabel: z.string().optional(),
  floor: z.string().optional(),
  room: z.string().optional(),
  rawMetadata: z.record(z.any()).optional(),
  captures: z.array(Capture).min(1),
});

router.post('/ingest', async (req, res) => {
  try {
    const parsed = SurveyPacket.parse(req.body);
    const [open] = await db.insert(openings).values({
      projectId: parsed.projectId,
      doorType: parsed.doorType,
      locationLabel: parsed.locationLabel,
      floor: parsed.floor,
      room: parsed.room,
      rawMetadata: parsed.rawMetadata
    }).returning();

    await db.insert(captures).values(parsed.captures.map(c => ({
      openingId: open.id,
      kind: c.kind,
      s3Url: c.s3Url,
      sha256: c.sha256,
      widthPx: c.widthPx,
      heightPx: c.heightPx,
      exif: c.exif,
    })));

    await publish('survey.ingested', { openingId: open.id, projectId: parsed.projectId });
    res.status(201).json({ openingId: open.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
