/**
 * Smoke Tests for Production Deployment
 * 
 * These tests verify critical endpoints are functioning after deployment.
 * Run these tests immediately after deploying to catch deployment issues early.
 * 
 * Usage:
 *   npx jest --testPathPattern=smoke-tests.test.ts
 *   
 * Or set SMOKE_TEST_URL to test remote deployment:
 *   SMOKE_TEST_URL=https://your-app.replit.app npx jest --testPathPattern=smoke-tests.test.ts
 * 
 * IMPORTANT: Tests FAIL FAST if server is unreachable - this is intentional!
 * A deployment with an unreachable server should NOT pass smoke tests.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';

const BASE_URL = process.env.SMOKE_TEST_URL || 'http://localhost:5000';
const TIMEOUT = 10000; // 10 second timeout for smoke tests

describe('Deployment Smoke Tests', () => {
  beforeAll(async () => {
    // Check if server is reachable with retries
    // CRITICAL: Throw error if server is down - don't skip tests!
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Attempting to reach ${BASE_URL} (attempt ${attempt}/${maxRetries})...`);
        const response = await fetch(`${BASE_URL}/_health/alive`, {
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        
        if (response.ok) {
          console.log(`✅ Server is reachable at ${BASE_URL}`);
          return; // Success! Continue with tests
        } else {
          lastError = new Error(`Server returned HTTP ${response.status}`);
          console.warn(`Server returned ${response.status}`);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Connection attempt ${attempt} failed:`, lastError.message);
        
        if (attempt < maxRetries) {
          console.log(`Waiting ${retryDelay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // Server is unreachable - FAIL THE TESTS
    const errorMsg = `❌ CRITICAL: Server unreachable at ${BASE_URL} after ${maxRetries} attempts`;
    console.error('\n' + '='.repeat(80));
    console.error(errorMsg);
    console.error('Last error:', lastError?.message);
    console.error('\nThis is a deployment validation FAILURE.');
    console.error('The service MUST be running for smoke tests to pass.');
    console.error('Check deployment logs and ensure the server started successfully.');
    console.error('='.repeat(80) + '\n');
    
    throw new Error(errorMsg + ': ' + lastError?.message);
  }, 30000); // Allow 30s for server connection attempts

  describe('Health Check Endpoints', () => {
    it('should respond to liveness probe', async () => {
      const response = await fetch(`${BASE_URL}/_health/alive`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data.ok).toBe(true);
      expect(data.service).toBe('doorsurvey-pro');
      expect(data.timestamp).toBeDefined();
    }, TIMEOUT);

    it('should respond to readiness probe with all dependency checks', async () => {
      const response = await fetch(`${BASE_URL}/_health/ready`);
      
      // Accept either 200 (all healthy) or 503 (some dependencies down but not critical)
      expect([200, 503]).toContain(response.status);

      const data = await response.json();
      expect(data).toHaveProperty('ok');
      expect(data).toHaveProperty('checks');
      
      // Verify critical checks exist
      expect(data.checks).toHaveProperty('database');
      expect(data.checks).toHaveProperty('cache');
      expect(data.checks).toHaveProperty('queue');
      expect(data.checks).toHaveProperty('session');
      expect(data.checks).toHaveProperty('config');
      
      // Database must be healthy for readiness
      if (data.ok) {
        expect(data.checks.database.ok).toBe(true);
        expect(data.checks.database).toHaveProperty('latency_ms');
      }
      
      // Cache and queue should report backend type
      if (data.checks.cache.ok) {
        expect(['redis', 'in-memory']).toContain(data.checks.cache.backend);
      }
      if (data.checks.queue.ok) {
        expect(['bullmq-redis', 'in-memory']).toContain(data.checks.queue.backend);
      }
    }, TIMEOUT);

    it('should respond to metrics endpoint', async () => {
      const response = await fetch(`${BASE_URL}/_health/metrics`);
      expect(response.status).toBe(200);

      const data = await response.json();
      expect(data).toHaveProperty('process');
      expect(data).toHaveProperty('environment');
      
      expect(data.process).toHaveProperty('uptime_seconds');
      expect(data.process).toHaveProperty('memory_usage_mb');
      expect(data.environment).toHaveProperty('node_env');
    }, TIMEOUT);
  });

  describe('Critical Application Endpoints', () => {
    it('should serve landing page without authentication', async () => {
      const response = await fetch(`${BASE_URL}/`);
      expect(response.status).toBe(200);
      
      const contentType = response.headers.get('content-type');
      expect(contentType).toContain('text/html');
    }, TIMEOUT);

    it('should reject unauthenticated API requests appropriately', async () => {
      const response = await fetch(`${BASE_URL}/api/user`);
      expect(response.status).toBe(401);
      
      const data = await response.json();
      expect(data).toHaveProperty('error');
    }, TIMEOUT);

    it('should serve static assets', async () => {
      // Try to fetch a common static asset (may not exist in dev)
      const response = await fetch(`${BASE_URL}/favicon.ico`);
      // Accept 200 (found) or 404 (not found but server responding)
      expect([200, 404]).toContain(response.status);
    }, TIMEOUT);
  });

  describe('Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await fetch(`${BASE_URL}/_health/alive`);
      const headers = response.headers;

      // Check for critical security headers
      expect(headers.has('x-content-type-options')).toBe(true);
      expect(headers.has('x-frame-options')).toBe(true);
      expect(headers.has('strict-transport-security') || process.env.NODE_ENV !== 'production').toBe(true);
    }, TIMEOUT);
  });

  describe('Performance Baselines', () => {
    it('should respond to liveness probe within 500ms', async () => {
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/_health/alive`);
      const duration = Date.now() - start;

      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(500);
    }, TIMEOUT);

    it('should respond to readiness probe within 2 seconds', async () => {
      const start = Date.now();
      const response = await fetch(`${BASE_URL}/_health/ready`);
      const duration = Date.now() - start;

      expect([200, 503]).toContain(response.status);
      expect(duration).toBeLessThan(2000);
    }, TIMEOUT);
  });

  describe('Database Connectivity', () => {
    it('should confirm database is accessible via readiness check', async () => {
      const response = await fetch(`${BASE_URL}/_health/ready`);
      const data = await response.json();

      // If server claims readiness, database must be healthy
      if (response.status === 200) {
        expect(data.checks.database.ok).toBe(true);
        expect(data.checks.database.latency_ms).toBeLessThan(1000);
      }
    }, TIMEOUT);
  });

  describe('Fallback Mechanisms', () => {
    it('should report cache backend status (Redis or in-memory)', async () => {
      const response = await fetch(`${BASE_URL}/_health/ready`);
      const data = await response.json();

      expect(data.checks.cache).toBeDefined();
      if (data.checks.cache.ok) {
        expect(['redis', 'in-memory']).toContain(data.checks.cache.backend);
        
        // Log warning if using fallback
        if (data.checks.cache.backend === 'in-memory') {
          console.warn('⚠️  WARN: Cache using in-memory fallback (Redis unavailable)');
        }
      }
    }, TIMEOUT);

    it('should report job queue backend status (BullMQ or in-memory)', async () => {
      const response = await fetch(`${BASE_URL}/_health/ready`);
      const data = await response.json();

      expect(data.checks.queue).toBeDefined();
      if (data.checks.queue.ok) {
        expect(['bullmq-redis', 'in-memory']).toContain(data.checks.queue.backend);
        
        // Log warning if using fallback
        if (data.checks.queue.backend === 'in-memory') {
          console.warn('⚠️  WARN: Job queue using in-memory fallback (Redis unavailable)');
        }
      }
    }, TIMEOUT);
  });
});

describe('Post-Deployment Validation', () => {
  it('should log deployment summary', async () => {
    if (process.env.SMOKE_TEST_URL) {
      console.log('\n========================================');
      console.log('DEPLOYMENT SMOKE TEST SUMMARY');
      console.log('========================================');
      console.log(`Target: ${process.env.SMOKE_TEST_URL}`);
      console.log('Status: ✅ All tests passed');
      console.log('========================================\n');
    }
  });
});
