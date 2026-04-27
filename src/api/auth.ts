import type { UserInfo } from '../types';

const TOKEN_KEY   = 'hime_auth_token';
const EXPIRY_KEY  = 'hime_auth_expiry';
const EXPIRE_DAYS = 5;

// ── Token 管理 ────────────────────────────────────────────────────────────────

export function saveToken(token: string): void {
  const expiry = Date.now() + EXPIRE_DAYS * 24 * 60 * 60 * 1000;
  localStorage.setItem(TOKEN_KEY,  token);
  localStorage.setItem(EXPIRY_KEY, String(expiry));
  console.log('[Auth] Token saved to localStorage, expires:', new Date(expiry).toLocaleString());
}

export function getToken(): string | null {
  const token  = localStorage.getItem(TOKEN_KEY);
  const expiry = Number(localStorage.getItem(EXPIRY_KEY) ?? 0);
  console.log('[Auth] getToken() called, token present:', !!token, 'expiry:', new Date(expiry).toLocaleString());
  if (!token || Date.now() > expiry) {
    clearToken();
    return null;
  }
  return token;
}

export function clearToken(): void {
  console.log('[Auth] Token cleared from localStorage');
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
}

function authHeaders(): Record<string, string> {
  const token = getToken();
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    console.log('[Auth] Sending Authorization header with token (first 20 chars):', token.substring(0, 20) + '...');
  }
  return headers;
}

// ── API 呼叫 ──────────────────────────────────────────────────────────────────

export interface AuthResult {
  token: string;
  user:  UserInfo;
}

export async function apiRegister(
  username:   string,
  password:   string,
  nickname:   string,
  self_intro: string,
): Promise<AuthResult> {
  const res = await fetch('/account/register', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, password, nickname, self_intro }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as AuthResult;
}

export async function apiLogin(username: string, password: string): Promise<AuthResult> {
  const res = await fetch('/account/login', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ username, password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as AuthResult;
}

export async function apiGetMe(): Promise<UserInfo | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch('/account/me', {
    headers: authHeaders(),
    method: 'GET',
  });
  if (!res.ok) {
    console.warn('[apiGetMe] 驗證失敗:', res.status);
    clearToken();
    return null;
  }
  const json = await res.json();
  return json.user as UserInfo;
}

export async function apiUpdateProfile(
  nickname:   string,
  self_intro: string,
): Promise<UserInfo> {
  const res = await fetch('/account/profile', {
    method:  'PUT',
    headers: authHeaders(),
    body:    JSON.stringify({ nickname, self_intro }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json.user as UserInfo;
}
