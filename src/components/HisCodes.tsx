import { useEffect, useMemo, useState } from "react";
import * as api from "../lib/api";
import type { HisCode, HisCodeStatus } from "../lib/api";

const CATEGORIES = ["Medicina general", "Enfermería", "Obstetricia", "Odontología", "Psicología", "Laboratorio", "Otro"];
const EMPTY = { code: "", description: "", category: CATEGORIES[0], status: "active" as HisCodeStatus };

export default function HisCodes({ isAdmin, onClose }: { isAdmin: boolean; onClose: () => void }) {
  const [items, setItems] = useState<HisCode[]>([]);
  const [form, setForm] = useState<{ id?: number; code: string; description: string; category: string; status: HisCodeStatus }>(EMPTY);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true); setError("");
    try { setItems(await api.listHisCodes()); } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? items.filter((item) => `${item.code} ${item.description}`.toLowerCase().includes(q)) : items;
  }, [items, query]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    try { await api.saveHisCode(form); setForm(EMPTY); await load(); }
    catch (e) { setError((e as Error).message); }
    finally { setSaving(false); }
  };

  const edit = (item: HisCode) => setForm({ id: item.id, code: item.code, description: item.description, category: item.category, status: item.status });
  const remove = async (item: HisCode) => {
    if (!window.confirm(`¿Eliminar el código ${item.code}?`)) return;
    try { await api.deleteHisCode(item.id); if (form.id === item.id) setForm(EMPTY); await load(); }
    catch (e) { setError((e as Error).message); }
  };

  return <main className="codes-screen">
    <div className="codes-shell">
      <header className="codes-header">
        <div><span className="auth-kicker">CATÁLOGO CLÍNICO</span><h1>Códigos HIS</h1><p>{isAdmin ? "Administración completa del catálogo institucional." : "Consulta del catálogo institucional."}</p></div>
        <button className="btn btn-ghost btn-lg" onClick={onClose}>← Volver</button>
      </header>

      {error && <div className="auth-note auth-error">{error}</div>}

      {isAdmin && <form className="codes-form" onSubmit={submit}>
        <div className="codes-form-title"><h2>{form.id ? "Editar código" : "Nuevo código"}</h2>{form.id && <button type="button" className="btn btn-ghost" onClick={() => setForm(EMPTY)}>Cancelar edición</button>}</div>
        <div className="codes-grid">
          <label className="fg"><span>Código HIS</span><input required maxLength={30} value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="Ej. 99213" /></label>
          <label className="fg codes-description"><span>Descripción / Procedimiento</span><input required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Descripción clínica" /></label>
          <label className="fg"><span>Categoría / Especialidad</span><select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
          <label className="fg"><span>Estado</span><select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as HisCodeStatus })}><option value="active">Activo</option><option value="inactive">Inactivo</option></select></label>
        </div>
        <div className="admin-actions"><button className="btn btn-primary btn-lg" disabled={saving}>{saving ? "Guardando…" : form.id ? "Actualizar" : "Guardar"}</button></div>
      </form>}

      <section className="codes-table-card">
        <div className="codes-tools"><div><h2>Catálogo</h2><span>{filtered.length} registros</span></div><label className="codes-search"><span>Buscar</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Código o descripción…" /></label></div>
        <div className="admin-table-wrap"><table className="admin-table codes-table"><thead><tr><th>Código</th><th>Descripción</th><th>Categoría</th><th>Estado</th>{isAdmin && <th>Acciones</th>}</tr></thead>
          <tbody>{filtered.map((item) => <tr key={item.id}><td><strong>{item.code}</strong></td><td>{item.description}</td><td>{item.category}</td><td><span className={`code-status ${item.status}`}>{item.status === "active" ? "Activo" : "Inactivo"}</span></td>{isAdmin && <td className="admin-row-actions"><button className="btn btn-ghost" onClick={() => edit(item)}>Editar</button><button className="btn btn-danger-out" onClick={() => void remove(item)}>Eliminar</button></td>}</tr>)}
            {!loading && filtered.length === 0 && <tr><td colSpan={isAdmin ? 5 : 4} className="codes-empty">{query ? "No se encontraron coincidencias." : "Aún no hay códigos registrados."}</td></tr>}
            {loading && <tr><td colSpan={isAdmin ? 5 : 4} className="codes-empty">Cargando catálogo…</td></tr>}
          </tbody></table></div>
      </section>
    </div>
  </main>;
}
