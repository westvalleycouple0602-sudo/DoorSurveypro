import { Router } from 'express';

export const hubspotRouter = Router();

hubspotRouter.get('/auth/url', async (_req, res) => {
  res.json({ url: 'https://app.hubspot.com/oauth/authorize?...' });
});

hubspotRouter.post('/webhooks', (req, res) => {
  // verify signature → process events
  res.sendStatus(200);
});
