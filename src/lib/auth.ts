const ACCESS_TOKEN_KEY = "foxleaf.access_token";
const REFRESH_TOKEN_KEY = "foxleaf.refresh_token";

function hasStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function saveTokens(access_token: string, refresh_token: string): void {
  if (!hasStorage()) return;
  window.localStorage.setItem(ACCESS_TOKEN_KEY, access_token);
  window.localStorage.setItem(REFRESH_TOKEN_KEY, refresh_token);
}

export function getAccessToken(): string | null {
  if (!hasStorage()) return null;
  return window.localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function getRefreshToken(): string | null {
  if (!hasStorage()) return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function clearTokens(): void {
  if (!hasStorage()) return;
  window.localStorage.removeItem(ACCESS_TOKEN_KEY);
  window.localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return getAccessToken() !== null;
}
