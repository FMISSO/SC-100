const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..');
const scope = 'https://example.test/SC-100/';
const source = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

function worker() {
  const handlers = {};
  const state = { requests: [], opened: [], deleted: [], skipped: false, claimed: false, fetched: [] };
  const responses = new Map();
  const cache = {
    async addAll(requests) { state.requests = Array.from(requests); },
    async match(request) { return responses.get(typeof request === 'string' ? request : request.url); }
  };
  const caches = {
    async open(name) { state.opened.push(name); return cache; },
    async keys() { return ['sc100-v1', 'sc100-v2', 'another-app-v1']; },
    async delete(name) { state.deleted.push(name); return true; }
  };
  const self = {
    registration: { scope },
    location: new URL('sw.js', scope),
    addEventListener(name, handler) { handlers[name] = handler; },
    async skipWaiting() { state.skipped = true; },
    clients: { async claim() { state.claimed = true; } }
  };
  vm.runInNewContext(source, {
    self, caches, URL, Request,
    async fetch(request) { state.fetched.push(request.url); return new Response('network'); }
  });
  return { handlers, state, responses, cache };
}

function lifecycle(handler) {
  let promise;
  handler({ waitUntil(value) { promise = value; } });
  assert.ok(promise);
  return promise;
}

function request(app, relative, options = {}) {
  let response;
  app.handlers.fetch({
    request: { url: new URL(relative, scope).href, method: 'GET', mode: 'cors', ...options },
    respondWith(value) { response = value; }
  });
  return response;
}

test('the offline package contains every shipped asset at the Pages subpath', async () => {
  const app = worker();
  await lifecycle(app.handlers.install);
  assert.deepEqual(app.state.requests.map(item => item.url), [
    scope, ...['index.html', 'style.css', 'app.js', 'data.js', 'manifest.webmanifest',
      'icon-192.png', 'icon-512.png'].map(file => new URL(file, scope).href)
  ]);
  for (const item of app.state.requests) {
    const relative = new URL(item.url).pathname.slice(new URL(scope).pathname.length);
    assert.ok(fs.existsSync(path.join(root, relative || 'index.html')), item.url);
    assert.equal(item.cache, 'reload');
  }
  assert.deepEqual(app.state.opened, ['sc100-v2']);
  assert.equal(app.state.skipped, true);
});

test('manifest and HTML icons exist, match their declared dimensions and are precached', async () => {
  const app = worker();
  await lifecycle(app.handlers.install);
  const urls = new Set(app.state.requests.map(item => item.url));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  for (const icon of manifest.icons) {
    const bytes = fs.readFileSync(path.join(root, icon.src));
    assert.deepEqual(Array.from(bytes.subarray(0, 8)), [137, 80, 78, 71, 13, 10, 26, 10]);
    assert.equal(`${bytes.readUInt32BE(16)}x${bytes.readUInt32BE(20)}`, icon.sizes);
    assert.ok(urls.has(new URL(icon.src, scope).href), icon.src);
  }
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)) {
    assert.ok(urls.has(new URL(match[1], scope).href), match[1]);
  }
  assert.ok(urls.has(new URL(manifest.start_url, scope).href));
});

test('a failed asset download rejects installation instead of activating an incomplete package', async () => {
  const app = worker();
  app.cache.addAll = async () => { throw new Error('Asset download failed'); };
  await assert.rejects(lifecycle(app.handlers.install), /Asset download failed/);
  assert.equal(app.state.skipped, false);
});

test('activation removes only older caches belonging to this app and claims existing tabs', async () => {
  const app = worker();
  await lifecycle(app.handlers.activate);
  assert.deepEqual(app.state.deleted, ['sc100-v1']);
  assert.equal(app.state.claimed, true);
});

test('cached JavaScript is served without a network request', async () => {
  const app = worker();
  app.responses.set(new URL('app.js', scope).href, new Response('cached app'));
  const response = await request(app, 'app.js');
  assert.equal(await response.text(), 'cached app');
  assert.deepEqual(app.state.fetched, []);
  assert.deepEqual(app.state.opened, ['sc100-v2']);
});

test('offline navigation with a query string falls back to the cached entry page', async () => {
  const app = worker();
  app.responses.set(new URL('index.html', scope).href, new Response('cached page'));
  const response = await request(app, './?from=home-screen', { mode: 'navigate' });
  assert.equal(await response.text(), 'cached page');
  assert.deepEqual(app.state.fetched, []);
});

test('uncached resources use the network without returning HTML as JavaScript', async () => {
  const app = worker();
  app.responses.set(new URL('index.html', scope).href, new Response('cached page'));
  const response = await request(app, 'missing.js');
  assert.equal(await response.text(), 'network');
  assert.deepEqual(app.state.fetched, [new URL('missing.js', scope).href]);
});

test('other origins, other project paths and non-GET requests are not intercepted', () => {
  const app = worker();
  assert.equal(request(app, 'https://other.test/file.js'), undefined);
  assert.equal(request(app, '/another-project/index.html'), undefined);
  assert.equal(request(app, 'index.html', { method: 'POST' }), undefined);
});

test('bundled lesson and quiz data is valid and all scripts parse', () => {
  const dataSource = fs.readFileSync(path.join(root, 'data.js'), 'utf8');
  const data = vm.runInNewContext(`${dataSource}; DATA`);
  assert.equal(data.lessons.length, 16);
  for (const lesson of data.lessons) {
    assert.ok(typeof lesson[0] === 'string' && lesson[0].length > 0);
    assert.ok(typeof lesson[1] === 'string' && lesson[1].length > 0);
  }
  assert.equal(data.questions.length, 48);
  for (const question of data.questions) {
    assert.ok(Number.isInteger(question.a) && question.a >= 0 && question.a < question.o.length);
  }
  assert.equal(data.flash.length, 20);
  assert.equal(data.scenarios.length, 8);
  new vm.Script(fs.readFileSync(path.join(root, 'app.js'), 'utf8'));
});
