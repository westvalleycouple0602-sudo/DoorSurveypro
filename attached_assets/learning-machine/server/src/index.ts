import 'dotenv/config';
import express from 'express';
import { json } from 'express';
import { router as ingestRouter } from './routes/ingest.js';

const app = express();
app.use(json({ limit: '5mb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/', ingestRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`[server] listening on ${port}`));
