import { getUser, verifyPassword, signToken, toSessionUser, json } from "./_shared/auth";

export default async (req: Request) => {
  if (req.method !== "POST") return json(405, { error: "Método no permitido." });

  let body: { username?: string; password?: string };
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Cuerpo inválido." });
  }

  const usernameRaw = body.username ?? "";
  const passwordRaw = body.password ?? "";
  if (!usernameRaw || !passwordRaw) {
    return json(400, { error: "Usuario y contraseña son obligatorios." });
  }

  const user = await getUser(usernameRaw);
  if (!user) return json(401, { error: "Usuario o contraseña incorrectos." });

  const valid = await verifyPassword(passwordRaw, user.passwordHash);
  if (!valid) return json(401, { error: "Usuario o contraseña incorrectos." });

  const token = signToken(user);
  return json(200, { token, user: toSessionUser(user) });
};
