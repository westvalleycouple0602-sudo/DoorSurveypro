import 'dotenv/config';
import { connect, StringCodec } from 'nats';
import pkg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const sc = StringCodec();
const { Pool } = pkg;

async function main(){
  const nc = await connect({ servers: process.env.NATS_URL });
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const sub = nc.subscribe('survey.ingested');
  console.log('[enricher] listening on survey.ingested');

  for await (const m of sub){
    try {
      const msg = JSON.parse(sc.decode(m.data));
      console.log('[enricher] received', msg);

      // Placeholder: compute thumbnails / OCR / embeddings
      // Here we simply log and could write a derived artifact row or update a timestamp.
      // Extend this with your real enrichment logic.
    } catch (e:any) {
      console.error('[enricher] error', e.message);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
