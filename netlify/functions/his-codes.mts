import type { Config } from "@netlify/functions";
import { asc, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { hisCodes } from "../../db/schema.js";
import { json, requireAdmin, requireAuth } from "./_shared/auth.js";

const validStatuses = new Set(["active", "inactive"]);

function cleanBody(body: Record<string, unknown>) {
  return {
    code: String(body.code ?? "").trim().toUpperCase().slice(0, 30),
    description: String(body.description ?? "").trim().slice(0, 500),
    category: String(body.category ?? "").trim().slice(0, 120),
    status: String(body.status ?? "active"),
  };
}

export default async (req: Request) => {
  const auth = await requireAuth(req);
  if (!auth) return json(401, { error: "Sesión no válida." });

  if (req.method === "GET") {
    return json(200, await db.select().from(hisCodes).orderBy(asc(hisCodes.code)));
  }

  if (!(await requireAdmin(req))) {
    return json(403, { error: "Se requieren permisos de administrador." });
  }

  if (req.method === "POST" || req.method === "PATCH") {
    let raw: Record<string, unknown>;
    try { raw = await req.json(); } catch { return json(400, { error: "Datos inválidos." }); }
    const data = cleanBody(raw);
    if (!data.code || !data.description || !data.category || !validStatuses.has(data.status)) {
      return json(400, { error: "Completa todos los campos correctamente." });
    }

    try {
      if (req.method === "POST") {
        const [created] = await db.insert(hisCodes).values(data).returning();
        return json(201, created);
      }
      const id = Number(raw.id);
      if (!Number.isInteger(id)) return json(400, { error: "Código inválido." });
      const [updated] = await db.update(hisCodes).set({ ...data, updatedAt: new Date() }).where(eq(hisCodes.id, id)).returning();
      return updated ? json(200, updated) : json(404, { error: "Código no encontrado." });
    } catch (error) {
      if ((error as { code?: string }).code === "23505") return json(409, { error: "El código CIE-10 / HIS ya existe." });
      throw error;
    }
  }

  return json(405, { error: "Método no permitido." });
};

export const config: Config = { path: "/api/his-codes" };
