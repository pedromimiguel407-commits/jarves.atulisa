import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../frontend/anime-studio.js', import.meta.url), 'utf8');

function createAnimeStudio() {
  const elements = new Map();
  const ids = [
    'anime-canvas',
    'anime-story',
    'anime-plan',
    'anime-character',
    'anime-setting',
    'anime-scene',
    'anime-motion',
    'anime-dialogue',
    'anime-duration',
    'anime-duration-value',
    'anime-plan-status',
    'anime-render-status',
    'anime-generate-plan',
    'anime-generate-preview',
    'anime-play',
    'anime-export-html',
    'anime-export',
    'anime-save-project',
    'anime-restore-backup',
  ];

  for (const id of ids) {
    elements.set(`#${id}`, {
      value: id === 'anime-story'
        ? 'Uma maga corre pela cidade'
        : id === 'anime-duration'
          ? '99'
          : '',
      addEventListener(name, callback) {
        this.listeners ??= new Map();
        this.listeners.set(name, callback);
      },
      focus() {},
      classList: { add() {}, remove() {} },
    });
  }
  elements.get('#anime-character').value = '<svg onload="alert(1)">Lia</svg>';
  elements.get('#anime-setting').value = 'Praça & noite';
  elements.get('#anime-dialogue').value = '<script>alert(2)</script>';

  const gradient = { addColorStop() {} };
  const canvasContext = new Proxy({}, {
    get(_target, property) {
      if (property === 'createLinearGradient' || property === 'createRadialGradient') {
        return () => gradient;
      }
      if (property === 'measureText') return () => ({ width: 0 });
      return () => {};
    },
  });
  const canvas = elements.get('#anime-canvas');
  canvas.width = 640;
  canvas.height = 360;
  canvas.getContext = () => canvasContext;

  let downloadedBlob;
  let downloadedFilename;
  const document = {
    querySelector(selector) {
      return elements.get(selector) ?? null;
    },
    createElement() {
      return {
        click() {},
        set download(filename) {
          downloadedFilename = filename;
        },
      };
    },
  };
  const context = {
    Blob,
    document,
    localStorage: { getItem() { return null; }, setItem() {} },
    performance: { now() { return 0; } },
    requestAnimationFrame() { return 1; },
    cancelAnimationFrame() {},
    setTimeout() {},
    URL: {
      createObjectURL(blob) {
        downloadedBlob = blob;
        return 'blob:test';
      },
      revokeObjectURL() {},
    },
    window: {
      jarvesAutoSave: {
        async load() { return null; },
        async save() {},
        async restorePrevious() { return null; },
        schedule() {},
      },
    },
  };

  vm.runInNewContext(source, context);

  return {
    elements,
    getDownloadedBlob: () => downloadedBlob,
    getDownloadedFilename: () => downloadedFilename,
  };
}

test('HTML animation export is wired, animated, bounded and escapes user input', async () => {
  const studio = createAnimeStudio();
  const exportButton = studio.elements.get('#anime-export-html');
  const clickHandler = exportButton.listeners?.get('click');

  assert.equal(typeof clickHandler, 'function', 'export handler should be available on startup');
  clickHandler();

  const blob = studio.getDownloadedBlob();
  assert.ok(blob, 'export should create a downloadable file');
  assert.equal(studio.getDownloadedFilename(), 'jarves-animacao.html');
  assert.equal(blob.type, 'text/html;charset=utf-8');

  const html = await blob.text();
  assert.match(html, /data-motion="run"/);
  assert.match(html, /@keyframes run/);
  assert.match(html, /--duration: 30s/);
  assert.match(html, /Praça &amp; noite/);
  assert.match(html, /&lt;svg onload=&quot;alert\(1\)&quot;&gt;Lia&lt;\/svg&gt;/);
  assert.match(html, /&lt;script&gt;alert\(2\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<svg onload|<script>alert/);
  assert.match(studio.elements.get('#anime-render-status').textContent, /arquivo independente/);
});
