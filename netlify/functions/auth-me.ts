import { requireAuth, getUser, toSessionUser, json } from "./_shared/auth";

export default async (req: Request) => {
  const auth = await requireAuth(req);
  if (!auth) return json(401, { error: "Sesión inválida o expirada." });

  const user = await getUser(auth.username);
  if (!user) return json(401, { error: "La cuenta ya no existe." });

  return json(200, { user: toSessionUser(user) });
};
