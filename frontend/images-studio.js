(() => {
  'use strict';

  const byId = (id) => document.getElementById(id);
  const status = byId('image-generation-status');
  const gallery = byId('image-gallery');
  const refineButton = byId('btn-refine-image-prompt');
  const generateButton = byId('btn-generate-image-batch');
  const refreshButton = byId('btn-refresh-image-gallery');
  if (!status || !gallery || !refineButton || !generateButton) return;

  const objectUrls = new Set();

  async function apiRequest(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const fetcher = window.jarvesConnectionManager?.fetch
      ? window.jarvesConnectionManager.fetch.bind(window.jarvesConnectionManager)
      : window.fetch.bind(window);
    const response = await fetcher(url, { ...options, headers });
    if (!response.ok) {
      let detail = `HTTP ${response.status}`;
      try {
        const data = await response.json();
        detail = data.detail || detail;
      } catch {}
      throw new Error(detail);
    }
    return response;
  }

  function setStatus(message, kind = '') {
    status.textContent = message;
    status.dataset.state = kind;
  }

  function clearGallery() {
    for (const url of objectUrls) URL.revokeObjectURL(url);
    objectUrls.clear();
    gallery.replaceChildren();
  }

  function makeText(tag, className, value) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    element.textContent = value;
    return element;
  }

  async function addImageCard(image) {
    const response = await apiRequest(image.url);
    const blob = await response.blob();
    if (!blob.type.startsWith('image/')) throw new Error('O servidor retornou um arquivo que não é uma imagem.');
    const objectUrl = URL.createObjectURL(blob);
    objectUrls.add(objectUrl);

    const card = makeText('article', 'generated-image-card', '');
    const preview = document.createElement('img');
    preview.src = objectUrl;
    preview.alt = 'Imagem criada pelo JARVES AI';
    preview.loading = 'lazy';
    preview.decoding = 'async';
    const meta = makeText('div', 'image-card-meta', '');
    const prompt = makeText('p', '', image.prompt || 'Imagem gerada');
    const dimensions = makeText('p', '', `${image.width} × ${image.height}`);
    const actions = makeText('div', 'image-card-actions', '');
    const download = document.createElement('a');
    download.href = objectUrl;
    download.download = `jarves-${image.id}.png`;
    download.textContent = 'Baixar PNG';
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.textContent = 'Excluir';
    remove.addEventListener('click', async () => {
      if (!window.confirm('Excluir esta imagem salva?')) return;
      remove.disabled = true;
      try {
        await apiRequest(`/api/images/${encodeURIComponent(image.id)}`, { method: 'DELETE' });
        URL.revokeObjectURL(objectUrl);
        objectUrls.delete(objectUrl);
        card.remove();
        if (!gallery.children.length) gallery.append(makeText('p', 'tool-footnote', 'Nenhuma imagem salva ainda.'));
      } catch (error) {
        setStatus(`Não foi possível excluir a imagem: ${error.message}`, 'error');
        remove.disabled = false;
      }
    });
    actions.append(download, remove);
    meta.append(prompt, dimensions, actions);
    card.append(preview, meta);
    gallery.append(card);
  }

  async function loadGallery() {
    clearGallery();
    const response = await apiRequest('/api/images');
    const data = await response.json();
    const images = Array.isArray(data.images) ? data.images : [];
    if (!images.length) {
      gallery.append(makeText('p', 'tool-footnote', 'Nenhuma imagem salva ainda.'));
      return;
    }
    let failed = 0;
    for (const image of images) {
      try {
        await addImageCard(image);
      } catch {
        failed += 1;
      }
    }
    if (failed) setStatus(`${failed} imagem(ns) não puderam ser carregadas. Verifique a conexão do servidor.`, 'warning');
  }

  async function checkProvider() {
    try {
      const response = await apiRequest('/api/images/status');
      const data = await response.json();
      if (data.connected) {
        setStatus(`Gerador local conectado · ${data.model_count || 0} modelo(s) detectado(s). Pode gerar até 7 imagens por lote.`, 'success');
      } else {
        setStatus(data.message || 'Gerador local não conectado.', 'warning');
      }
    } catch (error) {
      setStatus(`Não foi possível verificar o gerador: ${error.message}`, 'error');
    }
  }

  refineButton.addEventListener('click', async () => {
    const idea = byId('image-idea').value.trim();
    if (!idea) {
      setStatus('Descreva uma ideia antes de refinar o prompt.', 'warning');
      return;
    }
    refineButton.disabled = true;
    setStatus('Ollama está transformando sua ideia em um prompt visual...');
    try {
      const model = byId('model-select')?.value || null;
      const response = await apiRequest('/api/images/prompt', {
        method: 'POST',
        body: JSON.stringify({ idea, style: byId('image-style').value.trim(), model }),
      });
      const data = await response.json();
      byId('image-prompt').value = data.prompt;
      setStatus(`Prompt refinado com ${data.model}. Revise-o antes de gerar.`, 'success');
    } catch (error) {
      setStatus(`Não foi possível refinar a ideia: ${error.message}`, 'error');
    } finally {
      refineButton.disabled = false;
    }
  });

  generateButton.addEventListener('click', async () => {
    const prompt = byId('image-prompt').value.trim() || byId('image-idea').value.trim();
    if (!prompt) {
      setStatus('Escreva uma ideia ou um prompt antes de gerar.', 'warning');
      return;
    }
    const count = Math.min(7, Math.max(1, Number(byId('image-count').value) || 1));
    generateButton.disabled = true;
    refineButton.disabled = true;
    setStatus(`Solicitando ${count} imagem(ns) ao gerador local. Isso pode levar alguns minutos...`);
    try {
      const response = await apiRequest('/api/images/generate', {
        method: 'POST',
        body: JSON.stringify({
          prompt,
          negative_prompt: byId('image-negative').value.trim(),
          count,
          width: Number(byId('image-width').value),
          height: Number(byId('image-height').value),
          steps: Number(byId('image-steps').value),
        }),
      });
      const data = await response.json();
      setStatus(`${data.generated_count} de ${data.requested_count} imagem(ns) recebidas e salvas. Tempo: ${data.generation_seconds}s.`, data.generated_count === data.requested_count ? 'success' : 'warning');
      await loadGallery();
    } catch (error) {
      setStatus(`Geração não concluída: ${error.message}`, 'error');
    } finally {
      generateButton.disabled = false;
      refineButton.disabled = false;
    }
  });

  refreshButton?.addEventListener('click', async () => {
    refreshButton.disabled = true;
    try {
      await loadGallery();
    } catch (error) {
      setStatus(`Não foi possível carregar a galeria: ${error.message}`, 'error');
    } finally {
      refreshButton.disabled = false;
    }
  });

  checkProvider();
  loadGallery().catch((error) => {
    gallery.replaceChildren(makeText('p', 'tool-footnote', `Não foi possível carregar a galeria: ${error.message}`));
  });
  window.addEventListener('beforeunload', clearGallery);
})();
