import { createHttpServer } from './app.js';
import { loadState, saveState } from './store.js';

const PORT = Number(process.env.PORT ?? 3000);
const DATA_FILE = process.env.DATA_FILE ?? 'data/app-state.json';

const state = await loadState(DATA_FILE);
const server = createHttpServer({
  state,
  persist: true,
  saveState: (nextState) => saveState(DATA_FILE, nextState),
  staticRoot: 'public'
});

server.listen(PORT, () => {
  console.log(`Clube das Tercas running at http://localhost:${PORT}`);
});
