import {
  requireAdmin,
  listUsers,
  getUser,
  saveUser,
  deleteUser,
  hashPassword,
  normalizeUsername,
  validateUsername,
  validatePassword,
  sanitizeProfile,
  emptyProfile,
  json,
} from "./_shared/auth";

function publicUser(u: Awaited<ReturnType<typeof getUser>>) {
  if (!u) return null;
  return {
    username: u.username,
    displayUsername: u.displayUsername,
    role: u.role,
    profile: u.profile,
    createdAt: u.createdAt,
    updatedAt: u.updatedAt,
  };
}

export default async (req: Request) => {
  const admin = await requireAdmin(req);
  if (!admin) return json(403, { error: "Se requieren permisos de administrador." });

  if (req.method === "GET") {
    const users = await listUsers();
    return json(
      200,
      users
        .map(publicUser)
        .sort((a, b) => (a && b ? a.displayUsername.localeCompare(b.displayUsername) : 0))
    );
  }

  if (req.method === "POST") {
    let body: { username?: string; password?: string; role?: string; profile?: unknown };
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Cuerpo inválido." });
    }

    const usernameRaw = body.username ?? "";
    const passwordRaw = body.password ?? "";
    const role = body.role === "admin" ? "admin" : "profesional";

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
      role: role as "admin" | "profesional",
      profile: body.profile ? sanitizeProfile(body.profile) : emptyProfile(),
      createdAt: now,
      updatedAt: now,
    };
    await saveUser(user);
    return json(201, publicUser(user));
  }

  if (req.method === "PATCH") {
    let body: { username?: string; newPassword?: string; role?: string; profile?: unknown };
    try {
      body = await req.json();
    } catch {
      return json(400, { error: "Cuerpo inválido." });
    }
    const target = await getUser(body.username ?? "");
    if (!target) return json(404, { error: "Usuario no encontrado." });

    if (body.newPassword) {
      const passwordError = validatePassword(body.newPassword);
      if (passwordError) return json(400, { error: passwordError });
      target.passwordHash = await hashPassword(body.newPassword);
    }
    if (body.role === "admin" || body.role === "profesional") {
      if (target.username === admin.username && body.role !== "admin") {
        return json(400, { error: "No puedes quitarte tu propio rol de administrador." });
      }
      target.role = body.role;
    }
    if (body.profile) {
      target.profile = sanitizeProfile(body.profile);
    }
    target.updatedAt = new Date().toISOString();
    await saveUser(target);
    return json(200, publicUser(target));
  }

  if (req.method === "DELETE") {
    const url = new URL(req.url);
    const usernameRaw = url.searchParams.get("username") ?? "";
    const username = normalizeUsername(usernameRaw);
    if (!username) return json(400, { error: "Falta el usuario a eliminar." });
    if (username === admin.username) {
      return json(400, { error: "No puedes eliminar tu propia cuenta mientras tienes sesión activa." });
    }
    const target = await getUser(username);
    if (!target) return json(404, { error: "Usuario no encontrado." });
    await deleteUser(username);
    return json(200, { ok: true });
  }

  return json(405, { error: "Método no permitido." });
};
