import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { createInitialState } from '../src/domain/model.js';
import { loadState, resolveDataFilePath, saveState } from '../src/server/store.js';

test('default database path resolves from the git root to the versioned public data file', () => {
  const expected = join(process.cwd(), 'public', 'data', 'app-state.json');

  assert.equal(resolveDataFilePath(undefined, join(process.cwd(), 'src', 'server')), expected);
});

test('state persistence stores phone hashes and masked phones instead of raw numbers', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'cdt-store-'));
  const filePath = join(dir, 'app-state.json');
  try {
    const state = createInitialState('2026-05-25T12:00:00.000Z');

    await saveState(filePath, state);

    const raw = await readFile(filePath, 'utf8');
    assert.doesNotMatch(raw, /5499999000[1-9]/);

    const stored = JSON.parse(raw);
    assert.match(stored.members[0].phoneHash, /^[a-f0-9]{64}$/);
    assert.equal(stored.members[0].phone, '***0001');

    const loaded = await loadState(filePath, '2026-05-25T12:00:00.000Z');
    assert.equal(loaded.members[0].phone, '***0001');
    assert.match(loaded.members[0].phoneHash, /^[a-f0-9]{64}$/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
