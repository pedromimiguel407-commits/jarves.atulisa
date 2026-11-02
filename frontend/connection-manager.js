(() => {
  const HEALTH_URL = '/api/health';
  const HEALTH_INTERVAL_MS = 30_000;
  const READ_TIMEOUT_MS = 15_000;
  const MAX_GET_RETRIES = 2;
  const CIRCUIT_FAILURE_LIMIT = 3;
  const CIRCUIT_RESET_MS = 10_000;
  let state = 'checking';
  let consecutiveFailures = 0;
  let circuitOpenUntil = 0;
  let probePromise = null;
  let headersProvider = () => new Headers();

  function publish(extra = {}) {
    window.dispatchEvent(new CustomEvent('jarves:connection-state', {
      detail: {
        state,
        failures: consecutiveFailures,
        circuitOpen: Date.now() < circuitOpenUntil,
        ...extra,
      },
    }));
  }

  function allowRequest(path) {
    if (path === HEALTH_URL) return;
    if (Date.now() < circuitOpenUntil) {
      const error = new Error('Circuito de conexão aberto após falhas repetidas. Verificando novamente o servidor…');
      error.name = 'CircuitOpenError';
      throw error;
    }
    if (circuitOpenUntil) circuitOpenUntil = 0;
  }

  function markReachable(response, startedAt) {
    const latencyMs = Math.round(performance.now() - startedAt);
    if (response.status === 401 || response.status === 403) {
      state = 'restricted';
    } else {
      state = 'online';
    }
    consecutiveFailures = 0;
    circuitOpenUntil = 0;
    publish({ latencyMs, httpStatus: response.status });
  }

  function markUnreachable(error, path) {
    consecutiveFailures += 1;
    state = navigator.onLine === false ? 'offline' : 'unreachable';
    if (consecutiveFailures >= CIRCUIT_FAILURE_LIMIT) {
      circuitOpenUntil = Date.now() + CIRCUIT_RESET_MS;
    }
    publish({ error: error.message, path });
  }

  async function fetch(path, options = {}) {
    const method = (options.method || 'GET').toUpperCase();
    const retryLimit = method === 'GET' ? MAX_GET_RETRIES : 0;
    const requestKey = method === 'GET' && !options.signal
      ? `${path}:${options.headers?.get?.('Authorization') || ''}`
      : '';
    if (requestKey && inFlightReads.has(requestKey)) return inFlightReads.get(requestKey);

    const operation = fetchWithRetry(path, options, retryLimit);
    if (!requestKey) return operation;
    inFlightReads.set(requestKey, operation);
    try {
      return await operation;
    } finally {
      inFlightReads.delete(requestKey);
    }
  }

  const inFlightReads = new Map();

  async function fetchWithRetry(path, options, retryLimit) {
    const method = (options.method || 'GET').toUpperCase();
    for (let attempt = 0; ; attempt += 1) {
      allowRequest(path);
      const controller = new AbortController();
      const externalSignal = options.signal;
      const onAbort = () => controller.abort(externalSignal.reason);
      if (externalSignal?.aborted) onAbort();
      else externalSignal?.addEventListener('abort', onAbort, { once: true });
      const startedAt = performance.now();
      const timeoutId = method === 'GET'
        ? setTimeout(
          () => controller.abort(new DOMException('A leitura da API excedeu 15 segundos.', 'TimeoutError')),
          READ_TIMEOUT_MS,
        )
        : null;

      try {
        const response = await window.fetch(path, { ...options, signal: controller.signal });
        markReachable(response, startedAt);
        if (attempt > 0) {
          window.jarvesErrorEngine?.recordRecovery(
            'Uma leitura da API foi concluída após nova tentativa automática segura.',
            'Rede',
          );
        }
        return response;
      } catch (error) {
        if (externalSignal?.aborted) throw error;
        if (error.name === 'AbortError' && timeoutId !== null) error.name = 'TimeoutError';
        else if (error.name === 'AbortError') throw error;

        if (method === 'GET' && attempt < retryLimit && navigator.onLine !== false) {
          await new Promise((resolve) => setTimeout(resolve, 300 * (2 ** attempt)));
          continue;
        }
        markUnreachable(error, path);
        if (consecutiveFailures >= CIRCUIT_FAILURE_LIMIT) {
          window.setTimeout(checkHealth, CIRCUIT_RESET_MS);
        }
        throw error;
      } finally {
        if (timeoutId !== null) clearTimeout(timeoutId);
        externalSignal?.removeEventListener('abort', onAbort);
      }
    }
  }

  async function checkHealth() {
    if (navigator.onLine === false) {
      state = 'offline';
      publish();
      return;
    }
    if (probePromise) return probePromise;
    probePromise = (async () => {
      try {
        const response = await fetch(HEALTH_URL, { headers: headersProvider() });
        if (!response.ok) {
          state = response.status === 401 || response.status === 403 ? 'restricted' : 'unreachable';
          publish({ httpStatus: response.status });
          return;
        }
        await response.json();
      } catch {
        // The fetch layer publishes the actual connectivity failure.
      } finally {
        probePromise = null;
      }
    })();
    return probePromise;
  }

  window.addEventListener('online', checkHealth);
  window.addEventListener('offline', () => {
    state = 'offline';
    publish();
  });
  window.addEventListener('load', checkHealth, { once: true });
  window.setInterval(() => {
    if (document.visibilityState === 'visible') checkHealth();
  }, HEALTH_INTERVAL_MS);

  window.jarvesConnectionManager = {
    fetch,
    checkHealth,
    setHeadersProvider: (provider) => { headersProvider = provider; },
    getState: () => ({ state, consecutiveFailures, circuitOpenUntil }),
  };
})();
