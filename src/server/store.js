import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { existsSync } from 'node:fs';

import { createInitialState } from '../domain/model.js';
import { cloneProtectedState, protectStatePhones } from './phone-privacy.js';

const DEFAULT_DATA_FILE = join('public', 'data', 'app-state.json');

export async function loadState(filePath, nowIso = new Date().toISOString()) {
  try {
    const raw = await readFile(filePath, 'utf8');
    return protectStatePhones(JSON.parse(raw));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
    const state = protectStatePhones(createInitialState(nowIso));
    await saveState(filePath, state);
    return state;
  }
}

export async function saveState(filePath, state) {
  await mkdir(dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(cloneProtectedState(state), null, 2)}\n`, 'utf8');
}

export function resolveDataFilePath(dataFile = process.env.DATA_FILE, startDir = process.cwd()) {
  const gitRoot = findGitRoot(startDir);
  const nextDataFile = dataFile || DEFAULT_DATA_FILE;
  return isAbsolute(nextDataFile) ? nextDataFile : join(gitRoot, nextDataFile);
}

function findGitRoot(startDir) {
  let current = resolve(startDir);
  while (true) {
    if (existsSync(join(current, '.git'))) {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) {
      return resolve(process.cwd());
    }
    current = parent;
  }
}
