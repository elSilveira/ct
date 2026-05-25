import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createInitialState,
  loginByPhone,
  getCurrentTuesday,
  listClubTuesdays,
  upsertAttendance,
  summarizeAttendance,
  createCharge,
  listChargesForUser,
  getChargeReportByMember,
  setChargeStatus,
  addDrink,
  updateDrink,
  removeDrink,
  listDrinkRowsForTuesday,
  getMonthlyDrinkReport,
  createPoolMatch,
  updatePoolMatch,
  removePoolMatch,
  submitPoolResult,
  approvePoolMatch,
  listWeeklyPoolMatches,
  getPoolRanking,
  createDinnerTeam,
  getDinnerTeamForTuesday,
  createNotice,
  listActiveNotices,
  createMember
} from '../src/domain/model.js';

test('login accepts only active registered members by phone', () => {
  const state = createInitialState('2026-05-25T12:00:00.000Z');

  const admin = loginByPhone(state, '(54) 99999-0001');
  assert.equal(admin.member.name, 'Eduardo');
  assert.equal(admin.member.role, 'admin');

  assert.throws(() => loginByPhone(state, '54900000000'), /telefone cadastrado/i);

  const inactive = createMember(state, state.seed.admin.id, {
    name: 'Inativo',
    phone: '54999990009',
    role: 'member',
    isActive: false
  });
  assert.throws(() => loginByPhone(state, inactive.phone), /inativo/i);
});

test('current Tuesday resolves to today when today is Tuesday and otherwise the next Tuesday', () => {
  const mondayState = createInitialState('2026-05-25T12:00:00.000Z');
  assert.equal(getCurrentTuesday(mondayState).date, '2026-05-26');

  const tuesdayState = createInitialState('2026-05-26T12:00:00.000Z');
  assert.equal(getCurrentTuesday(tuesdayState).date, '2026-05-26');
});

test('club Tuesdays are generated for at least one year so dinner teams can be scheduled ahead', () => {
  const state = createInitialState('2026-05-25T12:00:00.000Z');

  const tuesdays = listClubTuesdays(state, { monthsAhead: 12 });

  assert.equal(tuesdays[0].date, '2026-05-26');
  assert.ok(tuesdays.length >= 52);
  assert.ok(tuesdays.some((tuesday) => tuesday.date >= '2027-05-18'));
});

test('attendance is unique per member and Tuesday, forbids negative guests, and summarizes totals', () => {
  const state = createInitialState('2026-05-25T12:00:00.000Z');
  const tuesday = getCurrentTuesday(state);
  const member = state.seed.member;

  const first = upsertAttendance(state, member.id, {
    clubTuesdayId: tuesday.id,
    status: 'dinner',
    dinnerGuests: 1,
    footballGuests: 0
  });
  const second = upsertAttendance(state, member.id, {
    clubTuesdayId: tuesday.id,
    status: 'dinner_and_football',
    dinnerGuests: 2,
    footballGuests: 3
  });

  assert.equal(first.id, second.id);
  assert.equal(state.attendance.length, 1);
  assert.throws(
    () => upsertAttendance(state, member.id, {
      clubTuesdayId: tuesday.id,
      status: 'football',
      dinnerGuests: -1,
      footballGuests: 0
    }),
    /negativa/i
  );

  const summary = summarizeAttendance(state, tuesday.id);
  assert.deepEqual(summary, {
    dinnerMembers: 1,
    footballMembers: 1,
    dinnerGuests: 2,
    footballGuests: 3,
    totalDinner: 3,
    totalFootball: 4
  });
});

test('charges are visible only to owners unless the user is admin or accountant', () => {
  const state = createInitialState('2026-05-25T12:00:00.000Z');
  const admin = state.seed.admin;
  const accountant = state.seed.accountant;
  const member = state.seed.member;
  const player = state.seed.player;

  const charge = createCharge(state, admin.id, {
    memberId: member.id,
    title: 'Mensalidade',
    amount: 90,
    month: '2026-06',
    type: 'monthly_fee'
  });
  assert.equal(charge.dueDate, '2026-06-02');

  assert.equal(listChargesForUser(state, member.id).length, 1);
  assert.equal(listChargesForUser(state, player.id).length, 0);
  assert.equal(listChargesForUser(state, admin.id).length, 1);
  assert.equal(listChargesForUser(state, accountant.id).length, 1);
  assert.throws(() => createCharge(state, member.id, {
    memberId: player.id,
    title: 'Multa',
    amount: 20
  }), /permissao/i);
  assert.throws(() => createCharge(state, admin.id, {
    memberId: player.id,
    title: 'Valor invalido',
    amount: 0
  }), /positivo/i);

  setChargeStatus(state, accountant.id, charge.id, 'paid');
  assert.equal(listChargesForUser(state, member.id, { pendingOnly: true }).length, 0);

  const report = getChargeReportByMember(state, admin.id, '2026-06');
  assert.equal(report.byMember[member.id].paid, 90);
});

test('drinks require admin, accountant, or dinner team member and aggregate day rows by person', () => {
  const state = createInitialState('2026-05-25T12:00:00.000Z');
  const tuesday = getCurrentTuesday(state);
  const admin = state.seed.admin;
  const member = state.seed.member;
  const player = state.seed.player;

  createDinnerTeam(state, admin.id, {
    clubTuesdayId: tuesday.id,
    memberIds: [member.id],
    notes: 'Responsavel pelas bebidas'
  });

  const water = addDrink(state, admin.id, {
    clubTuesdayId: tuesday.id,
    memberId: member.id,
    drinkType: 'water_soda',
    quantity: 2
  });
  updateDrink(state, member.id, water.id, { quantity: 4 });
  removeDrink(state, member.id, water.id);
  addDrink(state, member.id, {
    clubTuesdayId: tuesday.id,
    memberId: member.id,
    drinkType: 'beer',
    quantity: 3
  });

  assert.deepEqual(state.drinkLogs.map((log) => log.action), ['added', 'updated', 'removed', 'added']);
  assert.throws(() => addDrink(state, player.id, {
    clubTuesdayId: tuesday.id,
    memberId: player.id,
    drinkType: 'beer',
    quantity: 1
  }), /permissao/i);
  assert.throws(() => updateDrink(state, admin.id, water.id, { quantity: -1 }), /negativa/i);

  const rows = listDrinkRowsForTuesday(state, admin.id, tuesday.id);
  assert.equal(rows.find((row) => row.member.id === member.id).beer.quantity, 3);
  assert.equal(rows.find((row) => row.member.id === member.id).water_soda.quantity, 0);

  const report = getMonthlyDrinkReport(state, '2026-05');
  assert.equal(report.totals.water_soda, 0);
  assert.equal(report.totals.beer, 3);
  assert.equal(report.byMember[member.id].beer, 3);
});

test('pool ranking uses confirmed matches only, counts zero-point games, and protects player submissions', () => {
  const state = createInitialState('2026-05-25T12:00:00.000Z');
  const admin = state.seed.admin;
  const player = state.seed.player;
  const outsider = state.seed.member;
  const championship = state.seed.championship;
  const teamA = state.seed.teamA;
  const teamB = state.seed.teamB;

  const adminMatch = createPoolMatch(state, admin.id, {
    championshipId: championship.id,
    clubTuesdayId: getCurrentTuesday(state).id,
    teamAId: teamA.id,
    teamBId: teamB.id
  });
  submitPoolResult(state, admin.id, adminMatch.id, { teamAPoints: 0, teamBPoints: 2 });

  const pendingMatch = createPoolMatch(state, admin.id, {
    championshipId: championship.id,
    clubTuesdayId: getCurrentTuesday(state).id,
    teamAId: teamA.id,
    teamBId: teamB.id
  });
  submitPoolResult(state, player.id, pendingMatch.id, { teamAPoints: 2, teamBPoints: 1 });

  assert.throws(() => submitPoolResult(state, outsider.id, pendingMatch.id, {
    teamAPoints: 1,
    teamBPoints: 2
  }), /participa/i);

  let ranking = getPoolRanking(state, championship.id);
  assert.equal(ranking.find((row) => row.teamId === teamA.id).games, 1);
  assert.equal(ranking.find((row) => row.teamId === teamA.id).points, 0);
  assert.equal(ranking.find((row) => row.teamId === teamB.id).points, 2);

  approvePoolMatch(state, admin.id, pendingMatch.id);
  ranking = getPoolRanking(state, championship.id);
  assert.equal(ranking.find((row) => row.teamId === teamA.id).games, 2);
  assert.equal(ranking.find((row) => row.teamId === teamA.id).points, 2);
});

test('weekly pool matches appear only while scheduled/open and can be changed or removed', () => {
  const state = createInitialState('2026-05-25T12:00:00.000Z');
  const admin = state.seed.admin;
  const championship = state.seed.championship;
  const tuesday = getCurrentTuesday(state);
  const teamA = state.seed.teamA;
  const teamB = state.seed.teamB;

  const match = createPoolMatch(state, admin.id, {
    championshipId: championship.id,
    clubTuesdayId: tuesday.id,
    teamAId: teamA.id,
    teamBId: teamB.id
  });

  assert.equal(listWeeklyPoolMatches(state, tuesday.id).length, 1);

  updatePoolMatch(state, admin.id, match.id, { teamAId: teamB.id, teamBId: teamA.id });
  assert.equal(listWeeklyPoolMatches(state, tuesday.id)[0].teamAId, teamB.id);

  submitPoolResult(state, admin.id, match.id, { teamAPoints: 2, teamBPoints: 0 });
  assert.equal(listWeeklyPoolMatches(state, tuesday.id).length, 0);

  const second = createPoolMatch(state, admin.id, {
    championshipId: championship.id,
    clubTuesdayId: tuesday.id,
    teamAId: teamA.id,
    teamBId: teamB.id
  });
  removePoolMatch(state, admin.id, second.id);
  assert.equal(listWeeklyPoolMatches(state, tuesday.id).length, 0);
});

test('dinner teams and notices are tied to Tuesdays and visible on home rules', () => {
  const state = createInitialState('2026-05-25T12:00:00.000Z');
  const tuesday = getCurrentTuesday(state);
  const admin = state.seed.admin;
  const member = state.seed.member;

  createDinnerTeam(state, admin.id, {
    clubTuesdayId: tuesday.id,
    memberIds: [member.id, admin.id],
    notes: 'Trazer sobremesa'
  });

  const dinnerTeam = getDinnerTeamForTuesday(state, tuesday.id, member.id);
  assert.equal(dinnerTeam.isCurrentUserScheduled, true);
  assert.equal(dinnerTeam.members.length, 2);

  createNotice(state, admin.id, {
    title: 'Janta confirmada',
    message: 'Chegar ate 20h.',
    priority: 'urgent',
    status: 'active',
    clubTuesdayId: tuesday.id,
    startsAt: '2026-05-01T00:00:00.000Z',
    expiresAt: '2026-05-27T00:00:00.000Z'
  });
  createNotice(state, admin.id, {
    title: 'Aviso expirado',
    message: 'Nao deve aparecer.',
    priority: 'high',
    status: 'active',
    expiresAt: '2026-05-02T00:00:00.000Z'
  });

  const notices = listActiveNotices(state, tuesday.id, '2026-05-25T12:00:00.000Z');
  assert.equal(notices.length, 1);
  assert.equal(notices[0].title, 'Janta confirmada');
});
