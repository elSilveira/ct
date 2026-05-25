import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

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
  loginByPhone,
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
} from '../domain/model.js';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8'
};

export function createHttpServer({ state = createInitialState(), persist = false, saveState = async () => {}, staticRoot = 'public' } = {}) {
  async function persistIfNeeded() {
    if (persist) {
      await saveState(state);
    }
  }

  return createServer(async (request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (request.method === 'OPTIONS') {
        return sendJson(response, 204, null);
      }
      if (!url.pathname.startsWith('/api/')) {
        return serveStatic(response, staticRoot, url.pathname);
      }

      const body = await readJsonBody(request);
      const route = matchRoute(request.method, url.pathname);
      if (!route) {
        throw httpError('Rota nao encontrada.', 404);
      }

      const isPublic = route.public === true;
      const currentMember = isPublic ? null : requireAuth(state, request);
      const result = await route.handler({
        state,
        body,
        params: route.params,
        query: url.searchParams,
        currentMember,
        request
      });

      if (route.mutates) {
        await persistIfNeeded();
      }
      return sendJson(response, 200, result);
    } catch (error) {
      return sendJson(response, error.statusCode ?? 500, {
        error: error.statusCode ? error.message : 'Erro interno do servidor.'
      });
    }
  });
}

const ROUTES = [
  route('POST', '/api/auth/login', true, true, ({ state, body }) => loginByPhone(state, body.phone)),
  route('POST', '/api/auth/logout', false, true, ({ state, request }) => ({ loggedOut: logout(state, readBearerToken(request)) })),
  route('GET', '/api/auth/me', false, false, ({ currentMember }) => currentMember),
  route('GET', '/api/home', false, false, ({ state, currentMember }) => getHomeData(state, currentMember.id)),

  route('GET', '/api/members', false, false, ({ state, currentMember, query }) => listMembers(state, currentMember.id, {
    includeInactive: query.get('includeInactive') === 'true',
    all: query.get('all') === 'true'
  })),
  route('POST', '/api/members', false, true, ({ state, currentMember, body }) => createMember(state, currentMember.id, body)),
  route('GET', '/api/members/:id', false, false, ({ state, params }) => state.members.find((member) => member.id === Number(params.id)) ?? null),
  route('PUT', '/api/members/:id', false, true, ({ state, currentMember, params, body }) => updateMember(state, currentMember.id, params.id, body)),
  route('PATCH', '/api/members/:id/status', false, true, ({ state, currentMember, params, body }) => updateMember(state, currentMember.id, params.id, { isActive: body.isActive })),

  route('GET', '/api/club-tuesdays', false, true, ({ state, query }) => listClubTuesdays(state, {
    monthsAhead: query.get('monthsAhead') ? Number(query.get('monthsAhead')) : 12
  })),
  route('GET', '/api/club-tuesdays/current', false, false, ({ state }) => getCurrentTuesday(state)),
  route('POST', '/api/club-tuesdays', false, true, ({ state, currentMember, body }) => {
    const exists = state.clubTuesdays.find((item) => item.date === body.date);
    if (exists) return exists;
    if (currentMember.role !== 'admin') throw httpError('Sem permissao de administrador.', 403);
    const tuesday = {
      id: state.counters.clubTuesdays++,
      date: body.date,
      status: body.status ?? 'open',
      createdAt: state.nowIso,
      updatedAt: state.nowIso
    };
    state.clubTuesdays.push(tuesday);
    return tuesday;
  }),
  route('PATCH', '/api/club-tuesdays/:id/status', false, true, ({ state, currentMember, params, body }) => setTuesdayStatus(state, currentMember.id, params.id, body.status)),

  route('GET', '/api/attendance/:clubTuesdayId', false, false, ({ state, currentMember, params }) => ({
    rows: listAttendanceForTuesday(state, currentMember.id, params.clubTuesdayId),
    summary: summarizeAttendance(state, params.clubTuesdayId)
  })),
  route('POST', '/api/attendance', false, true, ({ state, currentMember, body }) => upsertAttendance(state, currentMember.id, body)),
  route('PUT', '/api/attendance/:id', false, true, ({ state, currentMember, params, body }) => {
    const existing = state.attendance.find((item) => item.id === Number(params.id));
    if (!existing) throw httpError('Presenca nao encontrada.', 404);
    return upsertAttendance(state, currentMember.id, { ...existing, ...body, memberId: existing.memberId });
  }),

  route('GET', '/api/notices/active', false, false, ({ state, query }) => listActiveNotices(state, query.get('clubTuesdayId'))),
  route('GET', '/api/notices', false, false, ({ state }) => state.notices),
  route('POST', '/api/notices', false, true, ({ state, currentMember, body }) => createNotice(state, currentMember.id, body)),
  route('PUT', '/api/notices/:id', false, true, ({ state, currentMember, params, body }) => updateNotice(state, currentMember.id, params.id, body)),
  route('PATCH', '/api/notices/:id/status', false, true, ({ state, currentMember, params, body }) => updateNotice(state, currentMember.id, params.id, { status: body.status })),

  route('GET', '/api/dinner-teams/:clubTuesdayId', false, false, ({ state, currentMember, params }) => getDinnerTeamForTuesday(state, params.clubTuesdayId, currentMember.id)),
  route('POST', '/api/dinner-teams', false, true, ({ state, currentMember, body }) => createDinnerTeam(state, currentMember.id, body)),
  route('PUT', '/api/dinner-teams/:id', false, true, ({ state, currentMember, params, body }) => {
    const existing = state.dinnerTeams.find((item) => item.id === Number(params.id));
    if (!existing) throw httpError('Escala nao encontrada.', 404);
    return createDinnerTeam(state, currentMember.id, { ...existing, ...body, clubTuesdayId: existing.clubTuesdayId });
  }),

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

function requireAuth(state, request) {
  const token = readBearerToken(request);
  if (!token) {
    throw httpError('Autenticacao obrigatoria.', 401);
  }
  const member = getSessionMember(state, token);
  if (!member) {
    throw httpError('Sessao invalida.', 401);
  }
  return member;
}

function readBearerToken(request) {
  const header = request.headers.authorization ?? '';
  return header.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
}

async function readJsonBody(request) {
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
    return {};
  }
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  if (!raw) {
    return {};
  }
  try {
    return JSON.parse(raw);
  } catch {
    throw httpError('JSON invalido.', 400);
  }
}

async function serveStatic(response, staticRoot, pathname) {
  const safePath = normalize(pathname === '/' ? '/index.html' : pathname).replace(/^(\.\.[/\\])+/, '');
  const filePath = join(process.cwd(), staticRoot, safePath);
  const rootPath = join(process.cwd(), staticRoot);
  if (!filePath.startsWith(rootPath)) {
    return sendJson(response, 403, { error: 'Acesso negado.' });
  }
  try {
    const bytes = await readFile(filePath);
    response.writeHead(200, {
      'content-type': MIME_TYPES[extname(filePath)] ?? 'application/octet-stream',
      'cache-control': 'no-store'
    });
    response.end(bytes);
  } catch {
    const indexPath = join(process.cwd(), staticRoot, 'index.html');
    try {
      const bytes = await readFile(indexPath);
      response.writeHead(200, { 'content-type': MIME_TYPES['.html'], 'cache-control': 'no-store' });
      response.end(bytes);
    } catch {
      sendJson(response, 404, { error: 'Arquivo nao encontrado.' });
    }
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
    'access-control-allow-headers': 'content-type,authorization',
    'cache-control': 'no-store'
  });
  response.end(statusCode === 204 ? '' : JSON.stringify(payload));
}

function httpError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
