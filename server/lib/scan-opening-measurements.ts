import { z } from 'zod';
import type { UpdateDoorOpening } from '@shared/schema';

const measurements = z.object({
  width: z.number().finite().positive(),
  height: z.number().finite().positive(),
  frameDepth: z.number().finite().nonnegative().nullable().optional(),
  units: z.literal('mm').default('mm'),
});

export function scanOpeningMeasurements(input: unknown): UpdateDoorOpening {
  const metrics = measurements.parse(input);
  return {
    clearWidth: metrics.width,
    clearHeight: metrics.height,
    ...(metrics.frameDepth ? { frameDepth: String(metrics.frameDepth / 25.4) } : {}),
  };
}
