import { Router } from 'express';
import { z } from 'zod';
import { openai } from '../lib/openai.js';

const router = Router();

const VisionSchema = z.object({
  images: z.array(z.string()).min(1, 'at least one image is required'), // urls or data URLs
  openingId: z.string().optional()
});

router.post('/', async (req, res) => {
  const parsed = VisionSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  try {
    const imgs = parsed.data.images.map((u) => ({ type: 'input_image', image_url: u }));
    const messages: any = [
      { role: 'system', content: [
        { type: 'text', text: 'You are a door & hardware expert. Return STRICT JSON only with keys: door_type, material, handedness, fire_rating_label:{present, rating, standard}, hardware_present:[hinges, closer, exit_device, lock, strike, threshold, astragal], notes. Use null if unknown.' }
      ]},
      { role: 'user', content: imgs }
    ];

    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' }
    });

    const json = resp.choices[0]?.message?.content ?? '{}';
    res.json(JSON.parse(json));
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'vision error' });
  }
});

export default router;
