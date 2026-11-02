(() => {
  const DATABASE_NAME = 'jarves-local-media';
  const DATABASE_VERSION = 2;
  const MAX_BACKUPS_PER_KEY = 5;
  const pending = new Map();
  let databasePromise;
  let lastSavedAt = null;

  function setStatus(message, state = 'saved') {
    const indicator = document.querySelector('#autosave-status');
    if (!indicator) return;
    indicator.textContent = message;
    indicator.dataset.state = state;
    if (lastSavedAt) indicator.title = `Último salvamento: ${new Date(lastSavedAt).toLocaleString()}`;
  }

  function openDatabase() {
    if (!('indexedDB' in window)) {
      return Promise.reject(new Error('Este navegador não oferece armazenamento IndexedDB.'));
    }
    if (!databasePromise) {
      databasePromise = new Promise((resolve, reject) => {
        const opening = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
        opening.onupgradeneeded = () => {
          const database = opening.result;
          if (!database.objectStoreNames.contains('images')) database.createObjectStore('images');
          if (!database.objectStoreNames.contains('drafts')) database.createObjectStore('drafts');
          if (!database.objectStoreNames.contains('backups')) database.createObjectStore('backups');
        };
        opening.onsuccess = () => resolve(opening.result);
        opening.onerror = () => reject(opening.error || new Error('Não foi possível abrir o armazenamento local.'));
        opening.onblocked = () => reject(new Error('Feche outras abas do JARVES para concluir a migração do armazenamento.'));
      }).catch((error) => {
        databasePromise = null;
        throw error;
      });
    }
    return databasePromise;
  }

  async function save(key, value) {
    setStatus('Salvando…', 'saving');
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(['drafts', 'backups'], 'readwrite');
      const drafts = transaction.objectStore('drafts');
      const backups = transaction.objectStore('backups');
      const savedAt = new Date().toISOString();
      const current = drafts.get(key);
      current.onsuccess = () => {
        if (current.result) {
          backups.put(current.result, `${key}:${current.result.savedAt}`);
        }
        drafts.put({ version: 1, savedAt, value }, key);
        const keys = backups.getAllKeys();
        keys.onsuccess = () => {
          const prefix = `${key}:`;
          const matching = keys.result
            .filter((backupKey) => typeof backupKey === 'string' && backupKey.startsWith(prefix))
            .sort();
          for (const oldKey of matching.slice(0, Math.max(0, matching.length - MAX_BACKUPS_PER_KEY))) {
            backups.delete(oldKey);
          }
        };
      };
      transaction.oncomplete = () => resolve(savedAt);
      transaction.onerror = () => reject(transaction.error || new Error('Falha ao salvar os dados neste dispositivo.'));
      transaction.onabort = () => reject(transaction.error || new Error('O salvamento local foi cancelado.'));
    }).then((savedAt) => {
      lastSavedAt = savedAt;
      setStatus(`Salvo · ${new Date(savedAt).toLocaleTimeString()}`);
    }).catch((error) => {
      setStatus(`Erro ao salvar: ${error.message}`, 'error');
      throw error;
    });
  }

  async function load(key) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('drafts', 'readonly');
      const request = transaction.objectStore('drafts').get(key);
      request.onsuccess = () => {
        if (request.result?.savedAt) {
          lastSavedAt = request.result.savedAt;
          setStatus(`Rascunho recuperado · ${new Date(lastSavedAt).toLocaleTimeString()}`);
        }
        resolve(request.result?.value);
      };
      request.onerror = () => reject(request.error || new Error('Falha ao recuperar o rascunho local.'));
      transaction.onabort = () => reject(transaction.error || new Error('A recuperação local foi cancelada.'));
    });
  }

  async function remove(key) {
    const database = await openDatabase();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('drafts', 'readwrite');
      transaction.objectStore('drafts').delete(key);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error || new Error('Não foi possível limpar o rascunho local.'));
      transaction.onabort = () => reject(transaction.error || new Error('A limpeza local foi cancelada.'));
    });
  }

  async function restorePrevious(key) {
    const database = await openDatabase();
    const previous = await new Promise((resolve, reject) => {
      const transaction = database.transaction('backups', 'readonly');
      const store = transaction.objectStore('backups');
      const prefix = `${key}:`;
      const keysRequest = store.getAllKeys();
      keysRequest.onsuccess = () => {
        const keys = keysRequest.result
          .filter((backupKey) => typeof backupKey === 'string' && backupKey.startsWith(prefix))
          .sort()
          .reverse();
        if (!keys.length) {
          resolve(null);
          return;
        }
        const backupRequest = store.get(keys[0]);
        backupRequest.onsuccess = () => resolve(backupRequest.result || null);
        backupRequest.onerror = () => reject(backupRequest.error || new Error('Falha ao ler a versão anterior.'));
      };
      keysRequest.onerror = () => reject(keysRequest.error || new Error('Falha ao listar as versões anteriores.'));
    });
    if (!previous) return null;
    await save(key, previous.value);
    return previous.value;
  }

  function markSaved(message = 'Salvo neste navegador.') {
    lastSavedAt = new Date().toISOString();
    setStatus(`${message} · ${new Date(lastSavedAt).toLocaleTimeString()}`);
  }

  function schedule(key, value, delay = 450) {
    setStatus('Alterações pendentes…', 'pending');
    clearTimeout(pending.get(key)?.timer);
    const timer = setTimeout(() => {
      pending.delete(key);
      save(key, value).catch(() => {});
    }, delay);
    pending.set(key, { timer, value });
  }

  function flush() {
    for (const [key, entry] of pending) {
      clearTimeout(entry.timer);
      pending.delete(key);
      save(key, entry.value).catch(() => {});
    }
  }

  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });

  window.jarvesAutoSave = {
    save,
    load,
    remove,
    restorePrevious,
    schedule,
    setStatus,
    markSaved,
    getLastSavedAt: () => lastSavedAt,
  };
})();
