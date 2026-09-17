import { useCallback, useEffect, useState } from "react";
import * as api from "../lib/api";
import type { AdminUserRecord, Role } from "../lib/api";

export default function AdminPanel({
  currentUsername,
  onClose,
}: {
  currentUsername: string;
  onClose: () => void;
}) {
  const [users, setUsers] = useState<AdminUserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("profesional");
  const [newResponsable, setNewResponsable] = useState("");
  const [creating, setCreating] = useState(false);

  const [resetTarget, setResetTarget] = useState<string | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const list = await api.listUsers();
      setUsers(list);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    setError("");
    setMessage("");
    try {
      await api.createUser({
        username: newUsername,
        password: newPassword,
        role: newRole,
        profile: newResponsable ? { responsable: newResponsable } : undefined,
      });
      setMessage(`Cuenta "${newUsername}" creada correctamente.`);
      setNewUsername("");
      setNewPassword("");
      setNewRole("profesional");
      setNewResponsable("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  const handleReset = async () => {
    if (!resetTarget) return;
    setError("");
    setMessage("");
    try {
      await api.updateUser({ username: resetTarget, newPassword: resetPassword });
      setMessage(`Contraseña de "${resetTarget}" actualizada.`);
      setResetTarget(null);
      setResetPassword("");
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleRoleToggle = async (u: AdminUserRecord) => {
    setError("");
    setMessage("");
    try {
      const nextRole: Role = u.role === "admin" ? "profesional" : "admin";
      await api.updateUser({ username: u.username, role: nextRole });
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setError("");
    setMessage("");
    try {
      await api.deleteUser(deleteTarget);
      setMessage(`Cuenta "${deleteTarget}" eliminada.`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <div className="admin-screen">
      <div className="admin-wrap">
        <div className="admin-header">
          <div>
            <div className="auth-kicker">HIS · C.S. ATALAYA</div>
            <h1>Administrar cuentas</h1>
          </div>
          <button className="btn btn-ghost btn-lg" onClick={onClose}>
            ← Volver al formulario
          </button>
        </div>

        {error && <div className="auth-note auth-error">{error}</div>}
        {message && <div className="auth-note admin-success">{message}</div>}

        <div className="admin-card">
          <h2>Nueva cuenta</h2>
          <div className="admin-grid">
            <div className="fg">
              <label>Usuario</label>
              <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="jperez" />
            </div>
            <div className="fg">
              <label>Contraseña temporal</label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="mín. 8 caracteres"
              />
            </div>
            <div className="fg">
              <label>Rol</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value as Role)}>
                <option value="profesional">Profesional</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
            <div className="fg">
              <label>Nombre del responsable (opcional)</label>
              <input value={newResponsable} onChange={(e) => setNewResponsable(e.target.value)} />
            </div>
          </div>
          <div className="admin-actions">
            <button
              className="btn btn-primary"
              disabled={creating || !newUsername || !newPassword}
              onClick={handleCreate}
            >
              {creating ? "Creando…" : "Crear cuenta"}
            </button>
          </div>
        </div>

        <div className="admin-card">
          <h2>Cuentas existentes {loading && "(cargando…)"}</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Responsable</th>
                  <th>Rol</th>
                  <th>Creado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.username}>
                    <td>
                      {u.displayUsername}
                      {u.username === currentUsername && <span className="admin-tag">tú</span>}
                    </td>
                    <td>{u.profile?.responsable || "—"}</td>
                    <td>
                      <button className="admin-role-btn" onClick={() => handleRoleToggle(u)}>
                        {u.role === "admin" ? "Administrador" : "Profesional"}
                      </button>
                    </td>
                    <td>{new Date(u.createdAt).toLocaleDateString("es-PE")}</td>
                    <td className="admin-row-actions">
                      <button className="btn btn-ghost" onClick={() => { setResetTarget(u.username); setResetPassword(""); }}>
                        Restablecer contraseña
                      </button>
                      <button
                        className="btn btn-danger-out"
                        disabled={u.username === currentUsername}
                        onClick={() => setDeleteTarget(u.username)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
                {!loading && users.length === 0 && (
                  <tr>
                    <td colSpan={5}>No hay cuentas registradas todavía.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className={`modal-bg no-print${resetTarget ? " open" : ""}`}>
        <div className="modal-box">
          <div className="modal-title" style={{ color: "var(--navy)" }}>
            Restablecer contraseña
          </div>
          <div className="modal-body">
            <p>Nueva contraseña para «{resetTarget}»:</p>
            <div className="fg">
              <input
                type="text"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="mín. 8 caracteres"
              />
            </div>
          </div>
          <div className="modal-acts" style={{ marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => setResetTarget(null)}>
              Cancelar
            </button>
            <button className="btn btn-primary" disabled={resetPassword.length < 8} onClick={handleReset}>
              Guardar
            </button>
          </div>
        </div>
      </div>

      <div className={`modal-bg no-print${deleteTarget ? " open" : ""}`}>
        <div className="modal-box">
          <div className="modal-title">Eliminar cuenta</div>
          <div className="modal-body">
            <p>¿Seguro que deseas eliminar la cuenta «{deleteTarget}»? Esta acción no se puede deshacer.</p>
          </div>
          <div className="modal-acts" style={{ marginTop: 16 }}>
            <button className="btn btn-ghost" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </button>
            <button className="btn btn-danger" onClick={handleDelete}>
              Eliminar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
