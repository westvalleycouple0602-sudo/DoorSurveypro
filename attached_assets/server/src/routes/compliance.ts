import { Router } from 'express';
import { z } from 'zod';
import { openai } from '../lib/openai.js';
import { searchRulesEmbedding } from '../lib/rag.js';

const router = Router();

const ComplianceSchema = z.object({
  opening: z.record(z.any()),
  // optionally include a natural language question or extra context
  notes: z.string().optional()
});

router.post('/', async (req, res) => {
  const parsed = ComplianceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  try {
    // TODO: embed opening context and fetch top K rule chunks with pgvector
    const retrieved: any[] = []; // await searchRulesEmbedding(embed(opening))
    const citations = retrieved.map((r) => `- ${r.section || ''} p.${r.page}: ${r.chunk}`).join('\n');

    const messages: any = [
      { role: 'system', content: [
        { type: 'text', text: 'You evaluate door openings against IBC/ADA/NFPA. Return JSON {summary, violations:[{rule_id, severity, excerpt, citation}], actions:[{step, rationale}]}. If uncertain, list missing inputs.' }
      ]},
      { role: 'user', content: [
        { type: 'text', text: 'Opening JSON:' },
        { type: 'text', text: JSON.stringify(parsed.data.opening) },
        { type: 'text', text: 'Cited context (may be empty):\n' + citations }
      ]}
    ];

    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' }
    });

    const json = resp.choices[0]?.message?.content ?? '{}';
    res.json(JSON.parse(json));
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'compliance error' });
  }
});

export default router;
