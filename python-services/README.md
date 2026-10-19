# Backend


---

## Fast LiDAR Processing
- `POST /processLidarFast/<scan_id>` → **bounded-time** pipeline:
  - Aggressive voxel downsample (10 mm), optional cap at 150k points
  - Quick AABB estimate for width/height/depth
  - Short RANSAC (≤ 8 s) to refine jamb distance if planes exist
- Returns elapsed time and step logs in `stats`.


---

## Unified LiDAR Processing + Progress
- `POST /processLidar/<scan_id>`
  - Header **`X-Mode: fast`** or **`X-Mode: full`** (or `?mode=fast|full`)
  - Writes step logs to `/storage/progress/<scan_id>.log`
- `GET /progress/<scan_id>` → returns live log lines for UI spinners.


---

## Web Progress UI
- **Route:** `GET /public/process.html`
- Start async processing (`fast` or `full`) and watch progress in real time.
- Uses `POST /processLidarAsync/<scan_id>` to kick off, then polls:
  - `GET /progress/<scan_id>` for live logs
  - `GET /results/<scan_id>` for updated output
