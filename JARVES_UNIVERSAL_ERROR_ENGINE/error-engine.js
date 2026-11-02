(() => {
  const STORAGE_KEY = 'jarves-error-report-v1';
  const MAX_ERRORS = 50;
  const entries = [];

  function classify(message, status = 0) {
    const text = String(message || '').toLowerCase();
    if (/ollama|model not found|modelo .*não|cuda|out of memory|resposta vazia|generation|streaming/.test(text)) return 'Ollama';
    if (/failed to fetch|network|connection refused|connection reset|timed out|dns|socket|fetch|circuito de conexão/.test(text)) {
      return 'Rede';
    }
    if (status || /http|api|unauthorized|forbidden|rate limit|json/.test(text)) return 'API';
    if (/sqlite|database|banco de dados/.test(text)) return 'Banco de dados';
    return 'Frontend';
  }

  function guidance(category, status = 0) {
    if (category === 'Rede') {
      return 'Verifique o endereço do JARVES, se o servidor está ativo e se este dispositivo alcança a rede local.';
    }
    if (category === 'Ollama') {
      return 'Confira se o Ollama está em execução, se JARVES_OLLAMA_URL está correto e se o modelo está instalado.';
    }
    if (category === 'Banco de dados') {
      return 'Confira JARVES_DATABASE e as permissões. Faça backup antes de qualquer reparo.';
    }
    if (status === 401 || status === 403) {
      return 'Confira o token de acesso e as permissões configuradas; não compartilhe credenciais.';
    }
    if (status === 429) return 'Limite de requisições atingido. Aguarde antes de tentar novamente.';
    if (status >= 500) return 'A API encontrou uma falha no servidor. Execute o diagnóstico e consulte os logs locais.';
    if (status >= 400) return 'Confira os dados enviados e o endpoint solicitado.';
    return 'Execute o diagnóstico para verificar API, Ollama e banco de dados.';
  }

  function explain(message, status = 0, source = 'Aplicação') {
    const category = classify(message, status);
    const details = status ? `HTTP ${status}: ${message}` : String(message || 'Falha de conexão.');
    record(details, { status, source });
    if (category === 'Rede') {
      return `Não foi possível conectar ao servidor JARVES. ${guidance(category)}`;
    }
    return `${details} ${guidance(category, status)}`;
  }

  function redact(message) {
    return String(message || 'Erro sem mensagem').slice(0, 500)
      .replace(/Bearer\s+\S+/gi, 'Bearer [redigido]')
      .replace(/jarves_sk_[A-Za-z0-9_-]+/g, 'jarves_sk_[redigido]')
      .replace(/(?:sk-[A-Za-z0-9_-]{16,})/g, '[chave redigida]');
  }

  function loadSaved() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(saved) ? saved.slice(0, MAX_ERRORS) : [];
    } catch (error) {
      console.warn('O histórico local de diagnósticos não pôde ser lido.', error);
      return [];
    }
  }

  function record(message, { status = 0, source = 'Aplicação', line = 0 } = {}) {
    const safeMessage = redact(message);
    const category = classify(safeMessage, status);
    const entry = {
      category,
      message: safeMessage,
      guidance: guidance(category, status),
      source: String(source).slice(0, 40),
      line: Number.isInteger(line) && line > 0 ? line : 0,
      time: new Date().toISOString(),
    };
    entries.unshift(entry);
    entries.length = Math.min(entries.length, MAX_ERRORS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.warn('O diagnóstico ficou somente nesta sessão; não foi possível salvar no navegador.', error);
    }
    renderHistory();
    return entry;
  }

  function recordRecovery(message, source = 'API') {
    const entry = {
      category: 'Recuperado',
      message: redact(message),
      guidance: 'A leitura foi concluída após uma nova tentativa automática segura.',
      source: String(source).slice(0, 40),
      line: 0,
      recovered: true,
      time: new Date().toISOString(),
    };
    entries.unshift(entry);
    entries.length = Math.min(entries.length, MAX_ERRORS);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (error) {
      console.warn('A recuperação ficou somente nesta sessão; não foi possível salvar no navegador.', error);
    }
    renderHistory();
  }

  function history() {
    const merged = [...entries, ...loadSaved()];
    const unique = new Map(merged.map((entry) => [`${entry.time}:${entry.message}`, entry]));
    return [...unique.values()].slice(0, MAX_ERRORS);
  }

  function renderHistory() {
    const list = document.querySelector('#error-history');
    const total = document.querySelector('#error-total');
    const critical = document.querySelector('#error-critical');
    const resolved = document.querySelector('#error-resolved');
    if (!list || !total || !critical || !resolved) return;
    const items = history();
    total.textContent = String(items.length);
    critical.textContent = String(items.filter((item) => item.category === 'Rede' || item.category === 'API').length);
    resolved.textContent = String(items.filter((item) => item.recovered === true).length);
    list.replaceChildren();
    if (!items.length) {
      const empty = document.createElement('p');
      empty.className = 'error-empty';
      empty.textContent = 'Nenhum erro capturado neste navegador.';
      list.append(empty);
      return;
    }
    for (const item of items) {
      const row = document.createElement('article');
      row.className = 'error-entry';
      const heading = document.createElement('strong');
      heading.textContent = `${item.category} · ${item.source}${item.line ? `:${item.line}` : ''}`;
      const message = document.createElement('p');
      message.textContent = item.message;
      const hint = document.createElement('small');
      hint.textContent = item.guidance;
      const time = document.createElement('time');
      time.dateTime = item.time;
      time.textContent = new Date(item.time).toLocaleString();
      row.append(heading, message, hint, time);
      list.append(row);
    }
  }

  async function analyze() {
    const output = document.querySelector('#diagnostic-results');
    const button = document.querySelector('#analyze-errors');
    if (!output || !button) return;
    button.disabled = true;
    output.replaceChildren();
    const pending = document.createElement('p');
    pending.textContent = 'Verificando API, Ollama e integridade SQLite…';
    output.append(pending);
    try {
      const response = await fetch('/api/diagnostics', { headers: { Accept: 'application/json' } });
      const data = await response.json();
      if (!response.ok) {
        const error = new Error(data.detail || `Falha HTTP ${response.status}`);
        record(error.message, { source: 'Diagnóstico', status: response.status });
        throw error;
      }
      output.replaceChildren();
      for (const check of data.checks) {
        const card = document.createElement('article');
        card.className = `diagnostic-result ${check.status}`;
        const title = document.createElement('strong');
        title.textContent = `${check.component}: ${check.status}`;
        const message = document.createElement('p');
        message.textContent = check.message;
        const action = document.createElement('small');
        action.textContent = check.action;
        card.append(title, message, action);
        output.append(card);
      }
      document.querySelector('#diagnostic-summary').textContent =
        data.status === 'ok' ? 'Verificações concluídas sem falhas.' : 'Foram encontradas condições que precisam de atenção.';
    } catch (error) {
      const failure = document.createElement('p');
      failure.className = 'diagnostic-result error';
      failure.textContent = `${redact(error.message)}. ${guidance('Rede')}`;
      output.replaceChildren(failure);
      document.querySelector('#diagnostic-summary').textContent = 'Não foi possível concluir o diagnóstico.';
    } finally {
      button.disabled = false;
    }
  }

  function downloadReport() {
    const report = {
      created_at: new Date().toISOString(),
      diagnostics: history(),
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'jarves-error-report.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  window.addEventListener('error', (event) => {
    const source = event.filename
      ? String(event.filename).replace(/^[a-z]+:\/\/[^/]+/i, '').split(/[?#]/, 1)[0]
      : 'JavaScript';
    record(event.message || 'Erro JavaScript não identificado', { source, line: event.lineno });
  });
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    record(reason instanceof Error ? reason.message : String(reason), { source: 'Promise' });
  });
  document.querySelector('#analyze-errors')?.addEventListener('click', analyze);
  document.querySelector('#test-connection')?.addEventListener('click', analyze);
  document.querySelector('#download-error-report')?.addEventListener('click', downloadReport);
  document.querySelector('#clear-error-history')?.addEventListener('click', () => {
    entries.length = 0;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.warn('O histórico local não pôde ser apagado.', error);
    }
    renderHistory();
  });

  window.jarvesErrorEngine = {
    classify,
    guidance,
    explain,
    record,
    recordRecovery,
    renderHistory,
  };
  renderHistory();
})();
