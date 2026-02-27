const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

type ApiOptions = Omit<RequestInit, "body"> & { body?: object };

export async function api<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...opts.headers,
  };
  const res = await fetch(`${API_URL}${path}`, {
    ...opts,
    credentials: "include",
    headers,
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? res.statusText);
  }
  return res.json();
}

export function clearAdminAuth() {
  if (typeof window !== "undefined") {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
    fetch(`${apiUrl}/auth/logout`, { method: "POST", credentials: "include" }).catch(() => {});
  }
}
