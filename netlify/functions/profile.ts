import {
  requireAuth,
  getUser,
  saveUser,
  verifyPassword,
  hashPassword,
  validatePassword,
  sanitizeProfile,
  toSessionUser,
  json,
} from "./_shared/auth";

export default async (req: Request) => {
  if (req.method !== "PATCH") return json(405, { error: "Método no permitido." });

  const auth = await requireAuth(req);
  if (!auth) return json(401, { error: "Sesión inválida o expirada." });

  const user = await getUser(auth.username);
  if (!user) return json(401, { error: "La cuenta ya no existe." });

  let body: {
    profile?: unknown;
    currentPassword?: string;
    newPassword?: string;
  };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Cuerpo inválido." });
  }

  if (body.profile) {
    user.profile = sanitizeProfile(body.profile);
  }

  if (body.newPassword) {
    if (!body.currentPassword || !(await verifyPassword(body.currentPassword, user.passwordHash))) {
      return json(403, { error: "La contraseña actual no es correcta." });
    }
    const passwordError = validatePassword(body.newPassword);
    if (passwordError) return json(400, { error: passwordError });
    user.passwordHash = await hashPassword(body.newPassword);
  }

  user.updatedAt = new Date().toISOString();
  await saveUser(user);

  return json(200, { user: toSessionUser(user) });
};
