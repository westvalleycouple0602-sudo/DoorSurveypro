import { Router } from 'express';
import { z } from 'zod';
import { openai } from '../lib/openai.js';
import { isDangerousSQL } from '../lib/guardrails.js';
import { Pool } from 'pg';

const router = Router();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SchemaSnapshot = `-- TODO: Replace with real whitelisted schema
TABLE openings(id uuid, floor int, fire_rating text, has_closer boolean, area text);
TABLE projects(id uuid, name text);
`;

const AskSchema = z.object({ question: z.string().min(1) });

router.post('/', async (req, res) => {
  const parsed = AskSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error });

  try {
    const messages: any = [
      { role: 'system', content: [
        { type: 'text', text: 'You output ONLY JSON {sql, params, rationale, safe}. Use parameterized SQL for PostgreSQL based strictly on the provided schema. Read-only queries only.' }
      ]},
      { role: 'user', content: [
        { type: 'text', text: 'Schema:\n' + SchemaSnapshot + '\nQuestion: ' + parsed.data.question }
      ]}
    ];

    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      response_format: { type: 'json_object' }
    });

    const out = JSON.parse(resp.choices[0]?.message?.content ?? '{"safe":false}');
    if (!out.safe || isDangerousSQL(out.sql || '')) {
      return res.status(400).json({ error: 'unsafe sql', out });
    }

    // Execute with read-only transaction role in production
    let rows: any[] = [];
    try {
      const result = await pool.query(out.sql, out.params || []);
      rows = result.rows;
    } catch (_e) {
      // On error, return the SQL plan without executing
      return res.status(200).json({ ...out, rows: [], note: 'SQL not executed (verify schema).'});
    }

    res.json({ ...out, rows });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'sql assistant error' });
  }
});

export default router;
