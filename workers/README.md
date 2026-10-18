# DoorSurvey Pro Workers

Event-driven background workers for async processing of survey data, compliance validation, and photo enrichment.

## Architecture

The workers use an **event-driven microservices architecture** powered by NATS message bus:

```
API Server (Express)
    ↓ publishes events
  NATS Message Bus
    ↓ subscribes to events
Workers (Enricher, Compliance)
    ↓ process & write results
  PostgreSQL Database
```

### Event Flow

1. **Opening Created** → `survey.ingested` event
   - Compliance worker validates building codes
   - Creates violation records if non-compliant
   
2. **Photo Uploaded** → `photo.uploaded` event
   - Enricher worker extracts metadata
   - Generates thumbnails
   - Performs OCR text extraction
   
3. **LiDAR Scan Uploaded** → `lidar.uploaded` event
   - Future: Process point clouds
   - Extract measurements

## Workers

### Enricher Worker

**Purpose**: Async photo processing for improved search and analysis

**Capabilities**:
- OCR text extraction (Tesseract.js)
- Thumbnail generation (Jimp)
- EXIF metadata extraction
- Perceptual hashing for duplicate detection

**Events**: Listens to `photo.uploaded`

**Location**: `workers/enricher/`

### Compliance Worker

**Purpose**: Automated building code compliance validation

**Capabilities**:
- RAG-based compliance checking using OpenAI + pgvector
- Basic rule-based validation (ADA, IBC, NFPA)
- Automatic violation detection and recording
- Publishes `violation.created` events for notifications

**Events**: Listens to `survey.ingested`

**Location**: `workers/compliance/`

## Running Workers

### Local Development (with NATS)

**Prerequisites**:
- NATS server running (or set `NATS_URL`)
- PostgreSQL database
- OpenAI API key (optional, for RAG compliance)

**Start Enricher Worker**:
```bash
cd workers/enricher
npm install
NATS_URL=nats://localhost:4222 DATABASE_URL=your_db_url npm run dev
```

**Start Compliance Worker**:
```bash
cd workers/compliance
npm install
NATS_URL=nats://localhost:4222 \
DATABASE_URL=your_db_url \
OPENAI_API_KEY=your_key \
npm run dev
```

### Without NATS (In-Memory Fallback)

If `NATS_URL` is not configured, the API server will queue events in memory. Workers won't receive these events, but the system remains functional with synchronous processing fallback.

**Behavior without NATS**:
- ✅ **Compliance validation**: Runs synchronously (fully functional)
- ⚠️ **Photo enrichment**: Gracefully degrades (no OCR/thumbnails)
- ⚠️ **LiDAR processing**: Gracefully degrades (no async processing)

This is useful for:
- Development without setting up NATS
- Testing core features without worker infrastructure
- Graceful degradation in production (compliance still works)

### Docker Deployment

Use the provided Docker Compose configuration:

```bash
# In the learning machine starter package
cd attached_assets/learning-machine/infra
docker compose up -d
```

This starts:
- PostgreSQL with pgvector
- NATS message bus
- MinIO (S3-compatible storage)
- Server + Workers

## Environment Variables

### Required for All Workers

```bash
# Message Bus
NATS_URL=nats://localhost:4222

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/doorsurvey
```

### Optional (Enricher Worker)

```bash
# S3/MinIO for storing thumbnails
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
S3_ACCESS_KEY_ID=minioadmin
S3_SECRET_ACCESS_KEY=minioadmin
S3_BUCKET=doorsurvey-thumbnails
```

### Optional (Compliance Worker)

```bash
# OpenAI for RAG compliance validation
OPENAI_API_KEY=sk-...

# Fallback: Worker uses basic rule-based checks if not provided
```

## Event Contracts

### `survey.ingested`

Published when a new opening is created.

```typescript
{
  openingId: string;
  projectId: string;
  organizationId: string;
  userId: string;
  doorType: string;
  timestamp: string;
}
```

### `photo.uploaded`

Published when a photo is attached to an opening.

```typescript
{
  photoId: string;
  openingId: string;
  projectId: string;
  organizationId: string;
  userId: string;
  url: string;
  timestamp: string;
}
```

### `lidar.uploaded`

Published when a LiDAR scan is uploaded.

```typescript
{
  scanId: string;
  openingId: string;
  projectId: string;
  organizationId: string;
  userId: string;
  storageKey: string;
  scanFormat: 'ply' | 'obj' | 'json';
  timestamp: string;
}
```

### `violation.created`

Published when a compliance violation is detected.

```typescript
{
  openingId: string;
  organizationId: string;
  code: string;
  severity: 'critical' | 'major' | 'minor';
  description: string;
  timestamp: string;
}
```

## Benefits of Worker Architecture

### Performance
- **Instant API responses** - Heavy processing happens async
- **Independent scaling** - Scale workers based on load
- **Resource optimization** - Workers can run on separate machines

### Reliability
- **Fault tolerance** - NATS ensures no event loss
- **Retry logic** - Failed workers can retry without affecting API
- **Graceful degradation** - In-memory fallback when NATS unavailable

### Maintainability
- **Separation of concerns** - Each worker has single responsibility
- **Independent deployment** - Update workers without redeploying API
- **Easy testing** - Workers can be tested in isolation

## Monitoring

Workers log all activities in JSON format for easy parsing:

```json
{
  "level": "info",
  "msg": "Photo enriched successfully",
  "photoId": "123",
  "hasExtractedText": true,
  "hasThumbnail": true,
  "organizationId": "org-456",
  "timestamp": "2025-11-11T17:30:00.000Z"
}
```

Monitor worker health by:
- Checking NATS connection status
- Tracking event processing rates
- Monitoring error rates in logs
- Querying database for processing status

## Future Workers

Potential workers to add:

- **Embeddings Worker**: Generate vectors for semantic search
- **Hardware Recommendation Worker**: Suggest hardware based on opening specs
- **Reporting Worker**: Generate PDFs/Excel exports
- **HubSpot Sync Worker**: Push data to CRM
- **Notification Worker**: Send emails/SMS for violations
- **LiDAR Processing Worker**: Extract measurements from 3D scans

## Troubleshooting

### Worker not receiving events

1. Check NATS connection:
   ```bash
   curl http://localhost:4222/varz
   ```

2. Verify event publishing:
   - Check API server logs for "Event published" messages
   - Ensure NATS_URL is configured in API server

3. Check worker subscription:
   - Worker should log "listening on [event name]" on startup
   - Verify DATABASE_URL is correct

### Events queued in memory

If you see `"Event queued in memory (NATS unavailable)"` in API logs:

1. NATS is not running - start NATS server
2. NATS_URL is incorrect - verify connection string
3. Network issue - check firewall rules

Workers won't process in-memory events. Set up NATS for full functionality.

## Schema Additions

Workers require these database columns (add via migrations):

```sql
-- Photos table
ALTER TABLE photos 
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS extracted_text TEXT,
  ADD COLUMN IF NOT EXISTS exif_data JSONB,
  ADD COLUMN IF NOT EXISTS processing_status VARCHAR(32) DEFAULT 'uploaded',
  ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMP;

-- Existing compliance_violations table already supports worker updates
```

## License

Part of DoorSurvey Pro - Enterprise Commercial Door Survey Platform
