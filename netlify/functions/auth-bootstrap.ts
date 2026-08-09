import {
  listUsers,
  getUser,
  saveUser,
  hashPassword,
  signToken,
  toSessionUser,
  normalizeUsername,
  validateUsername,
  validatePassword,
  sanitizeProfile,
  json,
} from "./_shared/auth";

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Método no permitido." });

  const setupKey = process.env.ADMIN_SETUP_KEY;
  if (!setupKey) {
    return json(500, {
      error: "Falta configurar ADMIN_SETUP_KEY en las variables de entorno de Netlify.",
    });
  }

  let body: { setupKey?: string; username?: string; password?: string; profile?: unknown };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Cuerpo inválido." });
  }

  if (body.setupKey !== setupKey) {
    return json(403, { error: "Clave de configuración incorrecta." });
  }

  const existing = await listUsers();
  if (existing.length > 0) {
    return json(409, { error: "El sistema ya tiene una cuenta de administrador configurada." });
  }

  const usernameRaw = body.username ?? "";
  const passwordRaw = body.password ?? "";

  const usernameError = validateUsername(usernameRaw);
  if (usernameError) return json(400, { error: usernameError });
  const passwordError = validatePassword(passwordRaw);
  if (passwordError) return json(400, { error: passwordError });

  const username = normalizeUsername(usernameRaw);
  if (await getUser(username)) return json(409, { error: "Ese usuario ya existe." });

  const now = new Date().toISOString();
  const user = {
    username,
    displayUsername: usernameRaw.trim(),
    passwordHash: await hashPassword(passwordRaw),
    role: "admin" as const,
    profile: sanitizeProfile(body.profile),
    createdAt: now,
    updatedAt: now,
  };
  await saveUser(user);

  const token = signToken(user);
  return json(201, { token, user: toSessionUser(user) });
};
