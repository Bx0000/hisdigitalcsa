import { useCallback, useEffect, useState } from "react";
import HIS from "../pages/HIS";
import AdminPanel from "./AdminPanel";
import * as api from "../lib/api";
import type { ProfessionalProfile, SessionUser } from "../lib/api";

type Screen = "loading" | "bootstrap" | "login" | "app";

function storageKey(user: SessionUser) {
  return `his-atalaya-v1:${user.username}`;
}

export default function Auth() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [user, setUser] = useState<SessionUser | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");

  const init = useCallback(async () => {
    setScreen("loading");
    setError("");
    const token = api.getToken();
    if (!token) {
      try {
        const status = await api.authStatus();
        setScreen(status.bootstrapped ? "login" : "bootstrap");
      } catch (e) {
        setError((e as Error).message);
        setScreen("login");
      }
      return;
    }
    try {
      const { user: sessionUser } = await api.me();
      setUser(sessionUser);
      setScreen("app");
    } catch {
      api.clearToken();
      setScreen("login");
    }
  }, []);

  useEffect(() => {
    init();
  }, [init]);

  const handleBootstrap = useCallback(
    async (setupKey: string, username: string, password: string) => {
      setBusy(true);
      setError("");
      try {
        const { token, user: sessionUser } = await api.bootstrapAdmin({ setupKey, username, password });
        api.setToken(token);
        setUser(sessionUser);
        setScreen("app");
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const handleLogin = useCallback(async (username: string, password: string) => {
    setBusy(true);
    setError("");
    try {
      const { token, user: sessionUser } = await api.login({ username, password });
      api.setToken(token);
      setUser(sessionUser);
      setScreen("app");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    api.clearToken();
    setUser(null);
    setShowAdmin(false);
    setScreen("login");
  }, []);

  const saveProfile = useCallback(async (nextProfile: ProfessionalProfile) => {
    setProfileMessage("");
    try {
      const { user: updated } = await api.updateProfile({ profile: nextProfile });
      setUser(updated);
      setProfileMessage("Perfil guardado. Se usará automáticamente en el próximo formulario.");
    } catch (e) {
      setProfileMessage((e as Error).message || "No se pudo guardar el perfil.");
      throw e;
    }
  }, []);

  if (screen === "loading") {
    return (
      <div className="auth-screen">
        <div className="auth-card">
          <div className="auth-kicker">HIS · C.S. ATALAYA</div>
          <h1>Preparando acceso seguro</h1>
          <p>Conectando con el servidor…</p>
        </div>
      </div>
    );
  }

  if (screen === "bootstrap") {
    return <BootstrapScreen busy={busy} error={error} onSubmit={handleBootstrap} />;
  }

  if (screen === "login") {
    return <LoginScreen busy={busy} error={error} onSubmit={handleLogin} />;
  }

  if (!user) return null;

  return (
    <>
      {profileMessage && <div className="profile-toast">{profileMessage}</div>}
      {showAdmin ? (
        <AdminPanel currentUsername={user.username} onClose={() => setShowAdmin(false)} />
      ) : (
        <HIS
          profile={user.profile}
          profileSaving={busy}
          userEmail={user.displayUsername}
          storageKey={storageKey(user)}
          onSaveProfile={saveProfile}
          onLogout={handleLogout}
          isAdmin={user.role === "admin"}
          onOpenAdmin={() => setShowAdmin(true)}
        />
      )}
    </>
  );
}

function BootstrapScreen({
  busy,
  error,
  onSubmit,
}: {
  busy: boolean;
  error: string;
  onSubmit: (setupKey: string, username: string, password: string) => void;
}) {
  const [setupKey, setSetupKey] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [localError, setLocalError] = useState("");

  const submit = () => {
    setLocalError("");
    if (password !== password2) {
      setLocalError("Las contraseñas no coinciden.");
      return;
    }
    onSubmit(setupKey, username, password);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-kicker">HIS · C.S. ATALAYA</div>
        <h1>Configura la cuenta administradora</h1>
        <p>
          Esta es la primera vez que se usa el sistema. Crea la cuenta de administrador con la clave
          de configuración definida en las variables de entorno de Netlify (<code>ADMIN_SETUP_KEY</code>).
        </p>
        <div className="fg" style={{ marginBottom: 12 }}>
          <label>Clave de configuración</label>
          <input type="password" value={setupKey} onChange={(e) => setSetupKey(e.target.value)} />
        </div>
        <div className="fg" style={{ marginBottom: 12 }}>
          <label>Usuario administrador</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="admin.atalaya" />
        </div>
        <div className="fg" style={{ marginBottom: 12 }}>
          <label>Contraseña</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="fg" style={{ marginBottom: 12 }}>
          <label>Repetir contraseña</label>
          <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
        </div>
        {(localError || error) && <div className="auth-note auth-error">{localError || error}</div>}
        <div className="auth-actions">
          <button className="btn btn-primary btn-lg" disabled={busy} onClick={submit}>
            {busy ? "Creando…" : "Crear cuenta administradora"}
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginScreen({
  busy,
  error,
  onSubmit,
}: {
  busy: boolean;
  error: string;
  onSubmit: (username: string, password: string) => void;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-kicker">REGISTRO DIARIO · MINSA</div>
        <h1>Acceso de profesionales</h1>
        <p>Ingresa con el usuario y contraseña que te asignó el administrador del establecimiento.</p>
        <div className="fg" style={{ marginBottom: 12 }}>
          <label>Usuario</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit(username, password)}
            autoFocus
          />
        </div>
        <div className="fg" style={{ marginBottom: 12 }}>
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSubmit(username, password)}
          />
        </div>
        {error && <div className="auth-note auth-error">{error}</div>}
        <div className="auth-actions">
          <button className="btn btn-primary btn-lg" disabled={busy} onClick={() => onSubmit(username, password)}>
            {busy ? "Ingresando…" : "Iniciar sesión"}
          </button>
        </div>
        <div className="auth-note">
          ¿No tienes cuenta? Pide al administrador del establecimiento que la cree desde el panel de
          administración.
        </div>
      </div>
    </div>
  );
}
