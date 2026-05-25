import test from 'node:test';
import assert from 'node:assert/strict';

import { createHttpServer } from '../src/server/app.js';
import { createInitialState } from '../src/domain/model.js';
import { protectStatePhones } from '../src/server/phone-privacy.js';

async function withServer(run) {
  const state = createInitialState('2026-05-25T12:00:00.000Z');
  const server = createHttpServer({ state, persist: false });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    await run({ baseUrl: `http://127.0.0.1:${port}`, state });
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
}

async function request(baseUrl, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      'content-type': 'application/json',
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers ?? {})
    },
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json();
  return { response, payload };
}

test('API logs in by phone and blocks protected routes without a token', async () => {
  await withServer(async ({ baseUrl }) => {
    const denied = await request(baseUrl, '/api/home');
    assert.equal(denied.response.status, 401);

    const login = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { phone: '(54) 99999-0001' }
    });
    assert.equal(login.response.status, 200);
    assert.equal(login.payload.member.role, 'admin');
    assert.match(login.payload.token, /^session-/);

    const home = await request(baseUrl, '/api/home', { token: login.payload.token });
    assert.equal(home.response.status, 200);
    assert.equal(home.payload.member.name, 'Eduardo');
    assert.equal(home.payload.tuesday.date, '2026-05-26');
  });
});

test('API logs in when persisted state only has masked phones and phone hashes', async () => {
  const state = protectStatePhones(createInitialState('2026-05-25T12:00:00.000Z'));
  const server = createHttpServer({ state, persist: false });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  try {
    const login = await request(`http://127.0.0.1:${port}`, '/api/auth/login', {
      method: 'POST',
      body: { phone: '54999990001' }
    });

    assert.equal(login.response.status, 200);
    assert.equal(login.payload.member.phone, '***0001');
    assert.match(login.payload.member.phoneHash, /^[a-f0-9]{64}$/);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('API persists attendance updates through the protected endpoint', async () => {
  await withServer(async ({ baseUrl }) => {
    const login = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { phone: '54999990003' }
    });
    const current = await request(baseUrl, '/api/club-tuesdays/current', { token: login.payload.token });

    const attendance = await request(baseUrl, '/api/attendance', {
      method: 'POST',
      token: login.payload.token,
      body: {
        clubTuesdayId: current.payload.id,
        status: 'dinner_and_football',
        dinnerGuests: 1,
        footballGuests: 2
      }
    });
    assert.equal(attendance.response.status, 200);
    assert.equal(attendance.payload.dinnerGuests, 1);

    const home = await request(baseUrl, '/api/home', { token: login.payload.token });
    assert.equal(home.payload.attendance.status, 'dinner_and_football');
    assert.equal(home.payload.attendanceSummary.totalDinner, 2);
    assert.equal(home.payload.attendanceSummary.totalFootball, 3);
  });
});

test('API exposes future dinner dates, drink rows, and weekly pool match management', async () => {
  await withServer(async ({ baseUrl }) => {
    const login = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { phone: '54999990001' }
    });
    const token = login.payload.token;

    const tuesdays = await request(baseUrl, '/api/club-tuesdays?monthsAhead=12', { token });
    assert.equal(tuesdays.response.status, 200);
    assert.ok(tuesdays.payload.length >= 52);

    const current = tuesdays.payload[0];
    const dinner = await request(baseUrl, '/api/dinner-teams', {
      method: 'POST',
      token,
      body: { clubTuesdayId: current.id, memberIds: [3], notes: 'Bebidas' }
    });
    assert.equal(dinner.response.status, 200);

    const memberLogin = await request(baseUrl, '/api/auth/login', {
      method: 'POST',
      body: { phone: '54999990003' }
    });
    const drink = await request(baseUrl, '/api/drinks', {
      method: 'POST',
      token: memberLogin.payload.token,
      body: { clubTuesdayId: current.id, memberId: 3, drinkType: 'beer', quantity: 1 }
    });
    assert.equal(drink.response.status, 200);

    const rows = await request(baseUrl, `/api/drinks/rows/${current.id}`, { token });
    assert.equal(rows.payload.find((row) => row.member.id === 3).beer.quantity, 1);

    const memberHome = await request(baseUrl, '/api/home', { token: memberLogin.payload.token });
    assert.equal(memberHome.payload.ownDrinks.water_soda, 0);
    assert.equal(memberHome.payload.ownDrinks.beer, 1);

    const match = await request(baseUrl, '/api/pool/matches', {
      method: 'POST',
      token,
      body: { championshipId: 1, clubTuesdayId: current.id, teamAId: 1, teamBId: 2 }
    });
    assert.equal(match.response.status, 200);

    const weekly = await request(baseUrl, `/api/pool/weekly/${current.id}`, { token });
    assert.equal(weekly.payload.length, 1);

    const removed = await request(baseUrl, `/api/pool/matches/${match.payload.id}`, {
      method: 'DELETE',
      token
    });
    assert.equal(removed.payload.status, 'cancelled');

    const team = await request(baseUrl, '/api/pool/teams', {
      method: 'POST',
      token,
      body: { championshipId: 1, playerOneId: 1, playerTwoId: 4, name: 'Eduardo & Ledir 2' }
    });
    assert.equal(team.response.status, 200);

    const teamRemoved = await request(baseUrl, `/api/pool/teams/${team.payload.id}`, {
      method: 'DELETE',
      token
    });
    assert.equal(teamRemoved.response.status, 200);
    assert.equal(teamRemoved.payload.isActive, false);

    const activeTeams = await request(baseUrl, '/api/pool/teams', { token });
    assert.equal(activeTeams.payload.some((item) => item.id === team.payload.id), false);
  });
});
