import { api, exportClientState, importClientState } from './client-api.js';

const app = document.querySelector('#app');

const state = {
  token: localStorage.getItem('cdt_token'),
  view: localStorage.getItem('cdt_view') || 'home',
  me: null,
  home: null,
  members: [],
  tuesday: null,
  dinnerTuesdayId: null,
  status: ''
};

const allViews = [
  ['home', 'Inicio'],
  ['attendance', 'Presenca'],
  ['pool', 'Sinuca'],
  ['drinks', 'Bebidas'],
  ['charges', 'Cobrancas'],
  ['dinner', 'Janteiros'],
  ['notices', 'Recados'],
  ['admin', 'Admin'],
  ['reports', 'Relatorios']
];

function availableViews() {
  if (isAdmin()) {
    return allViews.filter(([id]) => ['home', 'drinks', 'pool', 'charges', 'dinner', 'admin', 'reports'].includes(id));
  }
  if (state.me?.role === 'accountant') {
    return allViews.filter(([id]) => ['home', 'drinks', 'charges', 'reports'].includes(id));
  }
  if (canManageDrinks()) {
    return allViews.filter(([id]) => ['home', 'drinks', 'pool', 'charges', 'notices'].includes(id));
  }
  return allViews.filter(([id]) => ['home', 'pool', 'charges', 'notices'].includes(id));
}

init();

async function init() {
  if (!state.token) {
    renderLogin();
    return;
  }
  try {
    state.me = await api('/api/auth/me');
    state.home = await api('/api/home');
    state.tuesday = state.home.tuesday;
    render();
  } catch {
    localStorage.removeItem('cdt_token');
    state.token = null;
    renderLogin('Sessao expirada.');
  }
}

function renderLogin(message = '') {
  app.innerHTML = `
    <main class="login-wrap">
      <form class="login-panel" id="login-form">
        <h1>Clube das Tercas</h1>
        <label>Telefone
          <input name="phone" inputmode="tel" autocomplete="tel" placeholder="54999990001" required>
        </label>
        <div class="status">${escapeHtml(message)}</div>
        <button class="btn green" type="submit">Entrar</button>
      </form>
    </main>
  `;
  document.querySelector('#login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const phone = new FormData(event.currentTarget).get('phone');
    try {
      const login = await api('/api/auth/login', { method: 'POST', body: { phone } });
      state.token = login.token;
      state.me = login.member;
      localStorage.setItem('cdt_token', login.token);
      await init();
    } catch (error) {
      renderLogin(error.message);
    }
  });
}

function render() {
  localStorage.setItem('cdt_view', state.view);
  const navViews = availableViews();
  if (!navViews.some(([id]) => id === state.view)) {
    state.view = 'home';
  }
  app.innerHTML = `
    <div class="app-shell">
      <header class="topbar">
        <div class="brand">
          <strong>Clube das Tercas</strong>
          <span>${escapeHtml(state.me?.name || '')} · ${roleLabel(state.me?.role)}</span>
        </div>
        <button class="btn secondary" data-action="logout">Sair</button>
      </header>
      <nav class="bottom-nav">
        ${navViews.map(([id, label]) => `<button class="nav-btn ${state.view === id ? 'active' : ''}" data-view="${id}">${label}</button>`).join('')}
      </nav>
      <main class="content" id="screen"></main>
    </div>
  `;
  document.querySelectorAll('[data-view]').forEach((button) => {
    button.addEventListener('click', () => {
      state.view = button.dataset.view;
      render();
    });
  });
  document.querySelector('[data-action="logout"]').addEventListener('click', async () => {
    try { await api('/api/auth/logout', { method: 'POST' }); } catch {}
    localStorage.removeItem('cdt_token');
    state.token = null;
    renderLogin();
  });
  renderCurrentView();
}

function renderCurrentView() {
  const map = {
    home: renderHome,
    attendance: renderAttendance,
    pool: renderPool,
    drinks: renderDrinks,
    charges: renderCharges,
    dinner: renderDinner,
    notices: renderNotices,
    admin: renderAdmin,
    reports: renderReports
  };
  map[state.view]?.();
}

async function refreshHome() {
  state.home = await api('/api/home');
  state.tuesday = state.home.tuesday;
}

function renderHome() {
  const home = state.home;
  const pendingTotal = money(home.pendingCharges.reduce((total, charge) => total + Number(charge.amount), 0));
  screen().innerHTML = `
    <section class="home-shell">
      <article class="home-hero next-tuesday-card">
        <div>
          <span class="eyebrow">Proxima terca</span>
          <h1>${formatDate(home.tuesday.date)}</h1>
        </div>
        <div class="hero-metrics">
          <span><strong>${home.attendanceSummary.totalDinner}</strong> Janta</span>
          <span><strong>${home.attendanceSummary.totalFootball}</strong> Futebol</span>
          <span class="${Number(pendingTotal.replace(/[^0-9,-]/g, '').replace(',', '.')) > 0 ? 'metric-alert' : ''}"><strong>${pendingTotal}</strong> Pendente</span>
        </div>
      </article>
      <section class="home-grid">
        <article class="card focus-card presence-card">
          <h2>Minha presenca</h2>
          ${attendanceForm(home.attendance)}
        </article>
        <article class="card home-summary-card">
          <h2>Hoje no clube</h2>
          <ul class="compact-list">
            <li class="row"><span>Janta</span><strong>${home.attendanceSummary.totalDinner}</strong></li>
            <li class="row"><span>Futebol</span><strong>${home.attendanceSummary.totalFootball}</strong></li>
            <li class="row ${home.pendingCharges.length ? 'row-alert' : ''}"><span>Cobrancas pendentes</span><strong>${pendingTotal}</strong></li>
          </ul>
        </article>
        <article class="card home-drinks-card">
          <h2>Bebidas</h2>
          <ul class="compact-list">
            <li class="row"><span>Meu Agua/Refri hoje</span><strong>${home.ownDrinks?.water_soda ?? 0}</strong></li>
            <li class="row"><span>Minha Cerveja hoje</span><strong>${home.ownDrinks?.beer ?? 0}</strong></li>
          </ul>
          ${home.canManageDrinks ? '<button class="btn green full" data-view-jump="drinks" type="button">Abrir bebidas</button>' : ''}
        </article>
        <article class="card home-charges-card">
          <h2>Cobrancas</h2>
          <div class="stack">${home.pendingCharges.length ? home.pendingCharges.map(chargeCard).join('') : '<p class="empty">Sem cobrancas pendentes.</p>'}</div>
        </article>
      </section>
      <section class="home-secondary-grid">
        <article class="card">
          <h2>Jogos de sinuca da semana</h2>
          <div class="stack">${home.weeklyPoolMatches.length ? home.weeklyPoolMatches.map(homePoolMatchCard).join('') : '<p class="empty">Nenhum jogo agendado para esta terca.</p>'}</div>
        </article>
        <article class="card ${home.dinnerTeam?.isCurrentUserScheduled ? 'notice-high' : ''}">
          <h2>Janteiros</h2>
          ${home.dinnerTeam ? `<p>${home.dinnerTeam.members.map((member) => escapeHtml(member.name)).join(', ')}</p><div class="meta">${escapeHtml(home.dinnerTeam.notes || '')}</div>` : '<p class="empty">Sem escala cadastrada.</p>'}
        </article>
        <article class="card">
          <h2>Recados</h2>
          ${home.notices.length ? home.notices.map(noticeCard).join('') : '<p class="empty">Sem recados ativos.</p>'}
        </article>
      </section>
    </section>
  `;
  bindAttendanceForm();
  bindHomePoolForms();
  bindViewJumps();
}

function homePoolMatchCard(match) {
  return `
    <div class="home-pool-match">
      <div class="match-line">
        <strong>${escapeHtml(match.teamA.name)}</strong>
        <span>x</span>
        <strong>${escapeHtml(match.teamB.name)}</strong>
      </div>
      <form class="home-pool-result-form" data-match-id="${match.id}">
        <input name="teamAPoints" type="number" min="0" value="0" aria-label="Pontos ${escapeHtml(match.teamA.name)}">
        <input name="teamBPoints" type="number" min="0" value="0" aria-label="Pontos ${escapeHtml(match.teamB.name)}">
        <button class="btn green" type="submit">Lancar</button>
      </form>
    </div>
  `;
}

function bindHomePoolForms() {
  document.querySelectorAll('.home-pool-result-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      await api(`/api/pool/matches/${form.dataset.matchId}/result`, {
        method: 'PUT',
        body: { teamAPoints: Number(data.teamAPoints), teamBPoints: Number(data.teamBPoints) }
      });
      await refreshHome();
      renderHome();
    });
  });
}

function bindViewJumps() {
  document.querySelectorAll('[data-view-jump]').forEach((button) => button.addEventListener('click', () => {
    state.view = button.dataset.viewJump;
    render();
  }));
}

function renderAttendance() {
  screen().innerHTML = `
    <h1 class="screen-title">Presenca</h1>
    <section class="grid two">
      <article class="card">
        <h2>Minha terca</h2>
        ${attendanceForm(state.home.attendance)}
      </article>
      <article class="card">
        <h2>Totais</h2>
        <ul class="compact-list">
          <li class="row"><span>Membros na janta</span><strong>${state.home.attendanceSummary.dinnerMembers}</strong></li>
          <li class="row"><span>Membros no futebol</span><strong>${state.home.attendanceSummary.footballMembers}</strong></li>
          <li class="row"><span>Convidados janta</span><strong>${state.home.attendanceSummary.dinnerGuests}</strong></li>
          <li class="row"><span>Convidados futebol</span><strong>${state.home.attendanceSummary.footballGuests}</strong></li>
        </ul>
      </article>
      <article class="card" id="attendance-admin"></article>
    </section>
  `;
  bindAttendanceForm();
  if (isFinanceOrAdmin()) loadAttendanceAdmin();
}

async function loadAttendanceAdmin() {
  const host = document.querySelector('#attendance-admin');
  try {
    const result = await api(`/api/attendance/${state.tuesday.id}`);
    host.innerHTML = `
      <h2>Lista geral</h2>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Membro</th><th>Status</th><th>Janta</th><th>Futebol</th></tr></thead>
          <tbody>${result.rows.map((row) => `<tr><td>${escapeHtml(row.member.name)}</td><td>${attendanceLabel(row.status)}</td><td>${row.dinnerGuests}</td><td>${row.footballGuests}</td></tr>`).join('')}</tbody>
        </table>
      </div>
    `;
  } catch (error) {
    host.innerHTML = `<h2>Lista geral</h2><p class="empty">${escapeHtml(error.message)}</p>`;
  }
}

function attendanceForm(current) {
  const selected = current?.status || 'not_going';
  return `
    <form class="form-grid" id="attendance-form">
      <input type="hidden" name="clubTuesdayId" value="${state.tuesday?.id || ''}">
      <input type="hidden" name="status" value="${selected}">
      <div class="segmented presence-options attendance-options">
        ${presenceButton('dinner', 'Janta', selected)}
        ${presenceButton('football', 'Futebol', selected)}
        ${presenceButton('dinner_and_football', 'Janta + Futebol', selected)}
        ${presenceButton('not_going', 'Nao vou', selected)}
      </div>
      <div class="guest-grid">
        <label class="guest-stepper-card">Convidados janta
          <span class="stepper">
            <button type="button" class="step-btn" data-step-field="dinnerGuests" data-step="-1">-</button>
            <input name="dinnerGuests" type="number" min="0" value="${current?.dinnerGuests ?? 0}">
            <button type="button" class="step-btn" data-step-field="dinnerGuests" data-step="1">+</button>
          </span>
        </label>
        <label class="guest-stepper-card">Convidados futebol
          <span class="stepper">
            <button type="button" class="step-btn" data-step-field="footballGuests" data-step="-1">-</button>
            <input name="footballGuests" type="number" min="0" value="${current?.footballGuests ?? 0}">
            <button type="button" class="step-btn" data-step-field="footballGuests" data-step="1">+</button>
          </span>
        </label>
      </div>
      <div class="status" id="attendance-status"></div>
      <button class="btn green full" type="submit">Salvar presenca</button>
    </form>
  `;
}

function presenceButton(value, label, selected) {
  return `<button type="button" class="segmented-btn ${selected === value ? 'active' : ''}" data-presence="${value}">${label}</button>`;
}

function bindAttendanceForm() {
  const form = document.querySelector('#attendance-form');
  if (!form) return;
  form.querySelectorAll('[data-presence]').forEach((button) => button.addEventListener('click', () => {
    form.status.value = button.dataset.presence;
    form.querySelectorAll('[data-presence]').forEach((item) => item.classList.toggle('active', item === button));
  }));
  form.querySelectorAll('[data-step-field]').forEach((button) => button.addEventListener('click', () => {
    const field = form.elements[button.dataset.stepField];
    field.value = Math.max(0, Number(field.value || 0) + Number(button.dataset.step));
  }));
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    try {
      await api('/api/attendance', {
        method: 'POST',
        body: {
          clubTuesdayId: Number(data.clubTuesdayId),
          status: data.status,
          dinnerGuests: Number(data.dinnerGuests),
          footballGuests: Number(data.footballGuests)
        }
      });
      await refreshHome();
      renderCurrentView();
    } catch (error) {
      document.querySelector('#attendance-status').textContent = error.message;
    }
  });
}

async function renderPool() {
  screen().innerHTML = '<h1 class="screen-title">Sinuca</h1><div class="card">Carregando...</div>';
  const [championships, teams, matches, weeklyMatches] = await Promise.all([
    api('/api/pool/championships'),
    api('/api/pool/teams'),
    api('/api/pool/matches'),
    api(`/api/pool/weekly/${state.tuesday.id}`)
  ]);
  if (isAdmin()) {
    await loadMembers();
  }
  const championship = championships.find((item) => item.status === 'active') || championships[0];
  const ranking = championship ? await api(`/api/pool/ranking/${championship.id}`) : [];
  screen().innerHTML = `
    <section class="pool-shell">
    <section class="screen-header pool-title-card"><div><span class="eyebrow">Campeonato</span><h1>Sinuca</h1><p class="screen-subtitle">Ranking, jogos e pendencias da semana.</p></div></section>
    <section class="grid two pool-layout">
      <article class="card pool-ranking-card">
        <h2>${escapeHtml(championship?.name || 'Campeonato')}</h2>
        <div class="ranking-mobile-list">${ranking.map((row, index) => rankingRowCard(row, index)).join('')}</div>
        <div class="table-wrap">
          <table><thead><tr><th>Dupla</th><th>Pontos</th><th>Jogos</th><th>Saldo</th></tr></thead>
          <tbody>${ranking.map((row) => `<tr><td>${escapeHtml(row.teamName)}</td><td>${row.points}</td><td>${row.games}</td><td>${row.balance}</td></tr>`).join('')}</tbody></table>
        </div>
      </article>
      <article class="card">
        <h2>Jogos da semana</h2>
        <div class="stack">${weeklyMatches.map((match) => matchCard(match, teams)).join('') || '<p class="empty">Sem jogos abertos para esta terca.</p>'}</div>
      </article>
      <article class="card">
        <h2>Historico e pendencias</h2>
        <div class="stack">${matches.filter((match) => match.status !== 'open' && match.status !== 'cancelled').map((match) => matchCard(match, teams)).join('') || '<p class="empty">Sem resultados lancados.</p>'}</div>
      </article>
      ${isAdmin() ? poolAdminForms(championship, teams) : ''}
    </section>
    </section>
  `;
  bindPoolForms();
}

function matchCard(match, teams = []) {
  const canEditOpen = isAdmin() && match.status === 'open';
  const canSubmitResult = match.status === 'open';
  const status = poolStatusLabel(match.status);
  return `
    <div class="card pool-match-card">
      <div class="row"><strong>${escapeHtml(match.teamA.name)}</strong><span>${match.teamAPoints ?? '-'}</span></div>
      <div class="row"><strong>${escapeHtml(match.teamB.name)}</strong><span>${match.teamBPoints ?? '-'}</span></div>
      <div class="actions">
        <span class="pill ${status.className}">${status.label}</span>
      </div>
      ${canEditOpen ? `
      <form class="form-grid pool-edit-form" data-match-id="${match.id}">
        <div class="form-grid two">
          <label>Dupla A<select name="teamAId">${teamOptions(teams, match.teamAId)}</select></label>
          <label>Dupla B<select name="teamBId">${teamOptions(teams, match.teamBId)}</select></label>
        </div>
        <div class="actions">
          <button class="btn secondary" type="submit">Alterar jogo</button>
          <button class="btn danger" type="button" data-remove-match="${match.id}">Remover jogo</button>
        </div>
      </form>` : ''}
      ${canSubmitResult ? `<form class="form-grid pool-result-form" data-match-id="${match.id}">
        <div class="form-grid two">
          <label>Pontos A<input name="teamAPoints" type="number" min="0" value="${match.teamAPoints ?? 0}"></label>
          <label>Pontos B<input name="teamBPoints" type="number" min="0" value="${match.teamBPoints ?? 0}"></label>
        </div>
        <div class="actions">
          <button class="btn green" type="submit">Lancar</button>
          ${isAdmin() && match.status === 'pending_approval' ? `<button class="btn secondary" type="button" data-approve="${match.id}">Aprovar</button><button class="btn danger" type="button" data-reject="${match.id}">Rejeitar</button>` : ''}
        </div>
      </form>` : ''}
      ${isAdmin() && match.status === 'pending_approval' ? `<div class="actions"><button class="btn secondary" type="button" data-approve="${match.id}">Aprovar</button><button class="btn danger" type="button" data-reject="${match.id}">Rejeitar</button></div>` : ''}
    </div>
  `;
}

function rankingRowCard(row, index) {
  return `
    <div class="ranking-row-card ${index === 0 ? 'leader' : ''}">
      <strong>#${index + 1} ${escapeHtml(row.teamName)}</strong>
      <span>${row.points} pts · ${row.games} jogos · saldo ${row.balance >= 0 ? '+' : ''}${row.balance}</span>
    </div>
  `;
}

function poolAdminForms(championship, teams) {
  return `
    <section class="pool-admin-section">
    <article class="card">
      <h2>Nova dupla</h2>
      <form class="form-grid" id="team-form">
        <input type="hidden" name="championshipId" value="${championship?.id || ''}">
        <label>Nome<input name="name" required></label>
        <div class="form-grid two">
          <label>Jogador 1<select name="playerOneId">${memberOptions()}</select></label>
          <label>Jogador 2<select name="playerTwoId">${memberOptions()}</select></label>
        </div>
        <button class="btn green" type="submit">Criar dupla</button>
      </form>
    </article>
    <article class="card">
      <h2>Novo jogo</h2>
      <form class="form-grid" id="match-form">
        <input type="hidden" name="championshipId" value="${championship?.id || ''}">
        <input type="hidden" name="clubTuesdayId" value="${state.tuesday.id}">
        <label>Dupla A<select name="teamAId">${teamOptions(teams)}</select></label>
        <label>Dupla B<select name="teamBId">${teamOptions(teams)}</select></label>
        <button class="btn green" type="submit">Criar jogo</button>
      </form>
    </article>
    </section>
  `;
}

function bindPoolForms() {
  document.querySelectorAll('.pool-result-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      await api(`/api/pool/matches/${form.dataset.matchId}/result`, {
        method: 'PUT',
        body: { teamAPoints: Number(data.teamAPoints), teamBPoints: Number(data.teamBPoints) }
      });
      await refreshHome();
      renderPool();
    });
  });
  document.querySelectorAll('.pool-edit-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form));
      await api(`/api/pool/matches/${form.dataset.matchId}`, {
        method: 'PUT',
        body: numericFields(data, ['teamAId', 'teamBId'])
      });
      await refreshHome();
      renderPool();
    });
  });
  document.querySelectorAll('[data-remove-match]').forEach((button) => button.addEventListener('click', async () => {
    await api(`/api/pool/matches/${button.dataset.removeMatch}`, { method: 'DELETE' });
    await refreshHome();
    renderPool();
  }));
  document.querySelectorAll('[data-approve]').forEach((button) => button.addEventListener('click', async () => {
    await api(`/api/pool/matches/${button.dataset.approve}/approve`, { method: 'POST' });
    await refreshHome();
    renderPool();
  }));
  document.querySelectorAll('[data-reject]').forEach((button) => button.addEventListener('click', async () => {
    await api(`/api/pool/matches/${button.dataset.reject}/reject`, { method: 'POST' });
    await refreshHome();
    renderPool();
  }));
  const teamForm = document.querySelector('#team-form');
  if (teamForm) teamForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(teamForm));
    await api('/api/pool/teams', { method: 'POST', body: numericFields(data, ['championshipId', 'playerOneId', 'playerTwoId']) });
    renderPool();
  });
  const matchForm = document.querySelector('#match-form');
  if (matchForm) matchForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(matchForm));
    await api('/api/pool/matches', { method: 'POST', body: numericFields(data, ['championshipId', 'clubTuesdayId', 'teamAId', 'teamBId']) });
    await refreshHome();
    renderPool();
  });
}

async function renderDrinks() {
  if (!canManageDrinks()) return renderForbidden('Bebidas');
  const [rows, logs, report] = await Promise.all([
    api(`/api/drinks/rows/${state.tuesday.id}`),
    api(`/api/drinks/logs/${state.tuesday.id}`),
    isFinanceOrAdmin()
      ? api(`/api/drinks/reports/monthly?month=${state.tuesday.date.slice(0, 7)}`)
      : Promise.resolve({ totals: { water_soda: 0, beer: 0 }, byMember: {} })
  ]);
  screen().innerHTML = `
    <section class="screen-header">
      <div>
        <span class="eyebrow">Operacao do dia</span>
        <h1>Comanda de bebidas</h1>
      </div>
      <div class="screen-actions command-toolbar">
        <input data-drink-search type="search" placeholder="Buscar socio">
        <div class="segmented compact">
          <button class="segmented-btn active" type="button" data-consumption-filter="all">Todos</button>
          <button class="segmented-btn" type="button" data-consumption-filter="active">Com consumo</button>
        </div>
        <button class="btn secondary" type="button" data-open-drink-audit>Auditoria</button>
      </div>
    </section>
    <section class="grid two drinks-layout">
      ${isFinanceOrAdmin() ? `<article class="card summary-card">
        <h2>Resumo mensal</h2>
        <ul class="compact-list">
          <li class="row"><span>Agua/Refri</span><strong>${report.totals.water_soda}</strong></li>
          <li class="row"><span>Cerveja</span><strong>${report.totals.beer}</strong></li>
        </ul>
      </article>` : ''}
      <article class="card wide-card command-card">
        <h2>${formatDate(state.tuesday.date)}</h2>
        <div class="drink-member-list">${rows.map(drinkMemberRow).join('')}</div>
      </article>
      <article class="card">
        <h2>Logs</h2>
        <ul class="compact-list">${logs.slice().reverse().map((log) => `<li class="row"><span>${escapeHtml(log.member.name)} · ${drinkLabel(log.drinkType)}</span><strong>${log.action}</strong></li>`).join('')}</ul>
      </article>
    </section>
  `;
  bindDrinkForms();
  bindDrinkFilters();
  document.querySelector('[data-open-drink-audit]')?.addEventListener('click', () => openDrinkAuditModal(logs));
}

function drinkMemberRow(row) {
  const total = row.water_soda.quantity + row.beer.quantity;
  return `
    <div class="drink-member-row" data-member-row data-member-name="${escapeHtml(row.member.name).toLowerCase()}" data-has-consumption="${total > 0 ? 'true' : 'false'}">
      <strong>${escapeHtml(row.member.name)}</strong>
      ${drinkControl(row.member.id, 'water_soda', row.water_soda)}
      ${drinkControl(row.member.id, 'beer', row.beer)}
    </div>
  `;
}

function drinkControl(memberId, drinkType, cell) {
  const lastDrinkId = cell.drinkIds[cell.drinkIds.length - 1];
  return `
    <div class="drink-control">
      <button class="btn drink-quick-action ${drinkType === 'beer' ? 'wine' : 'green'}" type="button" data-add-drink="${memberId}:${drinkType}">+ ${drinkLabel(drinkType)}</button>
      <span class="drink-count">${cell.quantity}</span>
      <button class="btn secondary" type="button" data-remove-drink="${lastDrinkId || ''}" ${lastDrinkId ? '' : 'disabled'}>Remover</button>
    </div>
  `;
}

function oldDrinkRow(drink) {
  return `
    <form class="row drink-row" data-id="${drink.id}">
      <span>${escapeHtml(drink.member.name)} · ${drinkLabel(drink.drinkType)}</span>
      <input name="quantity" type="number" min="0" value="${drink.quantity}" style="max-width:86px">
      <button class="btn secondary" type="submit">Salvar</button>
      <button class="btn danger" type="button" data-remove-drink="${drink.id}">Remover</button>
    </form>
  `;
}

function bindDrinkForms() {
  document.querySelectorAll('[data-add-drink]').forEach((button) => button.addEventListener('click', async () => {
    const [memberId, drinkType] = button.dataset.addDrink.split(':');
    await api('/api/drinks', {
      method: 'POST',
      body: { clubTuesdayId: state.tuesday.id, memberId: Number(memberId), drinkType, quantity: 1 }
    });
    renderDrinks();
  }));
  document.querySelector('#drink-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await api('/api/drinks', { method: 'POST', body: numericFields(data, ['clubTuesdayId', 'memberId', 'quantity']) });
    renderDrinks();
  });
  document.querySelectorAll('.drink-row').forEach((form) => form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(form));
    await api(`/api/drinks/${form.dataset.id}`, { method: 'PUT', body: { quantity: Number(data.quantity) } });
    renderDrinks();
  }));
  document.querySelectorAll('[data-remove-drink]').forEach((button) => button.addEventListener('click', async () => {
    if (!button.dataset.removeDrink) return;
    await api(`/api/drinks/${button.dataset.removeDrink}`, { method: 'DELETE' });
    renderDrinks();
  }));
}

function bindDrinkFilters() {
  const search = document.querySelector('[data-drink-search]');
  const filterButtons = document.querySelectorAll('[data-consumption-filter]');
  let mode = 'all';
  const apply = () => {
    const term = normalizeText(search?.value || '');
    document.querySelectorAll('[data-member-row]').forEach((row) => {
      const matchesSearch = normalizeText(row.dataset.memberName || '').includes(term);
      const matchesMode = mode === 'all' || row.dataset.hasConsumption === 'true';
      row.hidden = !(matchesSearch && matchesMode);
    });
  };
  search?.addEventListener('input', apply);
  filterButtons.forEach((button) => button.addEventListener('click', () => {
    mode = button.dataset.consumptionFilter;
    filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    apply();
  }));
}

function openDrinkAuditModal(logs) {
  const existing = document.querySelector('[data-modal]');
  existing?.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-backdrop';
  modal.dataset.modal = 'drink-audit';
  modal.innerHTML = `
    <section class="modal-panel" role="dialog" aria-modal="true" aria-label="Auditoria de bebidas">
      <header class="modal-header">
        <h2>Auditoria de bebidas</h2>
        <button class="btn secondary" type="button" data-close-modal>Fechar</button>
      </header>
      <div class="audit-list">
        ${logs.length ? logs.slice().reverse().map((log) => `
          <div class="audit-row">
            <span>${escapeHtml(log.member.name)} - ${drinkLabel(log.drinkType)}</span>
            <strong>${log.action}</strong>
            <small>${log.oldQuantity ?? '-'} -> ${log.newQuantity ?? '-'}</small>
          </div>
        `).join('') : '<p class="empty">Sem eventos de auditoria.</p>'}
      </div>
    </section>
  `;
  modal.addEventListener('click', (event) => {
    if (event.target === modal || event.target.matches('[data-close-modal]')) {
      modal.remove();
    }
  });
  document.body.append(modal);
}

async function renderCharges() {
  const charges = await api(isFinanceOrAdmin() ? '/api/charges' : '/api/charges/me');
  const pendingCharges = charges.filter((charge) => charge.status === 'pending');
  const paidCharges = charges.filter((charge) => charge.status === 'paid');
  const pendingAmount = pendingCharges.reduce((total, charge) => total + Number(charge.amount), 0);
  screen().innerHTML = `
    <section class="charges-shell">
      <article class="screen-header charges-title-card">
        <div>
          <span class="eyebrow">Financeiro</span>
          <h1>Cobrancas</h1>
          <p class="screen-subtitle">Crie, acompanhe e baixe cobrancas dos membros.</p>
        </div>
      </article>
      <article class="card finance-summary-card">
        <h2>Resumo financeiro</h2>
        <div class="finance-summary-grid">
          <div class="summary-tile alert"><span>Pendentes</span><strong>${pendingCharges.length}</strong></div>
          <div class="summary-tile strong"><span>Em aberto</span><strong>${money(pendingAmount)}</strong></div>
          <div class="summary-tile"><span>Pagas</span><strong>${paidCharges.length}</strong></div>
        </div>
      </article>
      <section class="charges-layout">
        <article class="card charge-list-card">
          <h2>Cobrancas cadastradas</h2>
          <div class="charge-tools">
            <input data-charge-search type="search" placeholder="Buscar por membro ou titulo">
            <div class="segmented compact filter-chips">
              <button class="segmented-btn active" type="button" data-charge-filter="all">Todas</button>
              <button class="segmented-btn" type="button" data-charge-filter="pending">Pendentes</button>
              <button class="segmented-btn" type="button" data-charge-filter="paid">Pagas</button>
              <button class="segmented-btn" type="button" data-charge-filter="cancelled">Canceladas</button>
            </div>
          </div>
          <div class="stack">${charges.map(chargeCard).join('') || '<p class="empty">Nenhuma cobranca cadastrada. Crie a primeira cobranca para comecar.</p>'}</div>
          <p class="empty" data-charge-empty hidden>Nenhuma cobranca encontrada.</p>
        </article>
        ${isFinanceOrAdmin() ? `
        <article class="card charge-form-card">
          <h2>Nova cobranca</h2>
          <form class="form-grid" id="charge-form">
            <label>Membro<select name="memberId" required>${memberOptions(await loadMembers())}</select></label>
            <label>Titulo<input name="title" placeholder="Ex: Mensalidade, Bebidas, Janta" required></label>
            <label>Valor em reais<input name="amount" type="number" min="0.01" step="0.01" placeholder="Ex: 100,00" required></label>
            <label>Mes da cobranca<input name="month" type="month" value="${state.tuesday.date.slice(0, 7)}" required></label>
            <button class="btn green full" type="submit">Criar cobranca</button>
          </form>
        </article>` : ''}
      </section>
    </section>
  `;
  bindChargeForms();
  bindChargeFilters();
}

function chargeCard(charge) {
  const status = chargeStatusLabel(charge.status);
  return `
    <div class="card charge-card" data-charge-row data-charge-status-value="${charge.status}" data-charge-search-value="${escapeHtml(`${charge.title} ${charge.member?.name || ''}`).toLowerCase()}">
      <div class="row"><strong>${escapeHtml(charge.title)}</strong><span>${money(charge.amount)}</span></div>
      <div class="meta">${escapeHtml(charge.member?.name || '')} · ${charge.dueDate || 'sem vencimento'}</div>
      <div class="actions charge-actions">
        <span class="pill charge-status-label ${status.className}">${status.label}</span>
        ${isFinanceOrAdmin() ? `<button class="btn green" data-charge-status="${charge.id}:paid">Marcar como paga</button><button class="btn danger" data-charge-status="${charge.id}:cancelled">Cancelar</button>` : ''}
      </div>
    </div>
  `;
}

function bindChargeForms() {
  document.querySelector('#charge-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await api('/api/charges', { method: 'POST', body: numericFields(data, ['memberId', 'amount']) });
    await refreshHome();
    renderCharges();
  });
  document.querySelectorAll('[data-charge-status]').forEach((button) => button.addEventListener('click', async () => {
    const [id, status] = button.dataset.chargeStatus.split(':');
    if (status === 'cancelled' && !confirm('Tem certeza que deseja cancelar esta cobranca?')) {
      return;
    }
    await api(`/api/charges/${id}/status`, { method: 'PATCH', body: { status } });
    await refreshHome();
    renderCharges();
  }));
}

function bindChargeFilters() {
  const search = document.querySelector('[data-charge-search]');
  const filterButtons = document.querySelectorAll('[data-charge-filter]');
  const empty = document.querySelector('[data-charge-empty]');
  let mode = 'all';
  const apply = () => {
    const term = normalizeText(search?.value || '');
    let visible = 0;
    document.querySelectorAll('[data-charge-row]').forEach((row) => {
      const matchesStatus = mode === 'all' || row.dataset.chargeStatusValue === mode;
      const matchesSearch = normalizeText(row.dataset.chargeSearchValue || '').includes(term);
      const show = matchesStatus && matchesSearch;
      row.hidden = !show;
      if (show) visible += 1;
    });
    if (empty) {
      empty.hidden = visible > 0;
      empty.textContent = mode === 'pending'
        ? 'Nenhuma cobranca pendente no momento.'
        : 'Nenhuma cobranca encontrada.';
    }
  };
  search?.addEventListener('input', apply);
  filterButtons.forEach((button) => button.addEventListener('click', () => {
    mode = button.dataset.chargeFilter;
    filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    apply();
  }));
}

async function renderDinner() {
  const [members, tuesdays] = await Promise.all([
    loadMembers(),
    api('/api/club-tuesdays?monthsAhead=12')
  ]);
  state.dinnerTuesdayId ??= state.tuesday.id;
  const selectedTuesday = tuesdays.find((tuesday) => tuesday.id === Number(state.dinnerTuesdayId)) || state.tuesday;
  const dinnerTeam = await api(`/api/dinner-teams/${selectedTuesday.id}`);
  const selectedMemberIds = dinnerTeam?.memberIds || [];
  screen().innerHTML = `
    <section class="dinner-shell">
      <article class="screen-header dinner-title-card">
        <div>
          <span class="eyebrow">Escala da janta</span>
          <h1>Janteiros</h1>
          <p class="screen-subtitle">Organize quem prepara a janta da proxima terca.</p>
        </div>
      </article>
      <article class="card dinner-date-card">
        <label>Terca-feira
          <select id="dinner-date-select">${tuesdays.map((tuesday) => option(String(tuesday.id), formatDate(tuesday.date), String(selectedTuesday.id))).join('')}</select>
        </label>
        <p class="meta">Data selecionada: ${formatDate(selectedTuesday.date)}</p>
      </article>
      <section class="dinner-layout">
        <article class="card dinner-current-card ${dinnerTeam?.isCurrentUserScheduled ? 'notice-high' : ''}">
          <span class="eyebrow">Escala atual</span>
          <h2>${formatDate(selectedTuesday.date)}</h2>
          ${dinnerTeam?.members?.length ? `
            <p class="meta">Janteiros escalados</p>
            <div class="chip-list">${dinnerTeam.members.map((member) => `<span class="pill green">${escapeHtml(member.name)}</span>`).join('')}</div>
          ` : '<p class="empty">Nenhum janteiro escalado para esta terca.</p>'}
          ${dinnerTeam?.notes ? `<div class="note-box"><strong>Observacao</strong><p>${escapeHtml(dinnerTeam.notes)}</p></div>` : ''}
        </article>
        ${isAdmin() ? `
        <article class="card dinner-edit-card">
          <h2>Editar escala</h2>
          <p class="meta">Selecione os membros responsaveis pela janta.</p>
          <form class="form-grid" id="dinner-form">
            <input type="hidden" name="clubTuesdayId" value="${selectedTuesday.id}">
            <label>Buscar membro<input data-dinner-member-search type="search" placeholder="Buscar membro"></label>
            <div class="member-choice-list">${members.map((member) => dinnerMemberChoice(member, selectedMemberIds)).join('')}</div>
            <label>Observacao<textarea name="notes" rows="4" placeholder="Ex: trazer carne, combinar horario, trocar escala...">${escapeHtml(dinnerTeam?.notes || '')}</textarea></label>
            <div class="status" id="dinner-status"></div>
            <button class="btn green full" type="submit">Salvar escala</button>
          </form>
        </article>` : ''}
      </section>
    </section>
  `;
  document.querySelector('#dinner-date-select')?.addEventListener('change', (event) => {
    state.dinnerTuesdayId = Number(event.currentTarget.value);
    renderDinner();
  });
  bindDinnerMemberSearch();
  document.querySelector('#dinner-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const memberIds = [...form.querySelectorAll('input[name="memberIds"]:checked')].map((input) => Number(input.value));
    await api('/api/dinner-teams', {
      method: 'POST',
      body: { clubTuesdayId: Number(form.clubTuesdayId.value), memberIds, notes: form.notes.value }
    });
    await refreshHome();
    renderDinner();
  });
}

function dinnerMemberChoice(member, selectedIds = []) {
  const checked = selectedIds.includes(member.id);
  return `
    <label class="dinner-member-choice" data-dinner-member-name="${escapeHtml(member.name).toLowerCase()}">
      <input name="memberIds" type="checkbox" value="${member.id}" ${checked ? 'checked' : ''}>
      <span>${escapeHtml(member.name)}</span>
    </label>
  `;
}

function bindDinnerMemberSearch() {
  const search = document.querySelector('[data-dinner-member-search]');
  search?.addEventListener('input', () => {
    const term = normalizeText(search.value);
    document.querySelectorAll('[data-dinner-member-name]').forEach((row) => {
      row.hidden = !normalizeText(row.dataset.dinnerMemberName || '').includes(term);
    });
  });
}

async function renderNotices() {
  const notices = await api('/api/notices/active');
  screen().innerHTML = `
    <h1 class="screen-title">Recados</h1>
    <section class="grid two">
      <article class="card">
        <h2>Ativos</h2>
        <div class="stack">${notices.map(noticeCard).join('') || '<p class="empty">Sem recados ativos.</p>'}</div>
      </article>
      ${isAdmin() ? `
      <article class="card">
        <h2>Novo recado</h2>
        <form class="form-grid" id="notice-form">
          <label>Titulo<input name="title" required></label>
          <label>Mensagem<textarea name="message" rows="3" required></textarea></label>
          <label>Prioridade<select name="priority">${option('normal', 'Normal')}${option('high', 'Alta')}${option('urgent', 'Urgente')}</select></label>
          <label>Expira em<input name="expiresAt" type="datetime-local"></label>
          <button class="btn green" type="submit">Criar recado</button>
        </form>
      </article>` : ''}
    </section>
  `;
  document.querySelector('#notice-form')?.addEventListener('submit', async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    await api('/api/notices', {
      method: 'POST',
      body: {
        ...data,
        clubTuesdayId: state.tuesday.id,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : null
      }
    });
    await refreshHome();
    renderNotices();
  });
}

async function renderAdmin() {
  if (!isAdmin()) return renderForbidden('Admin');
  const members = await loadMembers(true);
  const activeCount = members.filter((member) => member.isActive).length;
  const poolCount = members.filter((member) => member.playsPool).length;
  const managerCount = members.filter((member) => ['admin', 'accountant'].includes(member.role)).length;
  screen().innerHTML = `
    <section class="admin-shell">
      <article class="screen-header admin-title-card">
        <div>
          <span class="eyebrow">Gestao</span>
          <h1>Admin</h1>
          <p class="screen-subtitle">Gerencie membros, perfis e permissoes do clube.</p>
        </div>
      </article>
      <article class="card admin-summary-card">
        <h2>Resumo administrativo</h2>
        <div class="admin-summary-grid">
          <div class="summary-tile"><span>Total</span><strong>${members.length}</strong></div>
          <div class="summary-tile strong"><span>Ativos</span><strong>${activeCount}</strong></div>
          <div class="summary-tile"><span>Sinuca</span><strong>${poolCount}</strong></div>
          <div class="summary-tile"><span>Gestores</span><strong>${managerCount}</strong></div>
        </div>
      </article>
      <section class="admin-layout">
        <article class="card admin-members-card">
          <div class="section-heading">
            <div>
              <h2>Membros cadastrados</h2>
              <p class="meta">${members.length} membros encontrados</p>
            </div>
          </div>
          <div class="admin-tools">
            <input data-member-search type="search" placeholder="Buscar membro">
            <div class="segmented compact filter-chips">
              <button class="segmented-btn active" type="button" data-member-filter="all">Todos</button>
              <button class="segmented-btn" type="button" data-member-filter="active">Ativos</button>
              <button class="segmented-btn" type="button" data-member-filter="inactive">Inativos</button>
              <button class="segmented-btn" type="button" data-member-filter="pool">Sinuca</button>
              <button class="segmented-btn" type="button" data-member-filter="admins">Admins</button>
            </div>
            <div class="actions form-actions">
              <button class="btn secondary full" type="button" data-export-backup>Exportar backup JSON</button>
              <label class="btn secondary full import-backup">Importar backup JSON<input data-import-backup type="file" accept="application/json" hidden></label>
            </div>
          </div>
          <div class="member-card-list">${members.map(memberCard).join('')}</div>
          <p class="empty" data-member-empty hidden>Nenhum membro encontrado.</p>
        </article>
        <article class="card admin-form-card">
          <h2 data-member-form-title>Novo membro</h2>
          <p class="meta" data-editing-member>Cadastre ou edite os dados do membro.</p>
          <form class="form-grid" id="member-form">
            <input type="hidden" name="id">
            <label>Nome<input name="name" placeholder="Ex: Joao da Silva" required></label>
            <label>Telefone<input name="phone" inputmode="tel" placeholder="Ex: 54999990000" required></label>
            <label>Aniversario<input name="birthDate" type="date"></label>
            <label>Perfil<select name="role" required>${option('member', 'Membro')}${option('player', 'Jogador')}${option('admin', 'Admin')}${option('accountant', 'Contador')}</select></label>
            <label class="switch-field">
              <input name="isActive" type="checkbox" checked>
              <span>Membro ativo</span>
            </label>
            <label class="switch-field">
              <input name="playsPool" type="checkbox">
              <span>Participa da sinuca</span>
            </label>
            <label>Observacoes<textarea name="notes" rows="4" placeholder="Informacoes importantes sobre o membro"></textarea></label>
            <div class="status" id="member-status"></div>
            <div class="actions form-actions"><button class="btn green full" type="submit">Salvar membro</button><button class="btn secondary full" type="reset">Limpar</button></div>
          </form>
        </article>
      </section>
    </section>
  `;
  document.querySelector('#member-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    const payload = {
      ...data,
      isActive: form.isActive.checked,
      playsPool: form.playsPool.checked || data.role === 'player'
    };
    const id = data.id;
    delete payload.id;
    await api(id ? `/api/members/${id}` : '/api/members', { method: id ? 'PUT' : 'POST', body: payload });
    state.members = [];
    renderAdmin();
  });
  document.querySelector('#member-form').addEventListener('reset', (event) => {
    window.setTimeout(() => {
      event.currentTarget.elements.id.value = '';
      event.currentTarget.isActive.checked = true;
      event.currentTarget.playsPool.checked = false;
      document.querySelector('[data-member-form-title]').textContent = 'Novo membro';
      document.querySelector('[data-editing-member]').textContent = 'Cadastre ou edite os dados do membro.';
      document.querySelector('#member-status').textContent = '';
    }, 0);
  });
  document.querySelectorAll('[data-edit-member]').forEach((button) => button.addEventListener('click', () => {
    const member = members.find((item) => item.id === Number(button.dataset.editMember));
    const form = document.querySelector('#member-form');
    form.elements.id.value = member.id;
    form.name.value = member.name;
    form.phone.value = member.phone;
    form.birthDate.value = member.birthDate || '';
    form.role.value = member.role;
    form.isActive.checked = member.isActive;
    form.playsPool.checked = member.playsPool;
    form.notes.value = member.notes || '';
    document.querySelector('[data-member-form-title]').textContent = 'Editar membro';
    document.querySelector('[data-editing-member]').textContent = `Editando: ${member.name}`;
    document.querySelector('.admin-form-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }));
  bindAdminFilters();
  bindBackupControls();
}

function memberCard(member) {
  const role = memberBadge(member.role);
  return `
    <div class="admin-member-card" data-member-row data-member-search-value="${escapeHtml(`${member.name} ${member.phone}`).toLowerCase()}" data-member-active="${member.isActive ? 'true' : 'false'}" data-member-pool="${member.playsPool ? 'true' : 'false'}" data-member-role="${member.role}">
      <div class="member-card-head">
        <div>
          <strong>${escapeHtml(member.name)}</strong>
          <span>${escapeHtml(member.phone)}</span>
        </div>
        <button class="btn secondary" data-edit-member="${member.id}" type="button">Editar</button>
      </div>
      <div class="member-badges">
        <span class="pill ${role.className}">${role.label}</span>
        <span class="pill ${member.isActive ? 'green' : ''}">${member.isActive ? 'Ativo' : 'Inativo'}</span>
        <span class="pill ${member.playsPool ? 'blue' : ''}">Sinuca: ${member.playsPool ? 'Sim' : 'Nao'}</span>
      </div>
      ${member.notes ? `<p class="meta">${escapeHtml(member.notes)}</p>` : ''}
    </div>
  `;
}

function memberBadge(role) {
  return ({
    admin: { label: 'Administrador', className: 'green' },
    accountant: { label: 'Contador', className: 'amber' },
    player: { label: 'Jogador', className: 'blue' },
    member: { label: 'Membro', className: '' }
  })[role] || { label: role || '', className: '' };
}

function bindAdminFilters() {
  const search = document.querySelector('[data-member-search]');
  const filterButtons = document.querySelectorAll('[data-member-filter]');
  const empty = document.querySelector('[data-member-empty]');
  let mode = 'all';
  const apply = () => {
    const term = normalizeText(search?.value || '');
    let visible = 0;
    document.querySelectorAll('[data-member-row]').forEach((row) => {
      const matchesSearch = normalizeText(row.dataset.memberSearchValue || '').includes(term);
      const matchesFilter = mode === 'all'
        || (mode === 'active' && row.dataset.memberActive === 'true')
        || (mode === 'inactive' && row.dataset.memberActive === 'false')
        || (mode === 'pool' && row.dataset.memberPool === 'true')
        || (mode === 'admins' && ['admin', 'accountant'].includes(row.dataset.memberRole));
      const show = matchesSearch && matchesFilter;
      row.hidden = !show;
      if (show) visible += 1;
    });
    if (empty) empty.hidden = visible > 0;
  };
  search?.addEventListener('input', apply);
  filterButtons.forEach((button) => button.addEventListener('click', () => {
    mode = button.dataset.memberFilter;
    filterButtons.forEach((item) => item.classList.toggle('active', item === button));
    apply();
  }));
}

function bindBackupControls() {
  document.querySelector('[data-export-backup]')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(exportClientState(), null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clube-das-tercas-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(link.href);
  });
  document.querySelector('[data-import-backup]')?.addEventListener('change', async (event) => {
    const [file] = event.currentTarget.files;
    if (!file) return;
    try {
      const stateBackup = JSON.parse(await file.text());
      await importClientState(stateBackup);
      await refreshHome();
      renderAdmin();
    } catch (error) {
      document.querySelector('#member-status').textContent = error.message;
    }
  });
}

async function renderReports() {
  if (!isFinanceOrAdmin()) return renderForbidden('Relatorios');
  const month = state.tuesday.date.slice(0, 7);
  const [attendance, drinks, charges, pool] = await Promise.all([
    api(`/api/reports/attendance?clubTuesdayId=${state.tuesday.id}`),
    api(`/api/reports/drinks?month=${month}`),
    api(`/api/reports/charges?month=${month}`),
    api(`/api/reports/pool?month=${month}`)
  ]);
  screen().innerHTML = `
    <section class="screen-header"><div><span class="eyebrow">Resumo administrativo</span><h1>Relatorios</h1></div></section>
    <section class="grid two">
      <article class="card">
        <h2>Presenca</h2>
        <ul class="compact-list">
          <li class="row"><span>Total janta</span><strong>${attendance.totalDinner}</strong></li>
          <li class="row"><span>Total futebol</span><strong>${attendance.totalFootball}</strong></li>
        </ul>
      </article>
      <article class="card">
        <h2>Bebidas por pessoa</h2>
        <ul class="compact-list">
          <li class="row"><span>Agua/Refri</span><strong>${drinks.totals.water_soda}</strong></li>
          <li class="row"><span>Cerveja</span><strong>${drinks.totals.beer}</strong></li>
        </ul>
        <div class="table-wrap">
          <table><thead><tr><th>Membro</th><th>Agua/Refri</th><th>Cerveja</th></tr></thead>
          <tbody>${Object.values(drinks.byMember).map((row) => `<tr><td>${escapeHtml(row.member.name)}</td><td>${row.water_soda}</td><td>${row.beer}</td></tr>`).join('')}</tbody></table>
        </div>
      </article>
      <article class="card">
        <h2>Cobrancas por pessoa</h2>
        <ul class="compact-list">
          <li class="row"><span>Pendente</span><strong>${money(charges.pending)}</strong></li>
          <li class="row"><span>Pago</span><strong>${money(charges.paid)}</strong></li>
        </ul>
        <div class="table-wrap">
          <table><thead><tr><th>Membro</th><th>Pendente</th><th>Pago</th><th>Total</th></tr></thead>
          <tbody>${Object.values(charges.byMember).map((row) => `<tr><td>${escapeHtml(row.member.name)}</td><td>${money(row.pending)}</td><td>${money(row.paid)}</td><td>${money(row.total)}</td></tr>`).join('')}</tbody></table>
        </div>
      </article>
      <article class="card">
        <h2>Sinuca</h2>
        ${pool.map((item) => `<h3>${escapeHtml(item.championship.name)}</h3><ul class="compact-list">${item.ranking.map((row) => `<li class="row"><span>${escapeHtml(row.teamName)}</span><strong>${row.points} pts</strong></li>`).join('')}</ul>`).join('')}
      </article>
    </section>
  `;
}

function renderForbidden(title) {
  screen().innerHTML = `<h1 class="screen-title">${title}</h1><article class="card"><p class="empty">Acesso restrito.</p></article>`;
}

async function loadMembers(includeInactive = false) {
  if (!state.members.length || includeInactive) {
    state.members = await api(`/api/members${includeInactive ? '?includeInactive=true&all=true' : ''}`);
  }
  return state.members;
}

function noticeCard(notice) {
  return `
    <div class="card ${notice.priority === 'urgent' ? 'notice-urgent' : notice.priority === 'high' ? 'notice-high' : ''}">
      <div class="row"><strong>${escapeHtml(notice.title)}</strong><span class="pill ${notice.priority === 'urgent' ? 'wine' : notice.priority === 'high' ? 'amber' : 'blue'}">${notice.priority}</span></div>
      <p>${escapeHtml(notice.message)}</p>
    </div>
  `;
}

function memberOptions(members = state.members, selected = []) {
  return members.map((member) => `<option value="${member.id}" ${selected.includes(member.id) ? 'selected' : ''}>${escapeHtml(member.name)}</option>`).join('');
}

function teamOptions(teams, selected = null) {
  return teams.map((team) => `<option value="${team.id}" ${Number(selected) === team.id ? 'selected' : ''}>${escapeHtml(team.name)}</option>`).join('');
}

function option(value, label, selected) {
  return `<option value="${value}" ${selected === value ? 'selected' : ''}>${label}</option>`;
}

function numericFields(data, fields) {
  const next = { ...data };
  for (const field of fields) {
    next[field] = Number(next[field]);
  }
  return next;
}

function screen() {
  return document.querySelector('#screen');
}

function isAdmin() {
  return state.me?.role === 'admin';
}

function isFinanceOrAdmin() {
  return ['admin', 'accountant'].includes(state.me?.role);
}

function canManageDrinks() {
  return Boolean(state.home?.canManageDrinks || isFinanceOrAdmin());
}

function roleLabel(role) {
  return ({ member: 'Membro', player: 'Jogador', admin: 'Administrador', accountant: 'Contador' })[role] || role || '';
}

function chargeStatusLabel(status) {
  return ({
    pending: { label: 'Pendente', className: 'amber' },
    paid: { label: 'Paga', className: 'green' },
    cancelled: { label: 'Cancelada', className: 'wine' }
  })[status] || { label: status || '', className: 'blue' };
}

function poolStatusLabel(status) {
  return ({
    open: { label: 'Aberto', className: 'blue' },
    confirmed: { label: 'Confirmado', className: 'green' },
    pending_approval: { label: 'Pendente', className: 'amber' },
    cancelled: { label: 'Cancelado', className: 'wine' }
  })[status] || { label: status || '', className: 'blue' };
}

function attendanceLabel(status) {
  return ({ dinner: 'Janta', football: 'Futebol', dinner_and_football: 'Janta + Futebol', not_going: 'Nao vou' })[status] || status;
}

function drinkLabel(type) {
  return ({ water_soda: 'Agua/Refri', beer: 'Cerveja' })[type] || type;
}

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(date) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

function normalizeText(value) {
  return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
