export interface ProfessionalProfile {
  responsable: string;
  dniResp: string;
  cargo: string;
  estab: string;
  upss: string;
}

export type Role = "admin" | "profesional";

export interface SessionUser {
  username: string;
  displayUsername: string;
  role: Role;
  profile: ProfessionalProfile;
}

const TOKEN_KEY = "his-atalaya-token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

class ApiError extends Error {}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const res = await fetch(`/api/${path}`, { ...options, headers });
  let data: unknown = null;
  try {
    data = await res.json();
  } catch {
    // no body
  }
  if (!res.ok) {
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error: unknown }).error)
        : `Error ${res.status}`;
    throw new ApiError(message);
  }
  return data as T;
}

export function authStatus() {
  return request<{ bootstrapped: boolean }>("auth-status");
}

export function bootstrapAdmin(input: { setupKey: string; username: string; password: string }) {
  return request<{ token: string; user: SessionUser }>("auth-bootstrap", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: { username: string; password: string }) {
  return request<{ token: string; user: SessionUser }>("auth-login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function me() {
  return request<{ user: SessionUser }>("auth-me");
}

export function updateProfile(input: { profile?: ProfessionalProfile; currentPassword?: string; newPassword?: string }) {
  return request<{ user: SessionUser }>("profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export interface AdminUserRecord {
  username: string;
  displayUsername: string;
  role: Role;
  profile: ProfessionalProfile;
  createdAt: string;
  updatedAt: string;
}

export function listUsers() {
  return request<AdminUserRecord[]>("users");
}

export function createUser(input: { username: string; password: string; role: Role; profile?: Partial<ProfessionalProfile> }) {
  return request<AdminUserRecord>("users", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateUser(input: { username: string; newPassword?: string; role?: Role; profile?: Partial<ProfessionalProfile> }) {
  return request<AdminUserRecord>("users", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteUser(username: string) {
  return request<{ ok: true }>(`users?username=${encodeURIComponent(username)}`, {
    method: "DELETE",
  });
}

export type HisCodeStatus = "active" | "inactive";
export interface HisCode {
  id: number;
  code: string;
  description: string;
  category: string;
  status: HisCodeStatus;
  createdAt: string;
  updatedAt: string;
}

export function listHisCodes() {
  return request<HisCode[]>("his-codes");
}

export function saveHisCode(input: Omit<HisCode, "id" | "createdAt" | "updatedAt"> & { id?: number }) {
  return request<HisCode>("his-codes", {
    method: input.id ? "PATCH" : "POST",
    body: JSON.stringify(input),
  });
}

export function deleteHisCode(id: number) {
  return request<{ ok: true }>(`his-codes?id=${id}`, { method: "DELETE" });
}
