import 'server-only';

import crypto from 'crypto';
import { cookies } from 'next/headers';
import { Timestamp } from 'firebase-admin/firestore';

export const PROJECT_MATCH_SESSION_COOKIE = 'ofp_project_match_sessions';
const PROJECT_MATCH_SESSION_SECRET =
  process.env.PROJECT_MATCH_SESSION_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  'dev-project-match-secret';

export type ProjectMatchSessionGrant = {
  threadId: string;
  grantedAt: number;
  expiresAt: number;
};

export type ProjectMatchSessionState = {
  grants: Record<string, ProjectMatchSessionGrant>;
};

export function normalizeProjectMatchEmail(email: string) {
  return email.trim().toLowerCase();
}

export function hashProjectMatchToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function generateProjectMatchToken() {
  return crypto.randomBytes(32).toString('hex');
}

export function toProjectMatchTimestamp(date: Date | number | string | Timestamp | undefined | null) {
  if (!date) return undefined;
  if (date instanceof Timestamp) return date;
  if (date instanceof Date) return Timestamp.fromDate(date);
  if (typeof date === 'number') return Timestamp.fromMillis(date);
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? undefined : Timestamp.fromDate(parsed);
}

function signPayload(payload: string) {
  return crypto.createHmac('sha256', PROJECT_MATCH_SESSION_SECRET).update(payload).digest('hex');
}

function serializeState(state: ProjectMatchSessionState) {
  const payload = Buffer.from(JSON.stringify(state)).toString('base64url');
  const signature = signPayload(payload);
  return `${payload}.${signature}`;
}

function deserializeState(raw: string | undefined | null): ProjectMatchSessionState | null {
  if (!raw) return null;
  const [payload, signature] = raw.split('.');
  if (!payload || !signature) return null;
  if (signPayload(payload) !== signature) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as ProjectMatchSessionState;
    if (!parsed || typeof parsed !== 'object' || !parsed.grants) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function readProjectMatchSession(): Promise<ProjectMatchSessionState> {
  const cookieStore = await cookies();
  const state = deserializeState(cookieStore.get(PROJECT_MATCH_SESSION_COOKIE)?.value);
  return state ?? { grants: {} };
}

export async function grantProjectMatchThreadAccess(threadId: string, expiresAt: Date) {
  const cookieStore = await cookies();
  const currentState = await readProjectMatchSession();
  const nextState: ProjectMatchSessionState = {
    grants: {
      ...currentState.grants,
      [threadId]: {
        threadId,
        grantedAt: Date.now(),
        expiresAt: expiresAt.getTime(),
      },
    },
  };

  cookieStore.set(PROJECT_MATCH_SESSION_COOKIE, serializeState(nextState), {
    path: '/',
    httpOnly: false,
    maxAge: Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000)),
  });
}

export async function clearProjectMatchSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(PROJECT_MATCH_SESSION_COOKIE, '', {
    path: '/',
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 0,
  });
}

export async function clearExpiredProjectMatchSessionGrants() {
  const currentState = await readProjectMatchSession();
  const nextState: ProjectMatchSessionState = { grants: {} };
  const now = Date.now();

  for (const [threadId, grant] of Object.entries(currentState.grants)) {
    if (grant.expiresAt > now) {
      nextState.grants[threadId] = grant;
    }
  }

  return nextState;
}

export async function getProjectMatchGrant(threadId: string) {
  const state = await clearExpiredProjectMatchSessionGrants();
  const grant = state.grants[threadId];
  if (!grant || grant.expiresAt <= Date.now()) {
    return null;
  }
  return grant;
}
