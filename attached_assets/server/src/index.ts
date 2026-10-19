import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pino from 'pino';
import rateLimit from 'rate-limiter-flexible';
import visionRouter from './routes/vision.js';
import complianceRouter from './routes/compliance.js';
import sqlAssistantRouter from './routes/sqlAssistant.js';

const app = express();
const logger = pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' });

app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Basic request logger
app.use((req, _res, next) => { logger.info({ path: req.path, method: req.method }, 'req'); next(); });

app.use('/ai/vision-identify', visionRouter);
app.use('/ai/compliance-check', complianceRouter);
app.use('/ai/sql-assistant', sqlAssistantRouter);

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
app.listen(port, () => logger.info(`API listening on http://localhost:${port}`));
