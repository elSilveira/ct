import { createHash } from 'node:crypto';

const PHONE_HASH_SALT = 'clube-das-tercas-static-phone-v1';

export function protectStatePhones(state) {
  for (const member of state.members ?? []) {
    if (!member.phoneHash && member.phone) {
      member.phoneHash = hashPhone(member.phone);
    }
    member.phone = maskPhone(member.phone);
  }
  protectNestedPhones(state);
  state.sessions ??= [];
  state.counters ??= {};
  state.counters.sessions ??= 1;
  return state;
}

export function cloneProtectedState(state) {
  return protectStatePhones(JSON.parse(JSON.stringify(state)));
}

export function loginByProtectedPhone(state, phone) {
  const normalized = normalizePhone(phone);
  const phoneHash = hashPhone(normalized);
  const member = state.members.find((item) => (
    item.phoneHash === phoneHash ||
    (!item.phoneHash && normalizePhone(item.phone) === normalized)
  ));
  if (!member) {
    throw userError('Telefone cadastrado nao encontrado. Procure um administrador.', 401);
  }
  if (!member.isActive) {
    throw userError('Membro inativo. Procure um administrador.', 403);
  }
  state.sessions ??= [];
  state.counters ??= {};
  state.counters.sessions ??= 1;
  const sessionId = state.counters.sessions++;
  const session = {
    id: sessionId,
    token: `session-${member.id}-${Date.now()}-${state.counters.sessions}`,
    memberId: member.id,
    createdAt: state.nowIso ?? new Date().toISOString()
  };
  state.sessions.push(session);
  return { member, token: session.token };
}

export function assertUniquePhoneHash(state, phone, ignoredMemberId = null, active = true) {
  if (!active) return;
  const phoneHash = hashPhone(phone);
  const duplicate = state.members.find((member) => (
    member.id !== ignoredMemberId &&
    member.isActive &&
    member.phoneHash === phoneHash
  ));
  if (duplicate) {
    throw userError('Ja existe um membro ativo com este telefone.', 409);
  }
}

export function applyPhonePrivacy(member, phone) {
  member.phoneHash = hashPhone(phone);
  member.phone = maskPhone(phone);
  return member;
}

export function hashPhone(phone) {
  const normalized = normalizePhone(phone);
  return createHash('sha256')
    .update(`${PHONE_HASH_SALT}:${normalized}`)
    .digest('hex');
}

function maskPhone(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return '';
  return `***${normalized.slice(-4)}`;
}

function normalizePhone(phone) {
  return String(phone ?? '').replace(/\D/g, '');
}

function protectNestedPhones(value, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) {
    return;
  }
  seen.add(value);
  if (Object.hasOwn(value, 'phone')) {
    if (!value.phoneHash && value.phone) {
      value.phoneHash = hashPhone(value.phone);
    }
    value.phone = maskPhone(value.phone);
  }
  for (const child of Object.values(value)) {
    protectNestedPhones(child, seen);
  }
}

function userError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}
