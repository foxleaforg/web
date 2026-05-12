export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

type JsonBody = unknown;

interface ApiFetchOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: JsonBody;
  token?: string | null;
  headers?: Record<string, string>;
}

export async function apiFetch<T = unknown>(
  path: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { body, token, headers, ...rest } = options;

  const finalHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    ...headers,
  };

  if (token) {
    finalHeaders["Authorization"] = `Bearer ${token}`;
  }

  const url = path.startsWith("http") ? path : `${API_URL}${path}`;

  const response = await fetch(url, {
    ...rest,
    headers: finalHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

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
  get: <T = unknown>(path: string, token?: string | null) =>
    apiFetch<T>(path, { method: "GET", token }),
  post: <T = unknown>(path: string, body: JsonBody, token?: string | null) =>
    apiFetch<T>(path, { method: "POST", body, token }),
  put: <T = unknown>(path: string, body: JsonBody, token?: string | null) =>
    apiFetch<T>(path, { method: "PUT", body, token }),
  delete: <T = unknown>(path: string, token?: string | null) =>
    apiFetch<T>(path, { method: "DELETE", token }),
};
