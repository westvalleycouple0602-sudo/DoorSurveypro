// Process-local isolation only. Never changes saved workspace configuration.
for (const name of Object.keys(process.env)) {
  if (/SECRET|TOKEN|PASSWORD|API_KEY|ADMIN_PASS|DATABASE_URL|PRIVATE_OBJECT_DIR/.test(name)) {
    delete process.env[name];
  }
}
Object.assign(process.env, {
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://unit:unit@127.0.0.1:1/unit_do_not_connect',
  REDIS_URL: 'redis://127.0.0.1:1',
  REDIS_HOST: '127.0.0.1',
  REDIS_PORT: '1',
  NATS_URL: 'nats://127.0.0.1:1',
  SESSION_SECRET: 'disposable-unit-test-session-not-for-runtime',
});
globalThis.fetch = async () => {
  throw new Error('Unit tests cannot make live fetch requests. Mock the provider explicitly.');
};
const denyNetwork = () => {
  throw new Error('Unit tests cannot open network connections. Mock the provider or use an isolated integration environment.');
};
for (const name of ['node:http', 'node:https']) {
  const transport = require(name);
  transport.request = denyNetwork;
  transport.get = denyNetwork;
}
// Retain Unix-domain IPC needed by tooling, but block TCP/TLS sockets.
const net = require('node:net');
const originalConnect = net.Socket.prototype.connect;
net.Socket.prototype.connect = function (...args) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  const pipe = typeof first === 'string' ? first : first?.path;
  if (typeof pipe === 'string' && pipe.startsWith('/'))
    return originalConnect.apply(this, args);
  return denyNetwork();
};
require('node:tls').connect = denyNetwork;
require('node:module').syncBuiltinESMExports();
