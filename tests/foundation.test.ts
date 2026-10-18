import assert from 'node:assert/strict';
import { test } from 'node:test';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';

test('unit preloader replaces application data endpoints with inert local fixtures', () => {
  assert.equal(process.env.NODE_ENV, 'test');
  const url = new URL(process.env.DATABASE_URL!);
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.port, '1');
  assert.equal(process.env.REDIS_PORT, '1');
});

test('unit preloader blocks HTTP, HTTPS, raw TCP and fetch', async () => {
  assert.throws(() => http.get('http://example.invalid'), /cannot open network/);
  assert.throws(() => https.get('https://example.invalid'), /cannot open network/);
  assert.throws(() => net.connect(5432, 'example.invalid'), /cannot open network/);
  await assert.rejects(fetch('https://example.invalid'), /cannot make live fetch/);
});
