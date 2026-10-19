# Door & Frame Code Validation Module (US & Canada, All Door Types)

This bundle provides:
- **validation_rules.json** — thresholds & code-derived requirements.
- **validate_scan.py** — FastAPI service exposing `/validate` to check a LiDAR/AR scan payload.
- **validateScan.ts** — portable TypeScript validator for client or server.
- **sample_payload.json** — quick example you can POST to the service.

Notes
- Values reflect widely adopted requirements (ADA/IBC/NFPA/ANSI for US; NBC/CSA/Provincial for Canada). Local amendments may differ.
- Tight tolerances (e.g., 1/8" gaps) are sensitive to sensor error. Configure `measurement_uncertainty_in` accordingly.
- Some items (door opening force, closer timing) are advisory-only; they require manual tools and are flagged as WARN/INFO.

## Run (FastAPI)
```bash
pip install fastapi uvicorn
uvicorn validate_scan:app --host 0.0.0.0 --port 8001
# then:
curl -X POST http://localhost:8001/validate -H "Content-Type: application/json" --data @sample_payload.json
```

## Use (TypeScript)
```ts
import { validate } from './validateScan';
const payload = require('./sample_payload.json');
const result = validate(payload);
console.log(result.summary, result.results.slice(0,5));
```

## Integrating with your AR/LiDAR app
- Measure **clear opening** from **door face to stop** at 90° (swing) or **between jambs** (sliding).
- Provide **gaps** on the pull side: top, latch, hinge, meeting stiles, bottom (to floor/threshold).
- Set `operation` and `has_breakout` for sliding/revolving/automatic doors.
- For Canada, set `config.ca_allow_legacy_800mm: true` if validating older 800 mm clear widths.
