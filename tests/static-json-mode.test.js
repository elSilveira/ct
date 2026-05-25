import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('project is configured for static GitHub Pages mode', async () => {
  const pkg = JSON.parse(await readFile('package.json', 'utf8'));
  const html = await readFile('public/index.html', 'utf8');
  const workflow = await readFile('.github/workflows/pages.yml', 'utf8');
  const clientApi = await readFile('public/client-api.js', 'utf8');

  assert.equal(pkg.scripts.dev, 'node src/server/server.js');
  assert.equal(pkg.scripts.start, 'node src/server/server.js');
  assert.equal(pkg.dependencies, undefined);
  assert.match(html, /type="module"/);
  assert.match(workflow, /Upload artifact/);
  assert.match(workflow, /path: public/);
  assert.match(clientApi, /localStorage/);
  assert.match(clientApi, /crypto\.subtle\.digest/);
  assert.match(clientApi, /exportClientState/);
  assert.match(clientApi, /importClientState/);
});

test('static seed stores phone hashes instead of raw mobile numbers', async () => {
  const state = JSON.parse(await readFile('public/data/app-state.json', 'utf8'));

  assert.ok(state.members.length >= 4);
  for (const member of state.members) {
    assert.match(member.phoneHash, /^[a-f0-9]{64}$/);
    assert.doesNotMatch(member.phone ?? '', /^54\d{9}$/);
    assert.doesNotMatch(JSON.stringify(member), /5499999000[1-9]/);
  }
});
