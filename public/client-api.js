import {
  addDrink,
  approvePoolMatch,
  createCharge,
  createDinnerTeam,
  createInitialState,
  createMember,
  createNotice,
  createPoolChampionship,
  createPoolMatch,
  createPoolTeam,
  getChargeReportByMember,
  getCurrentTuesday,
  getDinnerTeamForTuesday,
  getHomeData,
  getPoolRanking,
  getReports,
  getSessionMember,
  listActiveNotices,
  listAttendanceForTuesday,
  listChargesForUser,
  listClubTuesdays,
  listDrinkLogsForTuesday,
  listDrinkRowsForTuesday,
  listDrinksForTuesday,
  listMembers,
  listPoolMatches,
  listWeeklyPoolMatches,
  logout,
  rejectPoolMatch,
  removeDrink,
  removePoolMatch,
  setChargeStatus,
  setTuesdayStatus,
  submitPoolResult,
  summarizeAttendance,
  updateCharge,
  updateDrink,
  updateMember,
  updateNotice,
  updatePoolMatch,
  upsertAttendance
} from './domain/model.js';

const STORAGE_KEY = 'cdt_static_state_v1';
const PHONE_HASH_SALT = 'clube-das-tercas-static-phone-v1';

let statePromise = null;

export async function api(path, options = {}) {
  const state = await getClientState();
  const method = options.method || 'GET';
  const url = new URL(path, window.location.origin);
  const body = options.body || {};
  const result = await dispatchRoute(state, method, url.pathname, url.searchParams, body);
  return clone(result);
}

export function exportClientState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : null;
}

export async function importClientState(nextState) {
  if (!nextState?.members || !nextState?.counters) {
    throw new Error('Arquivo de backup invalido.');
  }
  const sanitized = await sanitizeState(nextState);
  saveClientState(sanitized);
  statePromise = Promise.resolve(sanitized);
}

async function getClientState() {
  statePromise ??= loadClientState();
  return statePromise;
}

async function loadClientState() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    return sanitizeState(JSON.parse(saved));
  }
  try {
    const response = await fetch(new URL('./data/app-state.json', import.meta.url));
    if (response.ok) {
      const seed = await response.json();
      const sanitized = await sanitizeState(seed);
      saveClientState(sanitized);
      return sanitized;
    }
  } catch {}
  const fallback = await sanitizeState(createInitialState(new Date().toISOString()));
  saveClientState(fallback);
  return fallback;
}

function saveClientState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function dispatchRoute(state, method, pathname, query, body) {
  const route = matchRoute(method, pathname);
  if (!route) throw httpError('Rota nao encontrada.', 404);
  const currentMember = route.public ? null : requireAuth(state);
  const result = await route.handler({ state, body, params: route.params, query, currentMember });
  if (route.mutates) saveClientState(state);
  return result;
}

const ROUTES = [
  route('POST', '/api/auth/login', true, true, async ({ state, body }) => loginByPhoneHash(state, body.phone)),
  route('POST', '/api/auth/logout', false, true, ({ state }) => ({ loggedOut: logout(state, localStorage.getItem('cdt_token')) })),
  route('GET', '/api/auth/me', false, false, ({ currentMember }) => currentMember),
  route('GET', '/api/home', false, false, ({ state, currentMember }) => getHomeData(state, currentMember.id)),
  route('GET', '/api/members', false, false, ({ state, currentMember, query }) => listMembers(state, currentMember.id, {
    includeInactive: query.get('includeInactive') === 'true',
    all: query.get('all') === 'true'
  })),
  route('POST', '/api/members', false, true, async ({ state, currentMember, body }) => {
    const prepared = await prepareMemberPayload(state, body);
    const member = createMember(state, currentMember.id, prepared.domain);
    applyPhoneCrypto(member, prepared);
    return member;
  }),
  route('PUT', '/api/members/:id', false, true, async ({ state, currentMember, params, body }) => {
    if (body.phone) {
      const prepared = await prepareMemberPayload(state, body, Number(params.id));
      const member = updateMember(state, currentMember.id, params.id, prepared.domain);
      applyPhoneCrypto(member, prepared);
      return member;
    }
    return updateMember(state, currentMember.id, params.id, body);
  }),
  route('PATCH', '/api/members/:id/status', false, true, ({ state, currentMember, params, body }) => updateMember(state, currentMember.id, params.id, { isActive: body.isActive })),
  route('GET', '/api/club-tuesdays', false, true, ({ state, query }) => listClubTuesdays(state, {
    monthsAhead: query.get('monthsAhead') ? Number(query.get('monthsAhead')) : 12
  })),
  route('GET', '/api/club-tuesdays/current', false, false, ({ state }) => getCurrentTuesday(state)),
  route('PATCH', '/api/club-tuesdays/:id/status', false, true, ({ state, currentMember, params, body }) => setTuesdayStatus(state, currentMember.id, params.id, body.status)),
  route('GET', '/api/attendance/:clubTuesdayId', false, false, ({ state, currentMember, params }) => ({
    rows: listAttendanceForTuesday(state, currentMember.id, params.clubTuesdayId),
    summary: summarizeAttendance(state, params.clubTuesdayId)
  })),
  route('POST', '/api/attendance', false, true, ({ state, currentMember, body }) => upsertAttendance(state, currentMember.id, body)),
  route('GET', '/api/notices/active', false, false, ({ state, query }) => listActiveNotices(state, query.get('clubTuesdayId'))),
  route('GET', '/api/notices', false, false, ({ state }) => state.notices),
  route('POST', '/api/notices', false, true, ({ state, currentMember, body }) => createNotice(state, currentMember.id, body)),
  route('PUT', '/api/notices/:id', false, true, ({ state, currentMember, params, body }) => updateNotice(state, currentMember.id, params.id, body)),
  route('PATCH', '/api/notices/:id/status', false, true, ({ state, currentMember, params, body }) => updateNotice(state, currentMember.id, params.id, { status: body.status })),
  route('GET', '/api/dinner-teams/:clubTuesdayId', false, false, ({ state, currentMember, params }) => getDinnerTeamForTuesday(state, params.clubTuesdayId, currentMember.id)),
  route('POST', '/api/dinner-teams', false, true, ({ state, currentMember, body }) => createDinnerTeam(state, currentMember.id, body)),
  route('GET', '/api/pool/championships', false, false, ({ state }) => state.poolChampionships),
  route('POST', '/api/pool/championships', false, true, ({ state, currentMember, body }) => createPoolChampionship(state, currentMember.id, body)),
  route('GET', '/api/pool/teams', false, false, ({ state, query }) => state.poolTeams.filter((team) => !query.get('championshipId') || team.championshipId === Number(query.get('championshipId')))),
  route('POST', '/api/pool/teams', false, true, ({ state, currentMember, body }) => createPoolTeam(state, currentMember.id, body)),
  route('GET', '/api/pool/matches', false, false, ({ state }) => listPoolMatches(state)),
  route('GET', '/api/pool/weekly/:clubTuesdayId', false, false, ({ state, params }) => listWeeklyPoolMatches(state, params.clubTuesdayId)),
  route('POST', '/api/pool/matches', false, true, ({ state, currentMember, body }) => createPoolMatch(state, currentMember.id, body)),
  route('PUT', '/api/pool/matches/:id', false, true, ({ state, currentMember, params, body }) => updatePoolMatch(state, currentMember.id, params.id, body)),
  route('DELETE', '/api/pool/matches/:id', false, true, ({ state, currentMember, params }) => removePoolMatch(state, currentMember.id, params.id)),
  route('PUT', '/api/pool/matches/:id/result', false, true, ({ state, currentMember, params, body }) => submitPoolResult(state, currentMember.id, params.id, body)),
  route('POST', '/api/pool/matches/:id/approve', false, true, ({ state, currentMember, params }) => approvePoolMatch(state, currentMember.id, params.id)),
  route('POST', '/api/pool/matches/:id/reject', false, true, ({ state, currentMember, params }) => rejectPoolMatch(state, currentMember.id, params.id)),
  route('GET', '/api/pool/ranking/:championshipId', false, false, ({ state, params }) => getPoolRanking(state, params.championshipId)),
  route('GET', '/api/drinks/:clubTuesdayId', false, false, ({ state, currentMember, params }) => listDrinksForTuesday(state, currentMember.id, params.clubTuesdayId)),
  route('GET', '/api/drinks/rows/:clubTuesdayId', false, false, ({ state, currentMember, params }) => listDrinkRowsForTuesday(state, currentMember.id, params.clubTuesdayId)),
  route('POST', '/api/drinks', false, true, ({ state, currentMember, body }) => addDrink(state, currentMember.id, body)),
  route('PUT', '/api/drinks/:id', false, true, ({ state, currentMember, params, body }) => updateDrink(state, currentMember.id, params.id, body)),
  route('DELETE', '/api/drinks/:id', false, true, ({ state, currentMember, params }) => removeDrink(state, currentMember.id, params.id)),
  route('GET', '/api/drinks/logs/:clubTuesdayId', false, false, ({ state, currentMember, params }) => listDrinkLogsForTuesday(state, currentMember.id, params.clubTuesdayId)),
  route('GET', '/api/drinks/reports/monthly', false, false, ({ state, currentMember, query }) => getReports(state, currentMember.id, query.get('month') ?? state.nowIso.slice(0, 7)).drinks),
  route('GET', '/api/charges/me', false, false, ({ state, currentMember }) => listChargesForUser(state, currentMember.id)),
  route('GET', '/api/charges', false, false, ({ state, currentMember, query }) => listChargesForUser(state, currentMember.id, {
    memberId: query.get('memberId'),
    month: query.get('month'),
    pendingOnly: query.get('pendingOnly') === 'true'
  })),
  route('POST', '/api/charges', false, true, ({ state, currentMember, body }) => createCharge(state, currentMember.id, body)),
  route('PUT', '/api/charges/:id', false, true, ({ state, currentMember, params, body }) => updateCharge(state, currentMember.id, params.id, body)),
  route('PATCH', '/api/charges/:id/status', false, true, ({ state, currentMember, params, body }) => setChargeStatus(state, currentMember.id, params.id, body.status)),
  route('GET', '/api/reports/attendance', false, false, ({ state, query }) => summarizeAttendance(state, query.get('clubTuesdayId') ?? getCurrentTuesday(state).id)),
  route('GET', '/api/reports/drinks', false, false, ({ state, currentMember, query }) => getReports(state, currentMember.id, query.get('month') ?? state.nowIso.slice(0, 7)).drinks),
  route('GET', '/api/reports/charges', false, false, ({ state, currentMember, query }) => getReports(state, currentMember.id, query.get('month') ?? state.nowIso.slice(0, 7)).charges),
  route('GET', '/api/reports/charges/by-member', false, false, ({ state, currentMember, query }) => getChargeReportByMember(state, currentMember.id, query.get('month') ?? state.nowIso.slice(0, 7))),
  route('GET', '/api/reports/pool', false, false, ({ state, currentMember, query }) => getReports(state, currentMember.id, query.get('month') ?? state.nowIso.slice(0, 7)).pool)
];

function route(method, pattern, isPublic, mutates, handler) {
  const keys = [];
  const regex = new RegExp(`^${pattern.replace(/:[^/]+/g, (match) => {
    keys.push(match.slice(1));
    return '([^/]+)';
  })}$`);
  return { method, pattern, regex, keys, public: isPublic, mutates, handler };
}

function matchRoute(method, pathname) {
  for (const routeDefinition of ROUTES) {
    if (routeDefinition.method !== method) continue;
    const match = pathname.match(routeDefinition.regex);
    if (!match) continue;
    return {
      ...routeDefinition,
      params: Object.fromEntries(routeDefinition.keys.map((key, index) => [key, decodeURIComponent(match[index + 1])]))
    };
  }
  return null;
}

async function loginByPhoneHash(state, phone) {
  const hash = await hashPhone(phone);
  const member = state.members.find((item) => item.phoneHash === hash);
  if (!member) throw httpError('Telefone cadastrado nao encontrado. Procure um administrador.', 401);
  if (!member.isActive) throw httpError('Membro inativo. Procure um administrador.', 403);
  const session = {
    id: state.counters.sessions++,
    token: `session-${member.id}-${Date.now()}-${state.counters.sessions}`,
    memberId: member.id,
    createdAt: new Date().toISOString()
  };
  state.sessions.push(session);
  saveClientState(state);
  return { member, token: session.token };
}

function requireAuth(state) {
  const member = getSessionMember(state, localStorage.getItem('cdt_token'));
  if (!member) throw httpError('Sessao invalida.', 401);
  return member;
}

async function prepareMemberPayload(state, data, ignoredMemberId = null) {
  const phoneHash = await hashPhone(data.phone);
  const duplicate = state.members.find((member) => (
    member.id !== ignoredMemberId &&
    member.isActive &&
    data.isActive !== false &&
    member.phoneHash === phoneHash
  ));
  if (duplicate) throw httpError('Ja existe um membro ativo com este telefone.', 409);
  return {
    phoneHash,
    phoneMasked: maskPhone(data.phone),
    domain: { ...data, phone: normalizePhone(data.phone) }
  };
}

function applyPhoneCrypto(member, prepared) {
  member.phoneHash = prepared.phoneHash;
  member.phone = prepared.phoneMasked;
}

async function sanitizeState(rawState) {
  const state = clone(rawState);
  for (const member of state.members || []) {
    if (!member.phoneHash && member.phone) {
      member.phoneHash = await hashPhone(member.phone);
    }
    member.phone = maskPhone(member.phone);
  }
  state.sessions ??= [];
  state.counters ??= {};
  state.counters.sessions ??= 1;
  return state;
}

async function hashPhone(phone) {
  const normalized = normalizePhone(phone);
  const data = new TextEncoder().encode(`${PHONE_HASH_SALT}:${normalized}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function maskPhone(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return '';
  return `***${normalized.slice(-4)}`;
}

function normalizePhone(phone) {
  return String(phone ?? '').replace(/\D/g, '');
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
