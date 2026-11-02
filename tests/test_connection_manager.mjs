import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../frontend/connection-manager.js', import.meta.url), 'utf8');

function createManager(fetchImplementation, isOnline = true) {
  const events = new EventTarget();
  const window = {
    addEventListener: events.addEventListener.bind(events),
    dispatchEvent: events.dispatchEvent.bind(events),
    fetch: fetchImplementation,
    setInterval: () => 0,
    setTimeout: () => 0,
  };
  const context = {
    AbortController,
    CustomEvent: class extends Event {
      constructor(type, options) {
        super(type);
        this.detail = options.detail;
      }
    },
    DOMException,
    Headers,
    Date,
    document: { visibilityState: 'visible' },
    navigator: { onLine: isOnline },
    performance,
    setTimeout,
    clearTimeout,
    window,
  };

  vm.runInNewContext(source, context);
  return window.jarvesConnectionManager;
}

test('GET is retried and recovery returns the connection to online', async () => {
  let attempts = 0;
  const manager = createManager(async () => {
    attempts += 1;
    if (attempts === 1) throw new TypeError('temporary network failure');
    return { status: 200, ok: true, json: async () => ({ status: 'ok' }) };
  });

  const response = await manager.fetch('/api/status');

  assert.equal(response.status, 200);
  assert.equal(attempts, 2);
  assert.equal(manager.getState().state, 'online');
});

test('POST is not retried after a network failure', async () => {
  let attempts = 0;
  const manager = createManager(async () => {
    attempts += 1;
    throw new TypeError('connection refused');
  });

  await assert.rejects(manager.fetch('/api/chat', { method: 'POST' }), /connection refused/);
  assert.equal(attempts, 1);
  assert.equal(manager.getState().state, 'unreachable');
});

test('an externally cancelled request is not retried or counted as a network failure', async () => {
  let attempts = 0;
  const manager = createManager(async (_path, options) => {
    attempts += 1;
    return new Promise((_, reject) => {
      options.signal.addEventListener('abort', () => {
        reject(options.signal.reason);
      }, { once: true });
    });
  });
  const controller = new AbortController();
  const operation = manager.fetch('/api/status', { signal: controller.signal });
  controller.abort(new DOMException('cancelled', 'AbortError'));

  await assert.rejects(operation, { name: 'AbortError' });
  assert.equal(attempts, 1);
  assert.equal(manager.getState().consecutiveFailures, 0);
});

test('the circuit breaker rejects new requests after repeated failures', async () => {
  const manager = createManager(async () => {
    throw new TypeError('connection refused');
  });

  for (let failure = 0; failure < 3; failure += 1) {
    await assert.rejects(manager.fetch('/api/chat', { method: 'POST' }), /connection refused/);
  }

  await assert.rejects(
    manager.fetch('/api/chat', { method: 'POST' }),
    { name: 'CircuitOpenError' },
  );
});
