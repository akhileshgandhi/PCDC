const API = (process.env.NEXT_PUBLIC_API || "http://127.0.0.1:8001").trim().replace(/\/$/, "");

export type User = { id: number; full_name: string; email: string; role: string; status: string };

export async function login(email: string, password: string): Promise<{ access_token: string; user: User }> {
  const r = await fetch(`${API}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(e.detail || "Login failed");
  }
  return r.json();
}

export function saveSession(token: string, user: User) {
  localStorage.setItem("pcdc_token", token);
  localStorage.setItem("pcdc_user", JSON.stringify(user));
}
export function getUser(): User | null {
  if (typeof window === "undefined") return null;
  const u = localStorage.getItem("pcdc_user");
  return u ? JSON.parse(u) : null;
}
export function getToken(): string | null {
  return typeof window === "undefined" ? null : localStorage.getItem("pcdc_token");
}
export function logout() {
  localStorage.removeItem("pcdc_token");
  localStorage.removeItem("pcdc_user");
  window.location.href = "/login";
}

export async function api(path: string, opts: RequestInit = {}): Promise<any> {
  const t = getToken();
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(t ? { Authorization: `Bearer ${t}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (r.status === 401) {
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Unauthorized");
  }
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    let msg = e.detail;
    if (Array.isArray(msg)) msg = msg.map((d: any) => (d?.loc ? `${d.loc.slice(-1)}: ` : "") + (d?.msg || JSON.stringify(d))).join("; ");
    throw new Error((typeof msg === "string" && msg) || `Error ${r.status}`);
  }
  return r.status === 204 ? null : r.json();
}
