# Python LiDAR Service Integration

## Overview
This Python Flask service provides advanced LiDAR point cloud processing using Open3D for more accurate door/frame measurements. It supplements the existing TypeScript processor with sophisticated plane segmentation using RANSAC algorithms.

## Features

### Fast Mode (Bounded-Time Processing)
- Processing time: ~8 seconds
- Aggressive voxel downsampling (10mm)
- Quick AABB estimation
- Bounded RANSAC for jamb detection
- Ideal for quick field measurements

### Full Mode (Comprehensive Processing)
- Processing time: up to 25 seconds
- Higher resolution voxel downsampling (5mm)
- Normal estimation
- Extended plane segmentation
- More accurate jamb, floor, and header detection
- Higher confidence scores

## Architecture

### Python Service (Port 8080)
- **Flask** web server
- **Open3D** for point cloud processing
- **Trimesh** as fallback
- **NumPy** for numerical operations

### Express Proxy Routes (Port 5000)
- `POST /api/lidar/scans/:id/process-advanced` - Trigger advanced processing
- `GET /api/lidar/scans/:id/progress` - Get live processing progress

## Installation

### Prerequisites
- Python 3.11 (installed via Replit)
- Node.js/Express backend (existing)

### Python Dependencies
Already installed via packager_tool:
- Flask==3.1.2
- numpy==2.3.4
- open3d==0.19.0
- trimesh==4.9.0
- werkzeug==3.1.3

## Running the Service

### Manual Start
```bash
cd python-services
python lidar_service.py
```

The service will start on port 8080 (configurable via PORT environment variable).

### Environment Variables
- `PORT` - Service port (default: 8080)
- `PYTHON_SERVICE_URL` - URL for Express to reach Python service (default: http://localhost:8080)

## API Endpoints

### Python Service Direct Endpoints

#### Health Check
```
GET /health
```
Returns: `{"ok": true}`

#### Upload Scan
```
POST /uploadScan
Headers:
  X-Scan-Type: ios_lidar
  X-File-Ext: ply|obj|json
Body: Binary file data
```
Returns: Scan metadata with `scan_id`

#### Process LiDAR (Unified)
```
POST /processLidar/<scan_id>
Headers:
  X-Mode: fast|full
Query: ?mode=fast|full
```
Returns: Processing results with metrics

#### Fast Processing
```
POST /processLidarFast/<scan_id>
```
Returns: Fast-mode metrics (~8s processing)

#### Get Progress
```
GET /progress/<scan_id>
```
Returns: Live log lines for real-time progress

#### Get Results
```
GET /results/<scan_id>
```
Returns: Scan metadata and results

### Express Proxy Endpoints

#### Advanced Processing (Recommended)
```
POST /api/lidar/scans/:id/process-advanced
Query: ?mode=fast|full
Body: { "mode": "fast"|"full" }
```
- Authenticates user
- Verifies scan ownership
- Uploads to Python service
- Processes with Open3D
- Updates database with results
- Triggers compliance validation

#### Get Progress
```
GET /api/lidar/scans/:id/progress
Query: ?pythonScanId=<id>
```
Returns live processing progress logs.

## Processing Pipeline

### 1. Client Upload
Client uploads PLY/OBJ/JSON file to Express → stored in uploads directory

### 2. Standard Processing
```
POST /api/lidar/scans/:id/process
```
Uses TypeScript processor (fast, basic geometry)

### 3. Advanced Processing
```
POST /api/lidar/scans/:id/process-advanced?mode=fast
```
1. Express reads file from storage
2. Uploads binary data to Python service
3. Python service processes with Open3D:
   - Read point cloud
   - Downsample (voxel size based on mode)
   - Estimate normals (full mode only)
   - RANSAC plane segmentation
   - Identify jamb pairs (parallel vertical planes)
   - Identify floor/header (horizontal planes)
   - Calculate width from jamb distance
   - Calculate height from floor/header distance
   - Extract frame depth from remaining extent
4. Returns metrics to Express
5. Express updates database and opening measurements
6. Triggers automatic compliance validation

## Storage

### Python Service Storage
- Location: `python-services/storage/`
- Files: `results.json`, uploaded scans, progress logs
- Created automatically on first run

### Express Storage
- Location: `uploads/lidar-scans/`
- Original uploaded files
- Referenced by database records

## Testing

### Test Python Service Directly
```bash
# Health check
curl http://localhost:8080/health

# Upload test scan
curl -X POST http://localhost:8080/uploadScan \
  -H "X-Scan-Type: ios_lidar" \
  -H "X-File-Ext: ply" \
  --data-binary @test.ply

# Process (returns scan_id from upload)
curl -X POST http://localhost:8080/processLidar/<scan_id>?mode=fast

# Check progress
curl http://localhost:8080/progress/<scan_id>

# Get results
curl http://localhost:8080/results/<scan_id>
```

### Test via Express Proxy
```bash
# Upload scan via UI first, get scan ID

# Trigger advanced processing
curl -X POST http://localhost:5000/api/lidar/scans/<db_scan_id>/process-advanced?mode=fast \
  -H "Cookie: <your-session-cookie>"

# Check progress
curl http://localhost:5000/api/lidar/scans/<db_scan_id>/progress
```

## Comparison: TypeScript vs Python Processing

| Feature | TypeScript Processor | Python Processor (Fast) | Python Processor (Full) |
|---------|---------------------|------------------------|-------------------------|
| Processing Time | ~1s | ~8s | ~25s |
| Plane Detection | Basic AABB | RANSAC (bounded) | RANSAC (extended) |
| Normal Estimation | No | No | Yes |
| Jamb Detection | Geometry-based | Parallel plane pairs | Parallel plane pairs |
| Floor/Header | Simple projection | Horizontal planes | Horizontal planes |
| Accuracy | Good | Better | Best |
| Use Case | Quick preview | Field use | Final measurements |

## Troubleshooting

### Python Service Won't Start
- Check Python 3.11 is installed: `python --version`
- Verify dependencies: `pip list | grep -E "Flask|open3d|trimesh"`
- Check port 8080 is available: `lsof -i :8080`

### Processing Fails
- Check logs in `python-services/storage/progress/<scan_id>.log`
- Verify scan file format (PLY, OBJ, or JSON)
- Ensure sufficient point density (min ~2000 points)
- Check for corrupt or empty point clouds

### Proxy Connection Errors
- Ensure Python service is running on port 8080
- Check `PYTHON_SERVICE_URL` environment variable
- Verify network connectivity between services

### Inaccurate Results
- Try full mode instead of fast mode
- Check point cloud quality and density
- Verify scan captures entire door frame
- Look for occlusions or missing data

## Future Enhancements

- Async processing with progress streaming
- Web UI for standalone processing (`/public/process.html`)
- Multi-file batch processing
- Cloud deployment with auto-scaling
- GPU acceleration for large point clouds
- Integration with BIM/CAD export

## Files

- `lidar_service.py` - Main Flask application
- `requirements.txt` - Python dependencies
- `README.md` - Service documentation
- `INTEGRATION.md` - This file
- `storage/` - Runtime data directory
  - `results.json` - Scan metadata and results
  - `progress/` - Processing logs
  - `*.ply|obj|json` - Uploaded scan files
