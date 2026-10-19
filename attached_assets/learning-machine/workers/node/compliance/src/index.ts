import 'dotenv/config';
import { connect, StringCodec } from 'nats';
import pkg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';

const sc = StringCodec();
const { Pool } = pkg;

// Simple demo rule: ADA 404.2.3 clear width >= 32 in (812.8 mm). We'll require >= 813 mm.
const CLEAR_WIDTH_MIN_MM = 813;

async function main(){
  const nc = await connect({ servers: process.env.NATS_URL });
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool);

  const sub = nc.subscribe('survey.ingested');
  console.log('[compliance] listening on survey.ingested');

  for await (const m of sub){
    try {
      const msg = JSON.parse(sc.decode(m.data));
      const { openingId } = msg;

      // Insert a placeholder feature row if none exists (demo only)
      await db.execute(`
        INSERT INTO features_opening_latest (opening_id, clear_width_mm, last_computed_at)
        VALUES ($1, 800, NOW())
        ON CONFLICT (opening_id) DO NOTHING
      `, [openingId]);

      // Fetch feature value
      const res = await db.execute(`SELECT clear_width_mm FROM features_opening_latest WHERE opening_id=$1`, [openingId]);
      const clearWidth = res.rows?.[0]?.clear_width_mm ? Number(res.rows[0].clear_width_mm) : null;

      if (clearWidth !== null && clearWidth < CLEAR_WIDTH_MIN_MM){
        // Create a violation row
        await db.execute(`
          INSERT INTO violations (opening_id, rule_id, severity, message, created_at)
          VALUES ($1, 'ADA-404.2.3', 'major', 'Clear width below 32 in (813 mm) minimum', NOW())
        `, [openingId]);
        console.log('[compliance] violation created for opening', openingId);
      } else {
        console.log('[compliance] no violation; clearWidth Mm =', clearWidth);
      }
    } catch (e:any) {
      console.error('[compliance] error', e.message);
    }
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
