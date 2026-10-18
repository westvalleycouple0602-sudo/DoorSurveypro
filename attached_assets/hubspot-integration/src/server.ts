import 'dotenv/config';
import express from 'express';

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => res.json({ ok: true }));

// TODO: mount HubSpot routes
// import { hubspotRouter } from './integrations/hubspot/router.js';
// app.use('/api/integrations/hubspot', hubspotRouter);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`[hubspot] server listening on :${port}`));
