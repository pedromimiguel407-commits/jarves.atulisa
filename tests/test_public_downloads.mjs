import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const pages = await Promise.all(['../downloads.html', '../frontend/downloads.html'].map(async (path) => (
  readFile(new URL(path, import.meta.url), 'utf8')
)));
const inlineScripts = pages.map((page) => page.match(/<script>([\s\S]*?)<\/script>/)?.[1]);
assert.ok(inlineScripts.every(Boolean), 'download pages should contain their standalone scripts');

class Element {
  constructor(tagName = 'div') {
    this.tagName = tagName;
    this.children = [];
    this.textContent = '';
    this.hidden = false;
  }

  append(...children) {
    this.children.push(...children);
  }

  replaceChildren(...children) {
    this.children = [...children];
  }

  addEventListener() {}
}

function createDownloadsPage(releases, inlineScript = inlineScripts[0]) {
  const selectors = [
    '#release-status',
    '#downloads-android',
    '#downloads-windows',
    '#downloads-linux',
    '#install-app',
    '#install-status',
  ];
  const elements = new Map(selectors.map((selector) => [selector, new Element()]));
  const document = {
    querySelector(selector) {
      return elements.get(selector);
    },
    createElement(tagName) {
      return new Element(tagName);
    },
    createTextNode(text) {
      return { textContent: text };
    },
  };
  const window = {
    isSecureContext: false,
    addEventListener() {},
  };
  const context = {
    document,
    fetch: async () => ({ ok: true, json: async () => releases }),
    navigator: {},
    window,
  };

  vm.runInNewContext(inlineScript, context);

  return new Promise((resolve) => {
    setImmediate(() => resolve(elements));
  });
}

test('download page lists only official packages published in GitHub releases', async () => {
  const releases = [{
    assets: [
      {
        name: 'jarves.apk',
        size: 2_097_152,
        browser_download_url: 'https://github.com/pedromimiguel407-commits/jarves/releases/download/v1/jarves.apk',
      },
      {
        name: 'jarves-setup.exe',
        size: 3_145_728,
        browser_download_url: 'https://github.com/pedromimiguel407-commits/jarves/releases/download/v1/jarves-setup.exe',
      },
      {
        name: 'jarves.AppImage',
        size: 4_194_304,
        browser_download_url: 'https://github.com/pedromimiguel407-commits/jarves/releases/download/v1/jarves.AppImage',
      },
      {
        name: 'fake.apk',
        size: 100,
        browser_download_url: 'https://example.com/fake.apk',
      },
      {
        name: 'notes.txt',
        size: 100,
        browser_download_url: 'https://github.com/pedromimiguel407-commits/jarves/releases/download/v1/notes.txt',
      },
    ],
  }];
  const elements = await createDownloadsPage(releases);

  assert.equal(elements.get('#downloads-android').children.length, 1);
  assert.equal(elements.get('#downloads-windows').children.length, 1);
  assert.equal(elements.get('#downloads-linux').children.length, 1);
  assert.equal(elements.get('#downloads-android').children[0].children[0].textContent, 'jarves.apk');
  assert.equal(elements.get('#downloads-windows').children[0].children[0].textContent, 'jarves-setup.exe');
  assert.equal(elements.get('#downloads-linux').children[0].children[0].textContent, 'jarves.AppImage');
  assert.match(elements.get('#release-status').textContent, /3 arquivo\(s\)/);
});

test('download page keeps package cards empty when no native releases exist', async () => {
  const elements = await createDownloadsPage([]);

  assert.equal(elements.get('#downloads-android').children.length, 0);
  assert.equal(elements.get('#downloads-windows').children.length, 0);
  assert.equal(elements.get('#downloads-linux').children.length, 0);
  assert.match(elements.get('#release-status').textContent, /Nenhum instalador/);
});

test('served download page lists the actual APK, EXE, and AppImage assets', async () => {
  const releases = [{
    assets: [
      {
        name: 'jarves.apk',
        size: 2_097_152,
        browser_download_url: 'https://github.com/pedromimiguel407-commits/jarves/releases/download/v1/jarves.apk',
      },
      {
        name: 'jarves.exe',
        size: 3_145_728,
        browser_download_url: 'https://github.com/pedromimiguel407-commits/jarves/releases/download/v1/jarves.exe',
      },
      {
        name: 'jarves.AppImage',
        size: 4_194_304,
        browser_download_url: 'https://github.com/pedromimiguel407-commits/jarves/releases/download/v1/jarves.AppImage',
      },
    ],
  }];
  const elements = await createDownloadsPage(releases, inlineScripts[1]);

  assert.equal(elements.get('#downloads-android').children.length, 1);
  assert.equal(elements.get('#downloads-windows').children.length, 1);
  assert.equal(elements.get('#downloads-linux').children.length, 1);
  assert.equal(elements.get('#downloads-android').children[0].children[0].textContent, 'jarves.apk');
  assert.equal(elements.get('#downloads-windows').children[0].children[0].textContent, 'jarves.exe');
  assert.equal(elements.get('#downloads-linux').children[0].children[0].textContent, 'jarves.AppImage');
});

test('download page reports GitHub API errors instead of showing fake links', async () => {
  const releaseStatus = new Element();
  const errorContext = {
    document: {
      querySelector: () => releaseStatus,
      createElement: (tagName) => new Element(tagName),
      createTextNode: (text) => ({ textContent: text }),
    },
    fetch: async () => ({ ok: false, status: 403 }),
    navigator: {},
    window: { isSecureContext: false, addEventListener() {} },
  };

  vm.runInNewContext(inlineScripts[0], errorContext);
  await new Promise((resolve) => setImmediate(resolve));

  assert.match(releaseStatus.textContent, /HTTP 403/);
});
