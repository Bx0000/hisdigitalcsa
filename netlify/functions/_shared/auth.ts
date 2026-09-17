import { getStore } from "@netlify/blobs";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

export interface ProfessionalProfile {
  responsable: string;
  dniResp: string;
  cargo: string;
  estab: string;
  upss: string;
}

export type Role = "admin" | "profesional";

export interface StoredUser {
  username: string; // lowercase, unique
  displayUsername: string; // original casing for display
  passwordHash: string;
  role: Role;
  profile: ProfessionalProfile;
  createdAt: string;
  updatedAt: string;
}

export interface SessionUser {
  username: string;
  displayUsername: string;
  role: Role;
  profile: ProfessionalProfile;
}

const EMPTY_PROFILE: ProfessionalProfile = {
  responsable: "",
  dniResp: "",
  cargo: "",
  estab: "CENTRO DE SALUD ATALAYA",
  upss: "",
};

export function usersStore() {
  return getStore("his-atalaya-users");
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

export function validateUsername(raw: string): string | null {
  const u = raw.trim();
  if (u.length < 3 || u.length > 32) return "El usuario debe tener entre 3 y 32 caracteres.";
  if (!/^[a-zA-Z0-9._-]+$/.test(u)) return "El usuario solo puede tener letras, números, punto, guion y guion bajo.";
  return null;
}

export function validatePassword(raw: string): string | null {
  if (raw.length < 8) return "La contraseña debe tener al menos 8 caracteres.";
  return null;
}

export async function getUser(usernameRaw: string): Promise<StoredUser | null> {
  const store = usersStore();
  const key = normalizeUsername(usernameRaw);
  const data = await store.get(key, { type: "json" });
  return (data as StoredUser) ?? null;
}

export async function saveUser(user: StoredUser): Promise<void> {
  const store = usersStore();
  await store.setJSON(user.username, user);
}

export async function deleteUser(usernameRaw: string): Promise<void> {
  const store = usersStore();
  await store.delete(normalizeUsername(usernameRaw));
}

export async function listUsers(): Promise<StoredUser[]> {
  const store = usersStore();
  const { blobs } = await store.list();
  const users: StoredUser[] = [];
  for (const b of blobs) {
    const data = await store.get(b.key, { type: "json" });
    if (data) users.push(data as StoredUser);
  }
  return users;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function jwtSecret(): string {
  const secret = process.env.AUTH_JWT_SECRET;
  if (!secret) throw new Error("AUTH_JWT_SECRET no está configurado en las variables de entorno de Netlify.");
  return secret;
}

export function signToken(user: StoredUser): string {
  const payload: { username: string; role: Role } = { username: user.username, role: user.role };
  return jwt.sign(payload, jwtSecret(), { expiresIn: "12h" });
}

export function verifyToken(token: string): { username: string; role: Role } | null {
  try {
    return jwt.verify(token, jwtSecret()) as { username: string; role: Role };
  } catch {
    return null;
  }
}

export function toSessionUser(user: StoredUser): SessionUser {
  return {
    username: user.username,
    displayUsername: user.displayUsername,
    role: user.role,
    profile: user.profile ?? EMPTY_PROFILE,
  };
}

export function emptyProfile(): ProfessionalProfile {
  return { ...EMPTY_PROFILE };
}

export function sanitizeProfile(raw: unknown): ProfessionalProfile {
  const p = (raw ?? {}) as Partial<ProfessionalProfile>;
  return {
    responsable: typeof p.responsable === "string" ? p.responsable.slice(0, 200) : "",
    dniResp: typeof p.dniResp === "string" ? p.dniResp.slice(0, 20) : "",
    cargo: typeof p.cargo === "string" ? p.cargo.slice(0, 100) : "",
    estab: typeof p.estab === "string" && p.estab ? p.estab.slice(0, 200) : EMPTY_PROFILE.estab,
    upss: typeof p.upss === "string" ? p.upss.slice(0, 100) : "",
  };
}

export function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header) return null;
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

export async function requireAuth(req: Request): Promise<{ token: string; username: string; role: Role } | null> {
  const token = getBearerToken(req);
  if (!token) return null;
  const claims = verifyToken(token);
  if (!claims) return null;
  return { token, ...claims };
}

export async function requireAdmin(req: Request): Promise<{ token: string; username: string; role: Role } | null> {
  const auth = await requireAuth(req);
  if (!auth) return null;
  const user = await getUser(auth.username);
  if (!user || user.role !== "admin") return null;
  return { ...auth, role: "admin" };
}
