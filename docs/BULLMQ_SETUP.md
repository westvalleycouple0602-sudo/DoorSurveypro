# BullMQ Job Queue Setup Guide

## Overview

DoorSurvey Pro uses BullMQ for background job processing with Redis backend. The job queue handles asynchronous tasks like PDF generation, Excel exports, email sending, and more.

## Architecture

- **Primary Backend**: BullMQ with Redis
- **Fallback Backend**: In-memory queue
- **Connection**: Shared Redis instance (same as cache)
- **Worker Concurrency**: 3 jobs per queue
- **Rate Limiting**: 10 jobs per second per queue

## Features

### Queue Management
- **Multiple Job Types**: PDF, Excel, Email, LiDAR, Photo Analysis, Compliance
- **Priority Levels**: Critical, High, Normal, Low
- **Automatic Retries**: Exponential backoff (3 attempts default)
- **Job Scheduling**: Delayed job execution
- **Progress Tracking**: Real-time job progress updates

### Persistence & Cleanup
- **Completed Jobs**: Kept for 24 hours (max 1000)
- **Failed Jobs**: Kept for 7 days
- **Job History**: Query by user or organization

## Job Types

```typescript
export type JobType = 
  | 'pdf-generation'      // Generate PDF reports
  | 'excel-export'        // Export data to Excel
  | 'email-send'          // Send emails with attachments
  | 'lidar-processing'    // Process LiDAR scans
  | 'photo-analysis'      // AI photo analysis
  | 'quote-generation'    // Generate customer quotes
  | 'compliance-check';   // Run compliance validations
```

## Usage Examples

### Adding a Job

```typescript
import { jobQueue } from './utils/job-queue';

// Add a PDF generation job
const jobId = await jobQueue.addJob(
  'pdf-generation',
  {
    projectId: 123,
    type: 'hardware-schedule',
    format: 'detailed'
  },
  {
    userId: '456',
    organizationId: '789',
    priority: 'high',      // Optional: critical, high, normal, low
    maxRetries: 3,         // Optional: default 3
    delay: 5000,           // Optional: delay in milliseconds
  }
);

console.log(`Job created: ${jobId}`);
```

### Registering Custom Handlers

```typescript
import { jobQueue, registerDefaultHandlers } from './utils/job-queue';

// Register default handlers (PDF, Excel, Email)
registerDefaultHandlers();

// Register custom handler
jobQueue.registerHandler('compliance-check', async (job) => {
  const { projectId, rulesetId } = job.data;
  
  // Run compliance check
  const results = await runComplianceCheck(projectId, rulesetId);
  
  // Update job progress
  job.progress = 50;
  
  // More processing...
  const report = await generateComplianceReport(results);
  
  job.progress = 100;
  
  return {
    passed: results.passed,
    violations: results.violations,
    reportUrl: report.url,
  };
});
```

### Checking Job Status

```typescript
// Get job by ID
const job = await jobQueue.getJob(jobId);

if (job) {
  console.log(`Status: ${job.status}`);
  console.log(`Progress: ${job.progress}%`);
  
  if (job.status === 'completed') {
    console.log('Result:', job.result);
  } else if (job.status === 'failed') {
    console.error('Error:', job.error);
  }
}
```

### Querying User Jobs

```typescript
// Get all jobs for a user
const userJobs = await jobQueue.getUserJobs(userId);

// Filter by status
const pendingJobs = userJobs.filter(j => j.status === 'pending');
const failedJobs = userJobs.filter(j => j.status === 'failed');

// Get organization jobs
const orgJobs = await jobQueue.getOrganizationJobs(orgId);
```

### Cancelling Jobs

```typescript
// Cancel a pending job
const cancelled = await jobQueue.cancelJob(jobId);

if (cancelled) {
  console.log('Job cancelled successfully');
} else {
  console.log('Job already processing or completed');
}
```

### Queue Statistics

```typescript
const stats = await jobQueue.getStats();

console.log(stats);
// {
//   backend: 'bullmq',
//   queues: {
//     'pdf-generation': {
//       waiting: 5,
//       active: 2,
//       completed: 123,
//       failed: 3,
//       delayed: 0
//     },
//     'excel-export': { ... },
//     ...
//   }
// }
```

## API Integration

### Add Job Endpoint

```typescript
// server/routes.ts
router.post('/api/jobs', requireAuth, async (req, res) => {
  const { type, data, priority } = req.body;
  
  const jobId = await jobQueue.addJob(
    type,
    data,
    {
      userId: req.user.id,
      organizationId: req.user.organizationId,
      priority: priority || 'normal',
    }
  );
  
  res.json({ jobId });
});
```

### Check Job Status Endpoint

```typescript
router.get('/api/jobs/:jobId', requireAuth, async (req, res) => {
  const job = await jobQueue.getJob(req.params.jobId);
  
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  
  // Verify user has access to this job
  if (job.userId !== req.user.id && job.organizationId !== req.user.organizationId) {
    return res.status(403).json({ error: 'Unauthorized' });
  }
  
  res.json(job);
});
```

### List User Jobs Endpoint

```typescript
router.get('/api/jobs', requireAuth, async (req, res) => {
  const jobs = await jobQueue.getUserJobs(req.user.id);
  res.json(jobs);
});
```

## Job Handler Best Practices

### 1. Error Handling

```typescript
jobQueue.registerHandler('photo-analysis', async (job) => {
  try {
    const { photoUrl } = job.data;
    
    // Validate input
    if (!photoUrl) {
      throw new Error('Photo URL is required');
    }
    
    // Process photo
    const analysis = await analyzePhoto(photoUrl);
    
    return { analysis };
  } catch (error) {
    // Log error with context
    logger.error('Photo analysis failed', {
      jobId: job.id,
      photoUrl: job.data.photoUrl,
      error: error.message,
    });
    
    // Re-throw to trigger retry
    throw error;
  }
});
```

### 2. Progress Updates

```typescript
jobQueue.registerHandler('excel-export', async (job) => {
  const { data } = job.data;
  const totalRecords = data.length;
  
  job.progress = 0;
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Data');
  
  job.progress = 10;
  
  // Process in batches
  const batchSize = 100;
  for (let i = 0; i < totalRecords; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    worksheet.addRows(batch);
    
    // Update progress
    job.progress = 10 + (i / totalRecords) * 80;
  }
  
  job.progress = 90;
  
  const buffer = await workbook.xlsx.writeBuffer();
  const filename = await saveToStorage(buffer);
  
  job.progress = 100;
  
  return { filename, recordCount: totalRecords };
});
```

### 3. Long-Running Jobs

```typescript
jobQueue.registerHandler('lidar-processing', async (job) => {
  const { scanId } = job.data;
  
  // Break into steps
  job.progress = 0;
  
  // Step 1: Load scan data
  const scanData = await loadLiDARScan(scanId);
  job.progress = 20;
  
  // Step 2: Clean and filter
  const cleanedData = await cleanPointCloud(scanData);
  job.progress = 40;
  
  // Step 3: Extract features
  const features = await extractFeatures(cleanedData);
  job.progress = 60;
  
  // Step 4: Generate mesh
  const mesh = await generateMesh(features);
  job.progress = 80;
  
  // Step 5: Save results
  const meshUrl = await saveMesh(mesh);
  job.progress = 100;
  
  return {
    meshUrl,
    pointCount: scanData.length,
    features: features.length,
  };
});
```

## Configuration

### Environment Variables

```bash
# .env
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=          # Optional for local development
```

### Job Options

```typescript
// Per-job configuration
await jobQueue.addJob(type, data, {
  userId: string,         // Required: job owner
  organizationId: string, // Required: organization context
  priority: 'high',       // Optional: critical, high, normal, low
  maxRetries: 5,          // Optional: override default 3
  delay: 60000,           // Optional: delay execution by 60 seconds
});
```

### Queue Configuration

Modify `server/utils/job-queue.ts` to adjust queue settings:

```typescript
const queue = new Queue(type, {
  connection: REDIS_CONFIG,
  defaultJobOptions: {
    attempts: 3,                    // Change default retry count
    backoff: {
      type: 'exponential',          // Or 'fixed'
      delay: 1000,                  // Base delay in ms
    },
    removeOnComplete: {
      age: 24 * 3600,               // Keep for 24 hours
      count: 1000,                  // Keep max 1000 jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600,           // Keep failed for 7 days
    },
  },
});
```

### Worker Configuration

```typescript
const worker = new Worker(type, handler, {
  connection: REDIS_CONFIG,
  concurrency: 5,                   // Process 5 jobs simultaneously
  limiter: {
    max: 20,                        // Max 20 jobs
    duration: 1000,                 // Per second
  },
});
```

## Monitoring

### Queue Events

```typescript
import { QueueEvents } from 'bullmq';

const queueEvents = new QueueEvents('pdf-generation', {
  connection: REDIS_CONFIG,
});

// Job lifecycle events
queueEvents.on('waiting', ({ jobId }) => {
  logger.info(`Job ${jobId} is waiting`);
});

queueEvents.on('active', ({ jobId }) => {
  logger.info(`Job ${jobId} started processing`);
});

queueEvents.on('completed', ({ jobId, returnvalue }) => {
  logger.info(`Job ${jobId} completed`, { result: returnvalue });
});

queueEvents.on('failed', ({ jobId, failedReason }) => {
  logger.error(`Job ${jobId} failed`, { reason: failedReason });
});

queueEvents.on('progress', ({ jobId, data }) => {
  logger.debug(`Job ${jobId} progress: ${data}%`);
});
```

### Dashboard (Optional)

Install bull-board for a web UI:

```bash
npm install @bull-board/api @bull-board/express @bull-board/bullmq
```

```typescript
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(pdfQueue),
    new BullMQAdapter(excelQueue),
    new BullMQAdapter(emailQueue),
  ],
  serverAdapter,
});

app.use('/admin/queues', requireAdmin, serverAdapter.getRouter());
```

Visit `http://localhost:5000/admin/queues` to view the dashboard.

## Production Deployment

### 1. Use External Redis

See [REDIS_SETUP.md](./REDIS_SETUP.md) for external Redis service options (Upstash, Redis Cloud, Railway).

### 2. Scale Workers

Run multiple worker instances across different servers:

```typescript
// worker.ts
import { Worker } from 'bullmq';
import { REDIS_CONFIG } from './config';

// Only workers, no queue creation
const worker = new Worker('pdf-generation', pdfHandler, {
  connection: REDIS_CONFIG,
  concurrency: 10, // More concurrency on dedicated worker
});

worker.run();
```

Deploy workers separately from API servers for better scaling.

### 3. Monitor Performance

```typescript
// Get queue metrics
const queue = jobQueue['queues'].get('pdf-generation');
const metrics = await queue.getMetrics('completed', 0, Date.now());

console.log({
  count: metrics.count,
  data: metrics.data, // Throughput data
});
```

### 4. Handle Graceful Shutdown

```typescript
// Gracefully close workers and queues on shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, closing job queue...');
  await jobQueue.close();
  process.exit(0);
});
```

## Troubleshooting

### Jobs Not Processing

1. **Check Redis connection**:
   ```bash
   redis-cli ping
   ```

2. **Check worker status**:
   ```typescript
   const workers = jobQueue['workers'];
   console.log('Active workers:', workers.size);
   ```

3. **Check queue stats**:
   ```typescript
   const stats = await jobQueue.getStats();
   console.log('Queue stats:', stats);
   ```

### High Memory Usage

1. **Reduce job retention**:
   ```typescript
   removeOnComplete: {
     age: 3600,      // 1 hour instead of 24
     count: 100,     // 100 jobs instead of 1000
   }
   ```

2. **Implement job result cleanup**:
   ```typescript
   removeOnComplete: true,  // Remove immediately
   ```

3. **Monitor Redis memory**:
   ```bash
   redis-cli info memory
   ```

### Failed Jobs Piling Up

1. **Review failed job reasons**:
   ```typescript
   const failed = await queue.getFailed();
   failed.forEach(job => {
     console.log(`Job ${job.id} failed: ${job.failedReason}`);
   });
   ```

2. **Clean up old failures**:
   ```typescript
   await queue.clean(7 * 24 * 3600 * 1000, 1000, 'failed');
   ```

3. **Fix handlers and retry**:
   ```typescript
   const job = await queue.getJob(jobId);
   await job.retry();
   ```

## Best Practices

1. **Idempotent Handlers**: Ensure jobs can be safely retried
2. **Timeout Protection**: Set reasonable timeouts for long jobs
3. **Resource Cleanup**: Always clean up files/connections
4. **Progress Updates**: Keep users informed for long jobs
5. **Error Context**: Log enough context to debug failures
6. **Test Handlers**: Unit test job handlers independently
7. **Monitor Queues**: Set up alerts for queue depth and failures

## Related Documentation

- [Redis Setup Guide](./REDIS_SETUP.md)
- [Performance Optimization](../IMPLEMENTATION_SUMMARY.md#performance-optimization)
- [Deployment Guide](../A_PLUS_DEPLOYMENT_GUIDE.md)
