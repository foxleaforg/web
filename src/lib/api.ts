import { clearTokens, getAccessToken, getRefreshToken, saveTokens } from "@/lib/auth";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

type JsonBody = unknown;

interface ApiFetchOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: JsonBody;
  headers?: Record<string, string>;
  /**
   * Internal. Set on the refresh call itself and on the post-refresh retry so
   * a 401 can never kick off another refresh (one retry, no recursion).
   */
  skipRefresh?: boolean;
}

const REFRESH_PATH = "/auth/refresh";
const LOGIN_PATH = "/auth/login";

/**
 * Endpoints where a 401 is the real answer rather than an expired session.
 * Retrying them is pointless, and a failed refresh would clear a perfectly
 * good session just because someone mistyped their password.
 */
const NO_REFRESH_PATHS = [REFRESH_PATH, LOGIN_PATH];

type RefreshResponse = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
};

/**
 * In-flight refresh, shared by every request that 401s while it runs. Without
 * this, a page that fires several authenticated requests at once would send
 * one refresh per request and rotate the refresh token out from under itself.
 */
let refreshInFlight: Promise<string | null> | null = null;

/**
 * Returns a fresh access token, or null if the session is unrecoverable (in
 * which case all tokens have been cleared and the caller must log in again).
 */
function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  refreshInFlight = (async () => {
    const refresh_token = getRefreshToken();
    if (!refresh_token) {
      clearTokens();
      return null;
    }

    try {
      const data = await apiFetch<RefreshResponse>(REFRESH_PATH, {
        method: "POST",
        body: { refresh_token },
        skipRefresh: true,
      });
      saveTokens(data.access_token, data.refresh_token);
      return data.access_token;
    } catch {
      // Refresh token expired or rejected — the session is over.
      clearTokens();
      return null;
    }
  })().finally(() => {
    refreshInFlight = null;
  });

  return refreshInFlight;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, headers, skipRefresh, ...rest } = options;

  const url = path.startsWith("http") ? path : `${API_URL}${path}`;
  const serializedBody = body === undefined ? undefined : JSON.stringify(body);

  const send = (authToken?: string | null) => {
    const finalHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      ...headers,
    };

    if (authToken) {
      finalHeaders["Authorization"] = `Bearer ${authToken}`;
    }

    return fetch(url, {
      ...rest,
      headers: finalHeaders,
      body: serializedBody,
    });
  };

  // Storage is the single source of truth for the current token, read fresh on
  // every request so a background refresh is picked up immediately.
  const token = getAccessToken();
  let response = await send(token);

  // An expired access token on an authenticated request is recoverable: swap in
  // a new token and replay the request once. Unauthenticated 401s (a failed
  // login, say) are real errors and fall straight through.
  if (
    response.status === 401 &&
    token &&
    !skipRefresh &&
    !NO_REFRESH_PATHS.some((p) => url.endsWith(p))
  ) {
    const freshToken = await refreshAccessToken();
    if (freshToken) {
      response = await send(freshToken);
    }
  }

  if (!response.ok) {
    let detail: string | undefined;
    try {
      const data = await response.json();
      detail =
        typeof data?.detail === "string"
          ? data.detail
          : JSON.stringify(data?.detail ?? data);
    } catch {
      detail = response.statusText;
    }
    throw new Error(detail || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  get: <T = unknown>(path: string) => apiFetch<T>(path, { method: "GET" }),
  post: <T = unknown>(path: string, body: JsonBody) =>
    apiFetch<T>(path, { method: "POST", body }),
  put: <T = unknown>(path: string, body: JsonBody) =>
    apiFetch<T>(path, { method: "PUT", body }),
  delete: <T = unknown>(path: string) => apiFetch<T>(path, { method: "DELETE" }),
};
