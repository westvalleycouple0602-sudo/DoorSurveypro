# Running the Python LiDAR Service

## Quick Start

### Option 1: Direct Start (Recommended for Development)
```bash
cd python-services
python lidar_service.py
```

The service will start on port 8080.

### Option 2: Using the Startup Script
```bash
./python-services/start.sh
```

### Option 3: Custom Port
```bash
cd python-services
PORT=8081 python lidar_service.py
```

## Verifying the Service is Running

Check health endpoint:
```bash
curl http://localhost:8080/health
```

Expected response:
```json
{"ok": true}
```

## Integration with Main Application

Once the Python service is running on port 8080:

1. The main Express application (port 5000) will automatically proxy advanced LiDAR processing requests to it
2. Users can process LiDAR scans using either:
   - Standard processing: `POST /api/lidar/scans/:id/process` (TypeScript, ~1s)
   - Advanced processing: `POST /api/lidar/scans/:id/process-advanced?mode=fast` (Python/Open3D, ~8s)
   - Full processing: `POST /api/lidar/scans/:id/process-advanced?mode=full` (Python/Open3D, ~25s)

## Logs

The Python service creates logs in:
- Console output: Processing steps and errors
- Progress logs: `storage/progress/<scan_id>.log`
- Results: `storage/results.json`

## Stopping the Service

Press `Ctrl+C` in the terminal running the service.

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 8080
lsof -i :8080

# Kill the process (if needed)
kill -9 <PID>
```

### Missing Dependencies
```bash
# Reinstall dependencies
pip install -r requirements.txt
```

### ImportError: No module named 'open3d'
This means the Python dependencies weren't installed. Run:
```bash
pip install Flask numpy open3d trimesh Werkzeug
```

## Production Deployment

For production, consider:
1. Using a process manager (PM2, Supervisor)
2. Setting up automatic restart on failure
3. Configuring proper logging
4. Running behind a reverse proxy (if exposing externally)
5. Setting resource limits for memory-intensive processing

Example PM2 configuration:
```json
{
  "apps": [{
    "name": "lidar-service",
    "script": "python",
    "args": "lidar_service.py",
    "cwd": "./python-services",
    "env": {
      "PORT": "8080"
    },
    "max_memory_restart": "1G",
    "error_file": "./logs/lidar-error.log",
    "out_file": "./logs/lidar-out.log"
  }]
}
```

## Development Tips

- Keep both services running in separate terminals for testing
- Monitor Python service logs for processing details
- Use fast mode (default) during development, full mode for production measurements
- Check progress logs for detailed step-by-step processing information
