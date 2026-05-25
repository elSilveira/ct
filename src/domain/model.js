const ROLES = new Set(['member', 'player', 'admin', 'accountant']);
const TUESDAY_STATUS = new Set(['open', 'closed', 'archived']);
const ATTENDANCE_STATUS = new Set(['dinner', 'football', 'dinner_and_football', 'not_going']);
const DRINK_TYPES = new Set(['water_soda', 'beer']);
const CHARGE_STATUS = new Set(['pending', 'paid', 'cancelled', 'overdue']);
const NOTICE_PRIORITIES = new Set(['normal', 'high', 'urgent']);
const NOTICE_STATUS = new Set(['active', 'inactive']);

export function createInitialState(nowIso = new Date().toISOString()) {
  const state = {
    nowIso,
    counters: {
      members: 1,
      clubTuesdays: 1,
      attendance: 1,
      charges: 1,
      drinks: 1,
      drinkLogs: 1,
      poolChampionships: 1,
      poolTeams: 1,
      poolMatches: 1,
      dinnerTeams: 1,
      notices: 1,
      sessions: 1
    },
    members: [],
    clubTuesdays: [],
    attendance: [],
    charges: [],
    drinks: [],
    drinkLogs: [],
    poolChampionships: [],
    poolTeams: [],
    poolMatches: [],
    dinnerTeams: [],
    notices: [],
    sessions: []
  };

  const admin = seedMember(state, {
    name: 'Eduardo',
    phone: '54999990001',
    birthDate: '1984-05-10',
    role: 'admin',
    isActive: true,
    playsPool: true,
    notes: 'Administrador inicial'
  });
  const accountant = seedMember(state, {
    name: 'Contador',
    phone: '54999990002',
    birthDate: '1978-08-15',
    role: 'accountant',
    isActive: true,
    playsPool: false,
    notes: 'Acesso financeiro'
  });
  const member = seedMember(state, {
    name: 'Samuel',
    phone: '54999990003',
    birthDate: '1991-02-20',
    role: 'member',
    isActive: true,
    playsPool: false,
    notes: ''
  });
  const player = seedMember(state, {
    name: 'Ledir',
    phone: '54999990004',
    birthDate: '1989-11-01',
    role: 'player',
    isActive: true,
    playsPool: true,
    notes: ''
  });
  const playerTwo = seedMember(state, {
    name: 'Tille',
    phone: '54999990005',
    birthDate: '1988-03-12',
    role: 'player',
    isActive: true,
    playsPool: true,
    notes: ''
  });
  const playerThree = seedMember(state, {
    name: 'Sonir',
    phone: '54999990006',
    birthDate: '1982-09-22',
    role: 'player',
    isActive: true,
    playsPool: true,
    notes: ''
  });

  const currentTuesday = getCurrentTuesday(state);
  const championship = pushWithId(state, 'poolChampionships', {
    name: 'Campeonato Clube das Tercas 2026',
    status: 'active',
    startDate: currentTuesday.date,
    endDate: null
  });
  const teamA = pushWithId(state, 'poolTeams', {
    championshipId: championship.id,
    playerOneId: player.id,
    playerTwoId: admin.id,
    name: 'Ledir & Eduardo',
    isActive: true
  });
  const teamB = pushWithId(state, 'poolTeams', {
    championshipId: championship.id,
    playerOneId: playerTwo.id,
    playerTwoId: playerThree.id,
    name: 'Tille & Sonir',
    isActive: true
  });

  state.seed = { admin, accountant, member, player, playerTwo, playerThree, currentTuesday, championship, teamA, teamB };
  return state;
}

export function normalizePhone(phone) {
  return String(phone ?? '').replace(/\D/g, '');
}

export function loginByPhone(state, phone) {
  const normalized = normalizePhone(phone);
  const member = state.members.find((item) => normalizePhone(item.phone) === normalized);
  if (!member) {
    throw userError('Telefone cadastrado nao encontrado. Procure um administrador.', 401);
  }
  if (!member.isActive) {
    throw userError('Membro inativo. Procure um administrador.', 403);
  }
  const session = pushWithId(state, 'sessions', {
    token: `session-${member.id}-${Date.now()}-${state.counters.sessions}`,
    memberId: member.id,
    createdAt: now(state)
  });
  return { member, token: session.token };
}

export function logout(state, token) {
  const before = state.sessions.length;
  state.sessions = state.sessions.filter((session) => session.token !== token);
  return before !== state.sessions.length;
}

export function getSessionMember(state, token) {
  const session = state.sessions.find((item) => item.token === token);
  if (!session) {
    return null;
  }
  return findById(state.members, session.memberId) ?? null;
}

export function createMember(state, actorId, data) {
  requireAdmin(state, actorId);
  validateRole(data.role ?? 'member');
  validatePhone(data.phone);
  const active = data.isActive ?? true;
  const duplicate = state.members.find((member) => (
    member.isActive &&
    active &&
    normalizePhone(member.phone) === normalizePhone(data.phone)
  ));
  if (duplicate) {
    throw userError('Ja existe um membro ativo com este telefone.', 409);
  }
  return pushWithId(state, 'members', {
    name: requireText(data.name, 'Nome'),
    phone: normalizePhone(data.phone),
    birthDate: data.birthDate ?? null,
    role: data.role ?? 'member',
    isActive: active,
    playsPool: Boolean(data.playsPool ?? data.role === 'player'),
    notes: data.notes ?? ''
  });
}

export function updateMember(state, actorId, memberId, data) {
  const actor = requireMember(state, actorId);
  const member = requireExisting(state.members, memberId, 'Membro');
  const isSelfAllowed = actor.id === member.id && onlySelfProfileFields(data);
  if (actor.role !== 'admin' && !isSelfAllowed) {
    throw userError('Sem permissao para editar membro.', 403);
  }
  if (data.phone !== undefined) {
    validatePhone(data.phone);
    const duplicate = state.members.find((item) => (
      item.id !== member.id &&
      item.isActive &&
      (data.isActive ?? member.isActive) &&
      normalizePhone(item.phone) === normalizePhone(data.phone)
    ));
    if (duplicate) {
      throw userError('Ja existe um membro ativo com este telefone.', 409);
    }
    member.phone = normalizePhone(data.phone);
  }
  if (data.name !== undefined && actor.role === 'admin') member.name = requireText(data.name, 'Nome');
  if (data.birthDate !== undefined) member.birthDate = data.birthDate || null;
  if (data.role !== undefined && actor.role === 'admin') {
    validateRole(data.role);
    member.role = data.role;
  }
  if (data.isActive !== undefined && actor.role === 'admin') member.isActive = Boolean(data.isActive);
  if (data.playsPool !== undefined && actor.role === 'admin') member.playsPool = Boolean(data.playsPool);
  if (data.notes !== undefined && actor.role === 'admin') member.notes = data.notes;
  member.updatedAt = now(state);
  return member;
}

export function listMembers(state, actorId, options = {}) {
  const actor = requireMember(state, actorId);
  const canSeeAll = ['admin', 'accountant'].includes(actor.role);
  if (!canSeeAll && options.all) {
    throw userError('Sem permissao para listar todos os membros.', 403);
  }
  return state.members.filter((member) => options.includeInactive || member.isActive);
}

export function getCurrentTuesday(state, referenceIso = state.nowIso) {
  const date = nextTuesdayDate(referenceIso);
  let tuesday = state.clubTuesdays.find((item) => item.date === date);
  if (!tuesday) {
    tuesday = pushWithId(state, 'clubTuesdays', { date, status: 'open' });
  }
  return tuesday;
}

export function setTuesdayStatus(state, actorId, clubTuesdayId, status) {
  requireAdmin(state, actorId);
  if (!TUESDAY_STATUS.has(status)) {
    throw userError('Status de terca-feira invalido.', 400);
  }
  const tuesday = requireExisting(state.clubTuesdays, clubTuesdayId, 'Terca-feira');
  tuesday.status = status;
  tuesday.updatedAt = now(state);
  return tuesday;
}

export function listClubTuesdays(state, options = {}) {
  ensureFutureTuesdays(state, Number(options.monthsAhead ?? 12));
  return [...state.clubTuesdays].sort((a, b) => a.date.localeCompare(b.date));
}

export function upsertAttendance(state, actorId, data) {
  const actor = requireMember(state, actorId);
  const memberId = Number(data.memberId ?? actor.id);
  if (memberId !== actor.id && actor.role !== 'admin') {
    throw userError('Sem permissao para alterar presenca de outro membro.', 403);
  }
  const tuesday = requireExisting(state.clubTuesdays, data.clubTuesdayId, 'Terca-feira');
  if (tuesday.status !== 'open') {
    throw userError('Esta terca-feira nao esta aberta para alteracoes.', 409);
  }
  if (!ATTENDANCE_STATUS.has(data.status)) {
    throw userError('Status de presenca invalido.', 400);
  }
  const dinnerGuests = nonNegativeInt(data.dinnerGuests ?? 0, 'Convidados da janta');
  const footballGuests = nonNegativeInt(data.footballGuests ?? 0, 'Convidados do futebol');
  let attendance = state.attendance.find((item) => (
    item.clubTuesdayId === Number(data.clubTuesdayId) &&
    item.memberId === memberId
  ));
  if (!attendance) {
    attendance = pushWithId(state, 'attendance', {
      clubTuesdayId: Number(data.clubTuesdayId),
      memberId,
      status: data.status,
      dinnerGuests,
      footballGuests
    });
  } else {
    attendance.status = data.status;
    attendance.dinnerGuests = dinnerGuests;
    attendance.footballGuests = footballGuests;
    attendance.updatedAt = now(state);
  }
  return attendance;
}

export function listAttendanceForTuesday(state, actorId, clubTuesdayId) {
  const actor = requireMember(state, actorId);
  if (!['admin', 'accountant'].includes(actor.role)) {
    throw userError('Sem permissao para ver a lista geral de presenca.', 403);
  }
  return state.attendance
    .filter((item) => item.clubTuesdayId === Number(clubTuesdayId))
    .map((item) => ({ ...item, member: findById(state.members, item.memberId) }));
}

export function summarizeAttendance(state, clubTuesdayId) {
  const rows = state.attendance.filter((item) => item.clubTuesdayId === Number(clubTuesdayId));
  const summary = {
    dinnerMembers: 0,
    footballMembers: 0,
    dinnerGuests: 0,
    footballGuests: 0,
    totalDinner: 0,
    totalFootball: 0
  };
  for (const row of rows) {
    if (['dinner', 'dinner_and_football'].includes(row.status)) summary.dinnerMembers += 1;
    if (['football', 'dinner_and_football'].includes(row.status)) summary.footballMembers += 1;
    summary.dinnerGuests += row.dinnerGuests;
    summary.footballGuests += row.footballGuests;
  }
  summary.totalDinner = summary.dinnerMembers + summary.dinnerGuests;
  summary.totalFootball = summary.footballMembers + summary.footballGuests;
  return summary;
}

export function createCharge(state, actorId, data) {
  requireFinancialManager(state, actorId);
  const amount = positiveNumber(data.amount, 'Valor');
  const member = requireExisting(state.members, data.memberId, 'Membro');
  const dueDate = firstTuesdayForCharge(data.month ?? data.dueDate ?? currentMonth(state));
  return pushWithId(state, 'charges', {
    memberId: member.id,
    title: requireText(data.title, 'Titulo'),
    description: data.description ?? '',
    amount,
    dueDate,
    type: data.type ?? 'other',
    status: 'pending',
    createdByMemberId: Number(actorId)
  });
}

export function updateCharge(state, actorId, chargeId, data) {
  requireFinancialManager(state, actorId);
  const charge = requireExisting(state.charges, chargeId, 'Cobranca');
  if (data.title !== undefined) charge.title = requireText(data.title, 'Titulo');
  if (data.description !== undefined) charge.description = data.description;
  if (data.amount !== undefined) charge.amount = positiveNumber(data.amount, 'Valor');
  if (data.month !== undefined || data.dueDate !== undefined) {
    charge.dueDate = firstTuesdayForCharge(data.month ?? data.dueDate);
  }
  if (data.type !== undefined) charge.type = data.type;
  charge.updatedAt = now(state);
  return charge;
}

export function setChargeStatus(state, actorId, chargeId, status) {
  requireFinancialManager(state, actorId);
  if (!CHARGE_STATUS.has(status)) {
    throw userError('Status de cobranca invalido.', 400);
  }
  const charge = requireExisting(state.charges, chargeId, 'Cobranca');
  charge.status = status;
  charge.updatedAt = now(state);
  return charge;
}

export function listChargesForUser(state, actorId, options = {}) {
  const actor = requireMember(state, actorId);
  let charges = ['admin', 'accountant'].includes(actor.role)
    ? state.charges
    : state.charges.filter((charge) => charge.memberId === actor.id);
  if (options.memberId && ['admin', 'accountant'].includes(actor.role)) {
    charges = charges.filter((charge) => charge.memberId === Number(options.memberId));
  }
  if (options.month) {
    charges = charges.filter((charge) => String(charge.dueDate ?? charge.createdAt).startsWith(options.month));
  }
  if (options.pendingOnly) {
    charges = charges.filter((charge) => charge.status === 'pending');
  }
  return charges.map((charge) => ({ ...charge, member: findById(state.members, charge.memberId) }));
}

export function getChargeReportByMember(state, actorId, month = currentMonth(state)) {
  requireFinancialManager(state, actorId);
  const rows = listChargesForUser(state, actorId, { month });
  const byMember = {};
  for (const charge of rows) {
    byMember[charge.memberId] ??= {
      member: charge.member,
      pending: 0,
      paid: 0,
      cancelled: 0,
      overdue: 0,
      total: 0
    };
    byMember[charge.memberId][charge.status] += Number(charge.amount);
    byMember[charge.memberId].total += Number(charge.amount);
  }
  return { month, byMember };
}

export function addDrink(state, actorId, data) {
  validateDrinkType(data.drinkType);
  const quantity = nonNegativeInt(data.quantity ?? 0, 'Quantidade');
  const tuesday = requireExisting(state.clubTuesdays, data.clubTuesdayId, 'Terca-feira');
  requireDrinkManager(state, actorId, tuesday.id);
  const member = requireExisting(state.members, data.memberId, 'Membro');
  const drink = pushWithId(state, 'drinks', {
    clubTuesdayId: tuesday.id,
    memberId: member.id,
    drinkType: data.drinkType,
    quantity,
    status: 'active',
    createdByMemberId: Number(actorId),
    removedByMemberId: null
  });
  logDrink(state, drink, 'added', null, quantity, actorId);
  return drink;
}

export function updateDrink(state, actorId, drinkId, data) {
  const drink = requireExisting(state.drinks, drinkId, 'Bebida');
  requireDrinkManager(state, actorId, drink.clubTuesdayId);
  const oldQuantity = drink.quantity;
  const oldType = drink.drinkType;
  if (data.drinkType !== undefined) {
    validateDrinkType(data.drinkType);
    drink.drinkType = data.drinkType;
  }
  if (data.quantity !== undefined) {
    drink.quantity = nonNegativeInt(data.quantity, 'Quantidade');
  }
  drink.updatedAt = now(state);
  logDrink(state, drink, oldType === drink.drinkType ? 'updated' : 'updated', oldQuantity, drink.quantity, actorId);
  return drink;
}

export function removeDrink(state, actorId, drinkId) {
  const drink = requireExisting(state.drinks, drinkId, 'Bebida');
  requireDrinkManager(state, actorId, drink.clubTuesdayId);
  const oldQuantity = drink.quantity;
  drink.status = 'removed';
  drink.quantity = 0;
  drink.removedByMemberId = Number(actorId);
  drink.updatedAt = now(state);
  logDrink(state, drink, 'removed', oldQuantity, 0, actorId);
  return drink;
}

export function listDrinksForTuesday(state, actorId, clubTuesdayId) {
  const actor = requireMember(state, actorId);
  const rows = state.drinks.filter((drink) => (
    drink.clubTuesdayId === Number(clubTuesdayId) &&
    (['admin', 'accountant'].includes(actor.role) || drink.memberId === actor.id)
  ));
  return rows.map((drink) => ({ ...drink, member: findById(state.members, drink.memberId) }));
}

export function listDrinkRowsForTuesday(state, actorId, clubTuesdayId) {
  const actor = requireMember(state, actorId);
  const canSeeAll = ['admin', 'accountant'].includes(actor.role) || isDinnerTeamMember(state, actor.id, clubTuesdayId);
  const members = state.members.filter((member) => member.isActive && (canSeeAll || member.id === actor.id));
  return members.map((member) => {
    const drinks = state.drinks.filter((drink) => (
      drink.clubTuesdayId === Number(clubTuesdayId) &&
      drink.memberId === member.id &&
      drink.status === 'active'
    ));
    return {
      member,
      water_soda: summarizeDrinkCell(drinks, 'water_soda'),
      beer: summarizeDrinkCell(drinks, 'beer')
    };
  });
}

export function listDrinkLogsForTuesday(state, actorId, clubTuesdayId) {
  requireDrinkManager(state, actorId, clubTuesdayId);
  return state.drinkLogs
    .filter((log) => log.clubTuesdayId === Number(clubTuesdayId))
    .map((log) => ({
      ...log,
      member: findById(state.members, log.memberId),
      performedBy: findById(state.members, log.performedByMemberId)
    }));
}

export function getMonthlyDrinkReport(state, month) {
  const totals = { water_soda: 0, beer: 0 };
  const byMember = {};
  const rows = state.drinks.filter((drink) => {
    const tuesday = findById(state.clubTuesdays, drink.clubTuesdayId);
    return drink.status === 'active' && tuesday?.date.startsWith(month);
  });
  for (const drink of rows) {
    totals[drink.drinkType] += drink.quantity;
    byMember[drink.memberId] ??= { member: findById(state.members, drink.memberId), water_soda: 0, beer: 0 };
    byMember[drink.memberId][drink.drinkType] += drink.quantity;
  }
  return { month, totals, byMember };
}

export function createPoolChampionship(state, actorId, data) {
  requireAdmin(state, actorId);
  return pushWithId(state, 'poolChampionships', {
    name: requireText(data.name, 'Nome do campeonato'),
    status: data.status ?? 'draft',
    startDate: data.startDate ?? null,
    endDate: data.endDate ?? null
  });
}

export function createPoolTeam(state, actorId, data) {
  requireAdmin(state, actorId);
  requireExisting(state.poolChampionships, data.championshipId, 'Campeonato');
  requireExisting(state.members, data.playerOneId, 'Jogador 1');
  requireExisting(state.members, data.playerTwoId, 'Jogador 2');
  return pushWithId(state, 'poolTeams', {
    championshipId: Number(data.championshipId),
    playerOneId: Number(data.playerOneId),
    playerTwoId: Number(data.playerTwoId),
    name: requireText(data.name, 'Nome da dupla'),
    isActive: data.isActive ?? true
  });
}

export function removePoolTeam(state, actorId, teamId) {
  requireAdmin(state, actorId);
  const team = requireExisting(state.poolTeams, teamId, 'Dupla');
  team.isActive = false;
  team.updatedAt = now(state);
  for (const match of state.poolMatches) {
    if (
      match.status === 'open' &&
      (match.teamAId === team.id || match.teamBId === team.id)
    ) {
      match.status = 'cancelled';
      match.updatedAt = now(state);
    }
  }
  return team;
}

export function createPoolMatch(state, actorId, data) {
  requireAdmin(state, actorId);
  const championship = requireExisting(state.poolChampionships, data.championshipId, 'Campeonato');
  const teamA = requireExisting(state.poolTeams, data.teamAId, 'Dupla A');
  const teamB = requireExisting(state.poolTeams, data.teamBId, 'Dupla B');
  requireActivePoolTeam(teamA, 'Dupla A');
  requireActivePoolTeam(teamB, 'Dupla B');
  if (teamA.championshipId !== championship.id || teamB.championshipId !== championship.id) {
    throw userError('As duplas precisam pertencer ao campeonato informado.', 400);
  }
  if (teamA.id === teamB.id) {
    throw userError('Uma dupla nao pode jogar contra ela mesma.', 400);
  }
  if (data.clubTuesdayId) {
    requireExisting(state.clubTuesdays, data.clubTuesdayId, 'Terca-feira');
    const weeklyOpenMatches = state.poolMatches.filter((match) => (
      match.clubTuesdayId === Number(data.clubTuesdayId) &&
      match.status === 'open'
    ));
    if (weeklyOpenMatches.length >= 2) {
      throw userError('A semana pode ter no maximo dois jogos de sinuca agendados.', 409);
    }
  }
  return pushWithId(state, 'poolMatches', {
    championshipId: championship.id,
    clubTuesdayId: data.clubTuesdayId ? Number(data.clubTuesdayId) : null,
    teamAId: teamA.id,
    teamBId: teamB.id,
    teamAPoints: null,
    teamBPoints: null,
    status: 'open',
    submittedByMemberId: null,
    approvedByMemberId: null
  });
}

export function updatePoolMatch(state, actorId, matchId, data) {
  requireAdmin(state, actorId);
  const match = requireExisting(state.poolMatches, matchId, 'Jogo');
  if (match.status !== 'open') {
    throw userError('Somente jogos abertos podem ser alterados.', 409);
  }
  const nextChampionshipId = data.championshipId ? Number(data.championshipId) : match.championshipId;
  const nextTeamAId = data.teamAId ? Number(data.teamAId) : match.teamAId;
  const nextTeamBId = data.teamBId ? Number(data.teamBId) : match.teamBId;
  const teamA = requireExisting(state.poolTeams, nextTeamAId, 'Dupla A');
  const teamB = requireExisting(state.poolTeams, nextTeamBId, 'Dupla B');
  requireActivePoolTeam(teamA, 'Dupla A');
  requireActivePoolTeam(teamB, 'Dupla B');
  if (teamA.id === teamB.id) {
    throw userError('Uma dupla nao pode jogar contra ela mesma.', 400);
  }
  if (teamA.championshipId !== nextChampionshipId || teamB.championshipId !== nextChampionshipId) {
    throw userError('As duplas precisam pertencer ao campeonato informado.', 400);
  }
  match.championshipId = nextChampionshipId;
  match.teamAId = nextTeamAId;
  match.teamBId = nextTeamBId;
  if (data.clubTuesdayId !== undefined) {
    match.clubTuesdayId = data.clubTuesdayId ? Number(data.clubTuesdayId) : null;
  }
  match.updatedAt = now(state);
  return match;
}

export function removePoolMatch(state, actorId, matchId) {
  requireAdmin(state, actorId);
  const match = requireExisting(state.poolMatches, matchId, 'Jogo');
  if (match.status !== 'open') {
    throw userError('Somente jogos abertos podem ser removidos da semana.', 409);
  }
  match.status = 'cancelled';
  match.updatedAt = now(state);
  return match;
}

export function submitPoolResult(state, actorId, matchId, result) {
  const actor = requireMember(state, actorId);
  const match = requireExisting(state.poolMatches, matchId, 'Jogo');
  if (actor.role !== 'admin' && !isPlayerInMatch(state, actor.id, match)) {
    throw userError('Jogador so pode lancar resultado de jogo em que participa.', 403);
  }
  match.teamAPoints = nonNegativeInt(result.teamAPoints, 'Pontos da dupla A');
  match.teamBPoints = nonNegativeInt(result.teamBPoints, 'Pontos da dupla B');
  match.submittedByMemberId = actor.id;
  if (actor.role === 'admin') {
    match.status = 'confirmed';
    match.approvedByMemberId = actor.id;
  } else {
    match.status = 'pending_approval';
    match.approvedByMemberId = null;
  }
  match.updatedAt = now(state);
  return match;
}

export function approvePoolMatch(state, actorId, matchId) {
  requireAdmin(state, actorId);
  const match = requireExisting(state.poolMatches, matchId, 'Jogo');
  if (match.teamAPoints === null || match.teamBPoints === null) {
    throw userError('Jogo sem resultado para aprovar.', 400);
  }
  match.status = 'confirmed';
  match.approvedByMemberId = Number(actorId);
  match.updatedAt = now(state);
  return match;
}

export function rejectPoolMatch(state, actorId, matchId) {
  requireAdmin(state, actorId);
  const match = requireExisting(state.poolMatches, matchId, 'Jogo');
  match.status = 'rejected';
  match.approvedByMemberId = Number(actorId);
  match.updatedAt = now(state);
  return match;
}

export function getPoolRanking(state, championshipId) {
  const teams = state.poolTeams.filter((team) => team.championshipId === Number(championshipId) && team.isActive);
  const rows = teams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    points: 0,
    games: 0,
    pointsFor: 0,
    pointsAgainst: 0,
    balance: 0,
    wins: 0,
    losses: 0
  }));
  const byTeamId = Object.fromEntries(rows.map((row) => [row.teamId, row]));
  const matches = state.poolMatches.filter((match) => (
    match.championshipId === Number(championshipId) &&
    match.status === 'confirmed' &&
    match.teamAPoints !== null &&
    match.teamBPoints !== null
  ));
  for (const match of matches) {
    const teamA = byTeamId[match.teamAId];
    const teamB = byTeamId[match.teamBId];
    if (!teamA || !teamB) continue;
    applyRankingResult(teamA, match.teamAPoints, match.teamBPoints);
    applyRankingResult(teamB, match.teamBPoints, match.teamAPoints);
  }
  return rows.sort((a, b) => (
    b.points - a.points ||
    b.balance - a.balance ||
    b.wins - a.wins ||
    a.teamName.localeCompare(b.teamName)
  ));
}

export function listPoolMatches(state) {
  return state.poolMatches.map((match) => ({
    ...match,
    teamA: findById(state.poolTeams, match.teamAId),
    teamB: findById(state.poolTeams, match.teamBId),
    submittedBy: findById(state.members, match.submittedByMemberId),
    approvedBy: findById(state.members, match.approvedByMemberId)
  }));
}

export function listWeeklyPoolMatches(state, clubTuesdayId) {
  return listPoolMatches(state).filter((match) => (
    match.clubTuesdayId === Number(clubTuesdayId) &&
    match.status === 'open'
  ));
}

export function createDinnerTeam(state, actorId, data) {
  requireAdmin(state, actorId);
  const tuesday = requireExisting(state.clubTuesdays, data.clubTuesdayId, 'Terca-feira');
  const memberIds = [...new Set((data.memberIds ?? []).map(Number))];
  if (memberIds.length === 0) {
    throw userError('Informe ao menos um janteiro.', 400);
  }
  for (const memberId of memberIds) {
    requireExisting(state.members, memberId, 'Membro da escala');
  }
  const existing = state.dinnerTeams.find((team) => team.clubTuesdayId === tuesday.id);
  if (existing) {
    existing.memberIds = memberIds;
    existing.notes = data.notes ?? '';
    existing.updatedByMemberId = Number(actorId);
    existing.updatedAt = now(state);
    return existing;
  }
  return pushWithId(state, 'dinnerTeams', {
    clubTuesdayId: tuesday.id,
    memberIds,
    notes: data.notes ?? '',
    createdByMemberId: Number(actorId),
    updatedByMemberId: Number(actorId)
  });
}

export function getDinnerTeamForTuesday(state, clubTuesdayId, currentMemberId = null) {
  const dinnerTeam = state.dinnerTeams.find((team) => team.clubTuesdayId === Number(clubTuesdayId));
  if (!dinnerTeam) {
    return null;
  }
  return {
    ...dinnerTeam,
    members: dinnerTeam.memberIds.map((memberId) => findById(state.members, memberId)).filter(Boolean),
    isCurrentUserScheduled: currentMemberId ? dinnerTeam.memberIds.includes(Number(currentMemberId)) : false
  };
}

export function createNotice(state, actorId, data) {
  requireAdmin(state, actorId);
  if (!NOTICE_PRIORITIES.has(data.priority ?? 'normal')) {
    throw userError('Prioridade de recado invalida.', 400);
  }
  if (!NOTICE_STATUS.has(data.status ?? 'active')) {
    throw userError('Status de recado invalido.', 400);
  }
  return pushWithId(state, 'notices', {
    title: requireText(data.title, 'Titulo'),
    message: requireText(data.message, 'Mensagem'),
    priority: data.priority ?? 'normal',
    status: data.status ?? 'active',
    clubTuesdayId: data.clubTuesdayId ? Number(data.clubTuesdayId) : null,
    startsAt: data.startsAt ?? null,
    expiresAt: data.expiresAt ?? null,
    createdByMemberId: Number(actorId)
  });
}

export function updateNotice(state, actorId, noticeId, data) {
  requireAdmin(state, actorId);
  const notice = requireExisting(state.notices, noticeId, 'Recado');
  if (data.title !== undefined) notice.title = requireText(data.title, 'Titulo');
  if (data.message !== undefined) notice.message = requireText(data.message, 'Mensagem');
  if (data.priority !== undefined) {
    if (!NOTICE_PRIORITIES.has(data.priority)) throw userError('Prioridade de recado invalida.', 400);
    notice.priority = data.priority;
  }
  if (data.status !== undefined) {
    if (!NOTICE_STATUS.has(data.status)) throw userError('Status de recado invalido.', 400);
    notice.status = data.status;
  }
  if (data.clubTuesdayId !== undefined) notice.clubTuesdayId = data.clubTuesdayId ? Number(data.clubTuesdayId) : null;
  if (data.startsAt !== undefined) notice.startsAt = data.startsAt || null;
  if (data.expiresAt !== undefined) notice.expiresAt = data.expiresAt || null;
  notice.updatedAt = now(state);
  return notice;
}

export function listActiveNotices(state, clubTuesdayId = null, referenceIso = state.nowIso) {
  const reference = new Date(referenceIso).getTime();
  const priorityWeight = { urgent: 3, high: 2, normal: 1 };
  return state.notices
    .filter((notice) => {
      if (notice.status !== 'active') return false;
      if (notice.clubTuesdayId && clubTuesdayId && notice.clubTuesdayId !== Number(clubTuesdayId)) return false;
      if (notice.startsAt && new Date(notice.startsAt).getTime() > reference) return false;
      if (notice.expiresAt && new Date(notice.expiresAt).getTime() < reference) return false;
      return true;
    })
    .sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority] || b.createdAt.localeCompare(a.createdAt));
}

export function getHomeData(state, actorId) {
  const member = requireMember(state, actorId);
  const tuesday = getCurrentTuesday(state);
  const attendance = state.attendance.find((item) => item.clubTuesdayId === tuesday.id && item.memberId === member.id) ?? null;
  const todayDrinkRows = listDrinkRowsForTuesday(state, member.id, tuesday.id);
  const ownDrinkRow = todayDrinkRows.find((row) => row.member.id === member.id) ?? null;
  return {
    member,
    tuesday,
    attendance,
    attendanceSummary: summarizeAttendance(state, tuesday.id),
    pendingCharges: listChargesForUser(state, member.id, { pendingOnly: true }),
    dinnerTeam: getDinnerTeamForTuesday(state, tuesday.id, member.id),
    notices: listActiveNotices(state, tuesday.id),
    championship: state.poolChampionships.find((item) => item.status === 'active') ?? null,
    weeklyPoolMatches: listWeeklyPoolMatches(state, tuesday.id),
    ownDrinks: ownDrinkRow ? {
      water_soda: ownDrinkRow.water_soda.quantity,
      beer: ownDrinkRow.beer.quantity
    } : { water_soda: 0, beer: 0 },
    canManageDrinks: canManageDrinks(state, member.id, tuesday.id)
  };
}

export function getReports(state, actorId, month = currentMonth(state)) {
  requireFinancialManager(state, actorId);
  const currentTuesday = getCurrentTuesday(state);
  const chargeRows = listChargesForUser(state, actorId, { month });
  return {
    attendance: summarizeAttendance(state, currentTuesday.id),
    drinks: getMonthlyDrinkReport(state, month),
    charges: {
      month,
      pending: sumAmounts(chargeRows.filter((charge) => charge.status === 'pending')),
      paid: sumAmounts(chargeRows.filter((charge) => charge.status === 'paid')),
      cancelled: sumAmounts(chargeRows.filter((charge) => charge.status === 'cancelled')),
      overdue: sumAmounts(chargeRows.filter((charge) => charge.status === 'overdue')),
      byMember: getChargeReportByMember(state, actorId, month).byMember
    },
    pool: state.poolChampionships.map((championship) => ({
      championship,
      ranking: getPoolRanking(state, championship.id)
    }))
  };
}

function seedMember(state, data) {
  return pushWithId(state, 'members', {
    name: data.name,
    phone: normalizePhone(data.phone),
    birthDate: data.birthDate ?? null,
    role: data.role,
    isActive: data.isActive ?? true,
    playsPool: data.playsPool ?? data.role === 'player',
    notes: data.notes ?? ''
  });
}

function pushWithId(state, collectionName, data) {
  const id = state.counters[collectionName]++;
  const timestamp = now(state);
  const row = {
    id,
    ...data,
    createdAt: timestamp,
    updatedAt: timestamp
  };
  state[collectionName].push(row);
  return row;
}

function logDrink(state, drink, action, oldQuantity, newQuantity, actorId) {
  return pushWithId(state, 'drinkLogs', {
    drinkId: drink.id,
    clubTuesdayId: drink.clubTuesdayId,
    memberId: drink.memberId,
    action,
    drinkType: drink.drinkType,
    oldQuantity,
    newQuantity,
    performedByMemberId: Number(actorId)
  });
}

function applyRankingResult(row, ownPoints, opponentPoints) {
  row.points += ownPoints;
  row.games += 1;
  row.pointsFor += ownPoints;
  row.pointsAgainst += opponentPoints;
  row.balance = row.pointsFor - row.pointsAgainst;
  if (ownPoints > opponentPoints) row.wins += 1;
  if (ownPoints < opponentPoints) row.losses += 1;
}

function isPlayerInMatch(state, memberId, match) {
  const teamA = requireExisting(state.poolTeams, match.teamAId, 'Dupla A');
  const teamB = requireExisting(state.poolTeams, match.teamBId, 'Dupla B');
  return [teamA.playerOneId, teamA.playerTwoId, teamB.playerOneId, teamB.playerTwoId].includes(Number(memberId));
}

function requireAdmin(state, actorId) {
  const actor = requireMember(state, actorId);
  if (actor.role !== 'admin') {
    throw userError('Sem permissao de administrador.', 403);
  }
  return actor;
}

function requireFinancialManager(state, actorId) {
  const actor = requireMember(state, actorId);
  if (!['admin', 'accountant'].includes(actor.role)) {
    throw userError('Sem permissao para area financeira.', 403);
  }
  return actor;
}

function requireDrinkManager(state, actorId, clubTuesdayId) {
  const actor = requireMember(state, actorId);
  if (!canManageDrinks(state, actor.id, clubTuesdayId)) {
    throw userError('Sem permissao para area de bebidas.', 403);
  }
  return actor;
}

function canManageDrinks(state, actorId, clubTuesdayId) {
  const actor = requireMember(state, actorId);
  return ['admin', 'accountant'].includes(actor.role) || isDinnerTeamMember(state, actor.id, clubTuesdayId);
}

function isDinnerTeamMember(state, actorId, clubTuesdayId) {
  const dinnerTeam = state.dinnerTeams.find((team) => team.clubTuesdayId === Number(clubTuesdayId));
  return Boolean(dinnerTeam?.memberIds.includes(Number(actorId)));
}

function requireMember(state, memberId) {
  const member = requireExisting(state.members, memberId, 'Membro');
  if (!member.isActive) {
    throw userError('Membro inativo.', 403);
  }
  return member;
}

function requireExisting(collection, id, label) {
  const item = findById(collection, id);
  if (!item) {
    throw userError(`${label} nao encontrado.`, 404);
  }
  return item;
}

function requireActivePoolTeam(team, label) {
  if (team.isActive === false) {
    throw userError(`${label} esta inativa.`, 409);
  }
}

function findById(collection, id) {
  return collection.find((item) => item.id === Number(id));
}

function requireText(value, label) {
  const text = String(value ?? '').trim();
  if (!text) {
    throw userError(`${label} e obrigatorio.`, 400);
  }
  return text;
}

function positiveNumber(value, label) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    throw userError(`${label} precisa ser positivo.`, 400);
  }
  return number;
}

function nonNegativeInt(value, label) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0) {
    throw userError(`${label} nao pode ser negativa.`, 400);
  }
  return number;
}

function validatePhone(phone) {
  const normalized = normalizePhone(phone);
  if (normalized.length < 10 || normalized.length > 13) {
    throw userError('Telefone precisa ter um formato aceitavel.', 400);
  }
}

function validateRole(role) {
  if (!ROLES.has(role)) {
    throw userError('Perfil invalido.', 400);
  }
}

function validateDrinkType(drinkType) {
  if (!DRINK_TYPES.has(drinkType)) {
    throw userError('Tipo de bebida invalido.', 400);
  }
}

function onlySelfProfileFields(data) {
  const keys = Object.keys(data);
  return keys.length > 0 && keys.every((key) => ['phone', 'birthDate'].includes(key));
}

function nextTuesdayDate(referenceIso) {
  const reference = new Date(referenceIso);
  const date = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
  const day = date.getUTCDay();
  const diff = (2 - day + 7) % 7;
  date.setUTCDate(date.getUTCDate() + diff);
  return toDateOnly(date);
}

function ensureFutureTuesdays(state, monthsAhead) {
  const startDate = new Date(`${nextTuesdayDate(state.nowIso)}T00:00:00.000Z`);
  const endDate = new Date(startDate);
  endDate.setUTCMonth(endDate.getUTCMonth() + Math.max(1, monthsAhead));
  for (const date = new Date(startDate); date <= endDate; date.setUTCDate(date.getUTCDate() + 7)) {
    const dateOnly = toDateOnly(date);
    if (!state.clubTuesdays.some((tuesday) => tuesday.date === dateOnly)) {
      pushWithId(state, 'clubTuesdays', { date: dateOnly, status: 'open' });
    }
  }
}

function firstTuesdayForCharge(monthOrDate) {
  const value = String(monthOrDate ?? '').slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(value)) {
    throw userError('Mes da cobranca invalido.', 400);
  }
  const date = new Date(`${value}-01T00:00:00.000Z`);
  const diff = (2 - date.getUTCDay() + 7) % 7;
  date.setUTCDate(date.getUTCDate() + diff);
  return toDateOnly(date);
}

function currentMonth(state) {
  return String(state.nowIso).slice(0, 7);
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function now(state) {
  return state.nowIso ?? new Date().toISOString();
}

function sumAmounts(rows) {
  return rows.reduce((total, charge) => total + Number(charge.amount), 0);
}

function summarizeDrinkCell(drinks, drinkType) {
  const matching = drinks.filter((drink) => drink.drinkType === drinkType);
  return {
    quantity: matching.reduce((total, drink) => total + drink.quantity, 0),
    drinkIds: matching.map((drink) => drink.id)
  };
}

function userError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
