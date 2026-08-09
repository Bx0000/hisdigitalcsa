import { useState, useRef, useCallback, useEffect } from "react";
import logoImg from "../assets/logo.jpg";
import { MESES, FINANC, ETNIAS, VACUNA_GRUPOS, VACUNAS_FLAT, CODES } from "../data/constants";

/* ═══════════════ TYPES ═══════════════ */
interface Diag {
  id: number;
  codigo: string;
  descripcion: string;
  tipo: "D" | "P" | "R";
  lab: string;
}

/* cond is now PER PATIENT (not per diagnosis) — item 5 */
/* cond guarda el PAR de condición de ingreso del HIS MINSA (ej. "CC", "NN", "NC"…) */
interface Patient {
  id: number;
  nombre: string;
  fnac: string;
  fur: string;              /* Fecha de Última Regla */
  dni: string;
  edad: string;
  sexo: string;
  distrito: string;
  centroPoblado: string;
  financ: string;
  hc: string;
  etnia: string;
  peso: string;
  talla: string;
  pc: string;
  hb: string;
  perAbdom: string;
  gestante: string;
  cond: string;             /* par de condición de ingreso, ej. "CC" */
  diagnosticos: Diag[];
}

/* ── CONDICIÓN DE INGRESO (par obligatorio según reglas HIS MINSA) ── */
const COND_OPTIONS: { value: string; label: string }[] = [
  { value: "CC", label: "CC — Continuador / Continuador" },
  { value: "NN", label: "NN — Nuevo / Nuevo" },
  { value: "RR", label: "RR — Reingresante / Reingresante" },
  { value: "NC", label: "NC — Nuevo / Continuador" },
  { value: "CN", label: "CN — Continuador / Nuevo" },
  { value: "NR", label: "NR — Nuevo / Reingresante" },
  { value: "CR", label: "CR — Continuador / Reingresante" },
];
const CONDLABEL: Record<string, string> = Object.fromEntries(
  COND_OPTIONS.map(o => [o.value, o.label.split("— ")[1]])
);

interface Header {
  estab: string;
  resp: string;
  dniResp: string;
  upss: string;
  anio: string;
  mes: string;
  dia: string;
  turno: string;
}

export interface ProfessionalProfile {
  responsable: string;
  dniResp: string;
  cargo: string;
  estab: string;
  upss: string;
}

interface NotifState { msg: string; type: string; visible: boolean; }

let _diagCounter = 0;
let _patCounter  = 0;
const nextDiagId = () => ++_diagCounter;
const nextPatId  = () => ++_patCounter;

function calcEdad(fnac: string): string {
  if (!fnac) return "";
  const b = new Date(fnac), n = new Date();
  let y = n.getFullYear() - b.getFullYear();
  let m = n.getMonth() - b.getMonth();
  if (m < 0) { y--; m += 12; }
  const d = Math.abs(n.getDate() - b.getDate());
  if (y === 0 && m === 0) return `${d}d`;
  if (y === 0) return `${m}m ${d}d`;
  return `${y}a ${m}m`;
}

function newDiag(overrides?: Partial<Diag>): Diag {
  return { id: nextDiagId(), codigo: "", descripcion: "", tipo: "D", lab: "", ...overrides };
}

function hl(t: string, q: string): string {
  if (!q) return t;
  return t.replace(new RegExp("(" + q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "gi"),
    '<strong style="color:#0a7c73">$1</strong>');
}

/* ═══════════════ DIAG ROW (no cond selector — item 5) ═══════════════ */
function DiagRow({
  diag, pid, index, onUpdate, onRemove, canRemove
}: {
  diag: Diag; pid: number; index: number;
  onUpdate: (pid: number, did: number, f: keyof Diag, v: string) => void;
  onRemove: (pid: number, did: number) => void;
  canRemove: boolean;
}) {
  const [query, setQuery] = useState(diag.codigo);
  const [results, setResults] = useState<{ code: string; desc: string }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => { setQuery(diag.codigo); }, [diag.codigo]);

  const search = (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    const ql = q.toLowerCase();
    const res = CODES.filter(c =>
      c.code.toLowerCase().startsWith(ql) ||
      c.code.toLowerCase().includes(ql) ||
      c.desc.toLowerCase().includes(ql) ||
      c.alias.toLowerCase().includes(ql)
    ).slice(0, 14);
    setResults(res);
    setOpen(res.length > 0);
  };

  const handleInput = (v: string) => {
    setQuery(v);
    onUpdate(pid, diag.id, "codigo", v);
    search(v);
    const exact = CODES.find(c => c.code.toLowerCase() === v.toLowerCase());
    if (exact && !diag.descripcion) onUpdate(pid, diag.id, "descripcion", exact.desc);
  };

  const selectCode = (code: string, desc: string) => {
    setQuery(code);
    onUpdate(pid, diag.id, "codigo", code);
    onUpdate(pid, diag.id, "descripcion", desc);
    setOpen(false);
  };

  return (
    <div className="diag-row">
      <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: .55, fontWeight: 900, fontSize: 15, minWidth: 28, justifyContent: "center" }}>
        {index + 1}°
      </div>
      <div className="ac-wrap">
        <input type="text" value={query} placeholder="Código CIE-10 / CPT"
          onChange={e => handleInput(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          style={{ border: "2px solid var(--border)", borderRadius: 8, padding: "0 12px", height: 46, fontSize: 15, width: "100%" }} />
        {open && (
          <div className="ac-drop">
            {results.map(c => (
              <div key={c.code + c.desc} className="ac-item" onMouseDown={() => selectCode(c.code, c.desc)}>
                <span className="ac-code" dangerouslySetInnerHTML={{ __html: hl(c.code, query) }} />
                <span className="ac-desc" dangerouslySetInnerHTML={{ __html: hl(c.desc, query) }} />
              </div>
            ))}
          </div>
        )}
      </div>
      <input type="text" value={diag.descripcion} placeholder="Descripción del diagnóstico"
        onChange={e => onUpdate(pid, diag.id, "descripcion", e.target.value)}
        style={{ border: "2px solid var(--border)", borderRadius: 8, padding: "0 12px", height: 46, fontSize: 14, width: "100%" }} />
      <select value={diag.tipo} onChange={e => onUpdate(pid, diag.id, "tipo", e.target.value)}
        style={{ border: "2px solid var(--border)", borderRadius: 8, padding: "0 10px", height: 46, fontSize: 14, width: "100%" }}>
        <option value="D">D – Definitivo</option>
        <option value="P">P – Presuntivo</option>
        <option value="R">R – Repetitivo</option>
      </select>
      <input type="text" value={diag.lab} placeholder="Valor Lab"
        onChange={e => onUpdate(pid, diag.id, "lab", e.target.value)}
        style={{ border: "2px solid var(--border)", borderRadius: 8, padding: "0 10px", height: 46, fontSize: 14, width: "100%" }} />
      <button className="diag-del" onClick={() => canRemove && onRemove(pid, diag.id)}
        style={{ opacity: canRemove ? 1 : 0.3, cursor: canRemove ? "pointer" : "default" }}>✕</button>
    </div>
  );
}

/* ═══════════════ TEMPLATE DIAG ROW ═══════════════ */
function TemplDiagRow({
  diag, index, onUpdate, onRemove
}: {
  diag: Diag; index: number;
  onUpdate: (id: number, f: keyof Diag, v: string) => void;
  onRemove: (id: number) => void;
}) {
  const [query, setQuery] = useState(diag.codigo);
  const [results, setResults] = useState<{ code: string; desc: string }[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => { setQuery(diag.codigo); }, [diag.codigo]);

  const search = (q: string) => {
    if (!q.trim()) { setResults([]); setOpen(false); return; }
    const ql = q.toLowerCase();
    const res = CODES.filter(c =>
      c.code.toLowerCase().startsWith(ql) ||
      c.code.toLowerCase().includes(ql) ||
      c.desc.toLowerCase().includes(ql) ||
      c.alias.toLowerCase().includes(ql)
    ).slice(0, 12);
    setResults(res);
    setOpen(res.length > 0);
  };

  const handleInput = (v: string) => {
    setQuery(v);
    onUpdate(diag.id, "codigo", v);
    search(v);
    const exact = CODES.find(c => c.code.toLowerCase() === v.toLowerCase());
    if (exact && !diag.descripcion) onUpdate(diag.id, "descripcion", exact.desc);
  };

  const selectCode = (code: string, desc: string) => {
    setQuery(code);
    onUpdate(diag.id, "codigo", code);
    onUpdate(diag.id, "descripcion", desc);
    setOpen(false);
  };

  return (
    <div className="diag-row">
      <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: .55, fontWeight: 900, fontSize: 15, minWidth: 28, justifyContent: "center" }}>
        {index + 1}°
      </div>
      <div className="ac-wrap">
        <input type="text" value={query} placeholder="Código CIE-10 / CPT"
          onChange={e => handleInput(e.target.value)}
          onBlur={() => setTimeout(() => setOpen(false), 200)}
          style={{ border: "2px solid var(--border)", borderRadius: 8, padding: "0 12px", height: 46, fontSize: 15, width: "100%" }} />
        {open && (
          <div className="ac-drop">
            {results.map(c => (
              <div key={c.code + c.desc} className="ac-item" onMouseDown={() => selectCode(c.code, c.desc)}>
                <span className="ac-code" dangerouslySetInnerHTML={{ __html: hl(c.code, query) }} />
                <span className="ac-desc" dangerouslySetInnerHTML={{ __html: hl(c.desc, query) }} />
              </div>
            ))}
          </div>
        )}
      </div>
      <input type="text" value={diag.descripcion} placeholder="Descripción"
        onChange={e => onUpdate(diag.id, "descripcion", e.target.value)}
        style={{ border: "2px solid var(--border)", borderRadius: 8, padding: "0 12px", height: 46, fontSize: 14, width: "100%" }} />
      <select value={diag.tipo} onChange={e => onUpdate(diag.id, "tipo", e.target.value)}
        style={{ border: "2px solid var(--border)", borderRadius: 8, padding: "0 10px", height: 46, fontSize: 14, width: "100%" }}>
        <option value="D">D – Definitivo</option>
        <option value="P">P – Presuntivo</option>
        <option value="R">R – Repetitivo</option>
      </select>
      <input type="text" value={diag.lab} placeholder="Valor Lab"
        onChange={e => onUpdate(diag.id, "lab", e.target.value)}
        style={{ border: "2px solid var(--border)", borderRadius: 8, padding: "0 10px", height: 46, fontSize: 14, width: "100%" }} />
      <button className="diag-del" onClick={() => onRemove(diag.id)}>✕</button>
    </div>
  );
}

/* ═══════════════ PATIENT CARD ═══════════════ */
function PatientCard({
  patient, index, onUpdate, onRemove, onUpdateDiag, onAddDiag, onRemoveDiag
}: {
  patient: Patient; index: number;
  onUpdate: (id: number, f: keyof Patient, v: string) => void;
  onRemove: (id: number) => void;
  onUpdateDiag: (pid: number, did: number, f: keyof Diag, v: string) => void;
  onAddDiag: (pid: number) => void;
  onRemoveDiag: (pid: number, did: number) => void;
}) {
  const displayName = patient.nombre || `Paciente ${index + 1}`;

  const handleFnac = (v: string) => {
    onUpdate(patient.id, "fnac", v);
    if (v) onUpdate(patient.id, "edad", calcEdad(v));
  };

  return (
    <div className="pat-card">
      <div className="pat-card-head">
        <div style={{ display: "flex", alignItems: "center" }}>
          <span className="pat-num">{index + 1}</span>
          <span className="pat-name-disp">{displayName}</span>
        </div>
        <button className="btn btn-danger-out" onClick={() => onRemove(patient.id)}>🗑️ Eliminar</button>
      </div>
      <div className="pat-card-body">

        {/* DATOS DEL PACIENTE */}
        <div className="sec-title">👤 Datos del Paciente</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 14, marginBottom: 18 }}>
          <div className="fg" style={{ gridColumn: "span 2" }}>
            <label>Apellidos y Nombres Completos</label>
            <input type="text" value={patient.nombre} placeholder="APELLIDOS Nombres"
              onChange={e => onUpdate(patient.id, "nombre", e.target.value)} />
          </div>
          <div className="fg">
            <label>Fecha de Nacimiento</label>
            <input type="date" value={patient.fnac} onChange={e => handleFnac(e.target.value)} />
          </div>
          <div className="fg">
            <label>Edad (calculada)</label>
            <input type="text" value={patient.edad} placeholder="0a 0m"
              onChange={e => onUpdate(patient.id, "edad", e.target.value)} />
          </div>
          <div className="fg">
            <label>Sexo</label>
            <select value={patient.sexo} onChange={e => onUpdate(patient.id, "sexo", e.target.value)}>
              <option value="">Seleccionar…</option>
              <option value="M">M – Masculino</option>
              <option value="F">F – Femenino</option>
            </select>
          </div>
          <div className="fg">
            <label>DNI / Código</label>
            <input type="text" value={patient.dni} placeholder="00000000"
              onChange={e => onUpdate(patient.id, "dni", e.target.value)} />
          </div>
          <div className="fg">
            <label>Financiador</label>
            <select value={patient.financ} onChange={e => onUpdate(patient.id, "financ", e.target.value)}>
              <option value="1">1 – Usuario</option>
              <option value="2">2 – SIS</option>
              <option value="3">3 – EsSalud</option>
              <option value="4">4 – FF.AA / Policía</option>
              <option value="5">5 – EPS</option>
              <option value="6">6 – Privado</option>
              <option value="7">7 – Otro</option>
            </select>
          </div>
          <div className="fg">
            <label>Etnia</label>
            <select value={patient.etnia} onChange={e => onUpdate(patient.id, "etnia", e.target.value)}>
              {ETNIAS.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div className="fg">
            <label>Distrito de Procedencia</label>
            <input type="text" value={patient.distrito} placeholder="Ej. Atalaya"
              onChange={e => onUpdate(patient.id, "distrito", e.target.value)} />
          </div>
          <div className="fg">
            <label>Centro Poblado</label>
            <input type="text" value={patient.centroPoblado} placeholder="Ej. Curimaná"
              onChange={e => onUpdate(patient.id, "centroPoblado", e.target.value)} />
          </div>
          <div className="fg">
            <label>N° Historia Clínica</label>
            <input type="text" value={patient.hc} placeholder="N° HC"
              onChange={e => onUpdate(patient.id, "hc", e.target.value)} />
          </div>
          <div className="fg">
            <label>Gestante / Puérpera</label>
            <select value={patient.gestante} onChange={e => onUpdate(patient.id, "gestante", e.target.value)}>
              <option value="">No aplica</option>
              <option value="G">G – Gestante</option>
              <option value="P">P – Puérpera</option>
            </select>
          </div>
          <div className="fg">
            <label>Fecha Última Regla (FUR)</label>
            <input type="date" value={patient.fur}
              onChange={e => onUpdate(patient.id, "fur", e.target.value)} />
          </div>
          {/* Condición de ingreso — PAR obligatorio por paciente, default CC (item 2) */}
          <div className="fg">
            <label>📋 Condición de Ingreso</label>
            <select value={patient.cond} onChange={e => onUpdate(patient.id, "cond", e.target.value)}>
              {COND_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* MEDIDAS */}
        <div className="sec-title">📏 Medidas Antropométricas</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 14, marginBottom: 18 }}>
          <div className="fg"><label>⚖️ Peso (kg)</label>
            <input type="text" value={patient.peso} placeholder="0.0"
              onChange={e => onUpdate(patient.id, "peso", e.target.value)} /></div>
          <div className="fg"><label>📏 Talla (cm)</label>
            <input type="text" value={patient.talla} placeholder="000"
              onChange={e => onUpdate(patient.id, "talla", e.target.value)} /></div>
          <div className="fg"><label>🔵 P. Cefálico (cm)</label>
            <input type="text" value={patient.pc} placeholder="—"
              onChange={e => onUpdate(patient.id, "pc", e.target.value)} /></div>
          <div className="fg"><label>🔴 P. Abdominal (cm)</label>
            <input type="text" value={patient.perAbdom} placeholder="—"
              onChange={e => onUpdate(patient.id, "perAbdom", e.target.value)} /></div>
          <div className="fg"><label>🩸 Hemoglobina (g/dL)</label>
            <input type="text" value={patient.hb} placeholder="—"
              onChange={e => onUpdate(patient.id, "hb", e.target.value)} /></div>
        </div>

        {/* DIAGNÓSTICOS */}
        <div className="sec-title">🩺 Diagnósticos</div>
        <div className="diag-hdrs">
          <div className="diag-hdr">#</div>
          <div className="diag-hdr">Código CIE-10 / CPT</div>
          <div className="diag-hdr">Descripción del diagnóstico</div>
          <div className="diag-hdr">Tipo</div>
          <div className="diag-hdr">Valor Lab</div>
          <div />
        </div>
        <div className="diag-area">
          {patient.diagnosticos.map((d, i) => (
            <DiagRow key={d.id} diag={d} pid={patient.id} index={i}
              onUpdate={onUpdateDiag} onRemove={onRemoveDiag}
              canRemove={patient.diagnosticos.length > 1} />
          ))}
        </div>
        <button className="diag-add-btn" onClick={() => onAddDiag(patient.id)}>
          ➕ Agregar otro diagnóstico
        </button>
      </div>
    </div>
  );
}

/* ═══════════════ PRINT HELPERS ═══════════════ */
function pdRBoxes(tipo: string) {
  return `<span class="pdr-row">${["P", "D", "R"].map(x =>
    `<span class="pdr-box${tipo === x ? " on" : ""}">${x}</span>`
  ).join("")}</span>`;
}

function parseAge(edad: string) {
  const mA = edad.match(/(\d+)a/); const mM = edad.match(/(\d+)m/); const mD = edad.match(/(\d+)d/);
  return {
    a: mA ? mA[1] : (edad && !mM && !mD ? edad : ""),
    m: mM ? mM[1] : "",
    d: mD ? mD[1] : ""
  };
}

/* ═══════════════ LOCALSTORAGE PERSISTENCE ═══════════════ */
const STORAGE_KEY = "his-atalaya-v1";

interface SavedSession {
  header: Header;
  patients: Patient[];
  vaccines: number[];
  templateActive: boolean;
  templateDiags: Diag[];
  savedAt: string;
}

function loadSession(sessionKey: string): SavedSession | null {
  try {
    const raw = localStorage.getItem(sessionKey);
    if (!raw) return null;
    const data = JSON.parse(raw) as SavedSession;
    /* Migración de datos antiguos: fur ausente, cond de una sola letra (N/C/R) */
    const legacyCond: Record<string, string> = { N: "NN", C: "CC", R: "RR" };
    data.patients.forEach(p => {
      if (p.fur === undefined) p.fur = "";
      if (p.cond && p.cond.length === 1 && legacyCond[p.cond]) p.cond = legacyCond[p.cond];
      if (!p.cond) p.cond = "CC";
      if (p.financ === "0") p.financ = "2";
    });
    /* Restore ID counters so new items don't collide */
    data.patients.forEach(p => {
      if (p.id >= _patCounter) _patCounter = p.id;
      p.diagnosticos.forEach(d => { if (d.id >= _diagCounter) _diagCounter = d.id; });
    });
    data.templateDiags.forEach(d => { if (d.id >= _diagCounter) _diagCounter = d.id; });
    return data;
  } catch { return null; }
}

/* ═══════════════ MAIN HIS PAGE ═══════════════ */
export default function HIS({
  profile,
  profileSaving,
  userEmail,
  storageKey: sessionStorageKey,
  onSaveProfile,
  onLogout,
  isAdmin,
  onOpenAdmin,
}: {
  profile: ProfessionalProfile;
  profileSaving: boolean;
  userEmail: string;
  storageKey: string;
  onSaveProfile: (profile: ProfessionalProfile) => Promise<void>;
  onLogout: () => void;
  isAdmin?: boolean;
  onOpenAdmin?: () => void;
}) {
  const now = new Date();
  const saved = loadSession(sessionStorageKey);

  const defaultHeader: Header = {
    estab: profile.estab || "CENTRO DE SALUD ATALAYA",
    resp: profile.responsable,
    dniResp: profile.dniResp,
    upss: profile.upss,
    anio: String(now.getFullYear()),
    mes: String(now.getMonth() + 1).padStart(2, "0"),
    dia: String(now.getDate()),
    turno: now.getHours() < 14 ? "M" : "T",
  };

  const [header, setHeader] = useState<Header>(saved?.header ?? defaultHeader);
  const [patients, setPatients] = useState<Patient[]>(saved?.patients ?? []);
  const [selectedVaccines, setSelectedVaccines] = useState<Set<number>>(
    new Set(saved?.vaccines ?? [])
  );
  const [templateActive, setTemplateActive] = useState(saved?.templateActive ?? false);
  const [templateDiags, setTemplateDiags] = useState<Diag[]>(saved?.templateDiags ?? []);
  const [profileDraft, setProfileDraft] = useState<ProfessionalProfile>(profile);
  const [profileOpen, setProfileOpen] = useState(false);
  const [clearModal, setClearModal] = useState(false);
  const [notif, setNotif] = useState<NotifState>({ msg: "", type: "success", visible: false });
  const [savedBadge, setSavedBadge] = useState(false);
  const notifTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setProfileDraft(profile);
    setHeader(h => ({
      ...h,
      estab: profile.estab || h.estab,
      resp: profile.responsable || h.resp,
      dniResp: profile.dniResp || h.dniResp,
      upss: profile.upss || h.upss,
    }));
  }, [profile]);

  /* ── AUTO-SAVE: debounce 900ms ── */
  useEffect(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        const session: SavedSession = {
          header, patients,
          vaccines: Array.from(selectedVaccines),
          templateActive, templateDiags,
          savedAt: new Date().toISOString(),
        };
         localStorage.setItem(sessionStorageKey, JSON.stringify(session));
        setSavedBadge(true);
        setTimeout(() => setSavedBadge(false), 2000);
      } catch { /* storage full or unavailable */ }
    }, 900);
  }, [header, patients, selectedVaccines, templateActive, templateDiags, sessionStorageKey]);

  const showNotif = useCallback((msg: string, type = "success") => {
    if (notifTimer.current) clearTimeout(notifTimer.current);
    setNotif({ msg, type, visible: true });
    notifTimer.current = setTimeout(() => setNotif(n => ({ ...n, visible: false })), 3500);
  }, []);

  /* ── STATS ── */
  const statTotal = patients.length;
  const statM = patients.filter(p => p.sexo === "M").length;
  const statF = patients.filter(p => p.sexo === "F").length;
  const statSIS = patients.filter(p => p.financ === "2").length; /* "2" = SIS tras renumeración (item 5) */

  const fechaDisplay = header.dia && header.mes && header.anio
    ? `${header.dia}/${MESES[header.mes] || "--"}/${header.anio}`
    : "--/--/----";

  /* ── HEADER ── */
  const updateHeader = (f: keyof Header, v: string) => setHeader(h => ({ ...h, [f]: v }));
  const updateProfileDraft = (f: keyof ProfessionalProfile, v: string) =>
    setProfileDraft(p => ({ ...p, [f]: v }));
  const saveProfessionalProfile = async () => {
    try {
      await onSaveProfile(profileDraft);
      setHeader(h => ({
        ...h,
        estab: profileDraft.estab || h.estab,
        resp: profileDraft.responsable || h.resp,
        dniResp: profileDraft.dniResp || h.dniResp,
        upss: profileDraft.upss || h.upss,
      }));
      showNotif("Perfil profesional guardado correctamente", "success");
    } catch {
      showNotif("No se pudo guardar el perfil profesional", "error");
    }
  };

  /* ── PATIENTS ── */
  const createPatient = (): Patient => {
    const baseDiags = (templateActive && templateDiags.length)
      ? templateDiags
      : patients.length > 0 ? patients[patients.length - 1].diagnosticos : [];
    const diags = baseDiags.length
      ? baseDiags.map(d => newDiag({ ...d, id: nextDiagId() }))
      : [newDiag()];
    return {
      id: nextPatId(), nombre: "", fnac: "", fur: "", dni: "", edad: "", sexo: "",
      distrito: "", centroPoblado: "", financ: "2", hc: "", etnia: "58-MESTIZO",
      peso: "", talla: "", pc: "", hb: "", perAbdom: "", gestante: "",
      cond: "CC",  /* default: par Continuador-Continuador (item 2) */
      diagnosticos: diags,
    };
  };

  const addPatient = () => {
    const p = createPatient();
    setPatients(ps => [...ps, p]);
    showNotif(`Paciente ${patients.length + 1} agregado`, "success");
    setTimeout(() => {
      document.querySelector(`[data-patid="${p.id}"]`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
  };

  const removePatient = (id: number) => {
    if (!window.confirm("¿Desea eliminar este paciente?")) return;
    setPatients(ps => ps.filter(p => p.id !== id));
  };

  const updatePatient = (id: number, f: keyof Patient, v: string) =>
    setPatients(ps => ps.map(p => p.id === id ? { ...p, [f]: v } : p));

  /* ── DIAGS ── */
  const updateDiag = (pid: number, did: number, f: keyof Diag, v: string) =>
    setPatients(ps => ps.map(p =>
      p.id === pid
        ? { ...p, diagnosticos: p.diagnosticos.map(d => d.id === did ? { ...d, [f]: v } : d) }
        : p
    ));

  const addDiag = (pid: number) =>
    setPatients(ps => ps.map(p =>
      p.id === pid ? { ...p, diagnosticos: [...p.diagnosticos, newDiag()] } : p
    ));

  const removeDiag = (pid: number, did: number) =>
    setPatients(ps => ps.map(p =>
      p.id === pid && p.diagnosticos.length > 1
        ? { ...p, diagnosticos: p.diagnosticos.filter(d => d.id !== did) }
        : p
    ));

  /* ── TEMPLATE ── */
  const updateTemplDiag = (id: number, f: keyof Diag, v: string) =>
    setTemplateDiags(ds => ds.map(d => d.id === id ? { ...d, [f]: v } : d));
  const addTemplDiag = () => setTemplateDiags(ds => [...ds, newDiag()]);
  const removeTemplDiag = (id: number) => setTemplateDiags(ds => ds.filter(d => d.id !== id));
  const toggleTemplate = (checked: boolean) => {
    setTemplateActive(checked);
    if (checked && templateDiags.length === 0) setTemplateDiags([newDiag()]);
  };
  const applyTemplateToAll = () => {
    if (!patients.length) { showNotif("No hay pacientes aún", "warn"); return; }
    if (!templateDiags.length) { showNotif("La plantilla no tiene diagnósticos", "warn"); return; }
    setPatients(ps => ps.map(p => ({
      ...p, diagnosticos: templateDiags.map(d => newDiag({ ...d, id: nextDiagId() }))
    })));
    showNotif(`Plantilla aplicada a ${patients.length} paciente(s)`, "success");
  };

  /* ── VACCINES ── */
  const toggleVac = (i: number) =>
    setSelectedVaccines(sv => { const n = new Set(sv); if (n.has(i)) n.delete(i); else n.add(i); return n; });

  /* ── CLEAR (simple Yes/No — item 6) ── */
  const executeClearAll = () => {
    _patCounter = 0; _diagCounter = 0;
    localStorage.removeItem(sessionStorageKey);
    setPatients([]); setSelectedVaccines(new Set());
    setTemplateDiags([]); setTemplateActive(false);
    const n = new Date();
    setHeader({
       estab: profile.estab || "CENTRO DE SALUD ATALAYA",
       resp: profile.responsable,
       dniResp: profile.dniResp,
       upss: profile.upss,
      anio: String(n.getFullYear()),
      mes: String(n.getMonth() + 1).padStart(2, "0"),
      dia: String(n.getDate()),
      turno: n.getHours() < 14 ? "M" : "T",
    });
    setClearModal(false);
    showNotif("Formulario limpiado correctamente", "success");
  };

  /* ══════════════════════════════════════════════════════
     PRINT FUNCTION — Formato HIS MINSA oficial
     · Solo 3 diagnósticos por paciente
     · Filas compactas (~8-10 pac/A4)
     · Orden de columnas: DÍA·HC·FIN·ETN·DIST·CP·EDAD·SX·PC·PAB·PESO·TALLA·Hb·E·S·DIAG·TIPO·LAB·CIE
  ══════════════════════════════════════════════════════ */
  const printHIS = () => {
    if (!patients.length) { showNotif("Agrega al menos un paciente antes de imprimir", "error"); return; }

    const pv = document.getElementById("his-print-view");
    if (!pv) return;

    const mesLabel = MESES[header.mes] || "________";
    const upssShort = (header.upss || "").substring(0, 4);

    /* ── ENCABEZADO INSTITUCIONAL ── */
    pv.innerHTML = `
      <table class="ph-inst">
        <tr>
          <td class="ph-logo-cell">
            <img class="ph-logo-img" src="${logoImg}" alt="" />
          </td>
          <td class="ph-title-center">Registro Diario de Atencion y Otras Actividades de Salud</td>
          <td class="ph-turno-cell">
            <span class="ph-turno-lbl">1&nbsp;TURNO</span>
            <div class="ph-turno-boxes">
              <div class="ph-turno-box${header.turno === "M" ? " on" : ""}">M</div>
              <div class="ph-turno-box${header.turno === "T" ? " on" : ""}">T</div>
            </div>
          </td>
        </tr>
      </table>
      <table class="ph-info">
        <tr>
          <td style="width:9mm"><span class="lbl">2 AÑO</span><div class="val">${header.anio || "____"}</div></td>
          <td style="width:18mm"><span class="lbl">3 MES</span><div class="val">${mesLabel}</div></td>
          <td style="width:8mm"><span class="lbl">DÍA</span><div class="val">${header.dia || "__"}</div></td>
          <td><span class="lbl">4 NOMBRE ESTABLECIMIENTO (IPRESS)</span><div class="val">${header.estab || "______________________"}</div></td>
          <td style="width:28mm"><span class="lbl">5 UPSS</span><div class="val">${header.upss || "____________"}</div></td>
          <td style="width:20mm"><span class="lbl">DNI RESPONSABLE</span><div class="val">${header.dniResp || "________"}</div></td>
          <td style="width:40mm"><span class="lbl">6 RESPONSABLE</span><div class="val">${header.resp || "______________________"}</div></td>
        </tr>
      </table>

      <div class="pt-wrap">
        <table class="pt">
          <colgroup>
            <col class="c-nro"/>
            <col class="c-id"/>
            <col class="c-fin"/>
            <col class="c-dis"/>
            <col class="c-amd"/>
            <col class="c-edad"/>
            <col class="c-pc"/>
            <col class="c-pab"/>
            <col class="c-peso"/>
            <col class="c-tall"/>
            <col class="c-hb"/>
            <col class="c-e"/>
            <col class="c-s"/>
            <col class="c-diag"/>
            <col class="c-pdr"/>
            <col class="c-lab"/>
            <col class="c-cie"/>
          </colgroup>
          <thead>
            <tr>
              <th rowspan="2">N°</th>
              <th rowspan="2">HC / DNI<br/>GP</th>
              <th rowspan="2">FIN<br/>ETN</th>
              <th rowspan="2">DISTRITO<br/>C. POBL.</th>
              <th rowspan="2">A<br/>M<br/>D</th>
              <th rowspan="2">EDAD<br/>SEXO</th>
              <th colspan="2" class="th-group">PERÍMETRO</th>
              <th colspan="3" class="th-group">EVAL. ANTROP. Y Hb</th>
              <th rowspan="2">E<br/>S<br/>T</th>
              <th rowspan="2">S<br/>E<br/>R</th>
              <th rowspan="2">DIAGNÓSTICO MOTIVO DE CONSULTA Y/O ACTIVIDAD DE SALUD</th>
              <th rowspan="2">TIPO<br/>DIAG</th>
              <th rowspan="2">COND<br/>VAL<br/>LAB</th>
              <th rowspan="2">CÓD.<br/>CIE/<br/>CPT</th>
            </tr>
            <tr>
              <th>PC</th><th>PAB</th>
              <th>PESO</th><th>TALLA</th><th>Hb</th>
            </tr>
          </thead>
        </table>
      </div>
      <div id="p_vac_sec"></div>
      <div class="p-credit">Web creada por Estadística e Informática · Centro de Salud Atalaya · MINSA</div>
    `;

    const ptTable = pv.querySelector(".pt") as HTMLTableElement | null;
    if (!ptTable) return;

    patients.forEach((p, idx) => {
      /* Todos los diagnósticos del paciente — item 3: sin límite de 3 */
      const diags = p.diagnosticos;
      const d1 = diags[0] || null;
      const d2 = diags[1] || null;
      const d3 = diags[2] || null;
      const extraDiags = diags.slice(3); /* 4°, 5°, 6°… — filas adicionales */
      const rowSpanTotal = 5 + extraDiags.length;
      const age = parseAge(p.edad);
      /* Condición de ingreso — PAR obligatorio, default CC (item 2) */
      const condPair = p.cond && p.cond.length === 2 ? p.cond : "CC";
      const condExpand = CONDLABEL[condPair] || CONDLABEL["CC"];
      const fnacFmt = p.fnac ? p.fnac.split("-").reverse().join("/") : "__/__/____";
      const furFmt = p.fur ? p.fur.split("-").reverse().join("/") : "__/__/____";
      const gp = p.gestante === "G" ? "G" : p.gestante === "P" ? "P" : "";

      /* Cada paciente vive en su propio <tbody> con page-break-inside:avoid
         (item 4) para que nunca quede partido entre dos hojas — si no cabe
         completo en el espacio restante, el navegador mueve todo el bloque
         a la siguiente página. */
      const patTbody = document.createElement("tbody");
      patTbody.className = "pat-group";
      ptTable.appendChild(patTbody);

      /* ── Fila FECHAS + CONDICIÓN (colspan 16 porque col 1 = Nro con rowspan dinámico) ── */
      const trDates = document.createElement("tr");
      trDates.innerHTML =
        `<td rowspan="${rowSpanTotal}" class="td-nro">${idx + 1}</td>` +
        `<td colspan="16" class="tr-dates">` +
          `<b>F.NAC:</b>&nbsp;<span class="hl-val">${fnacFmt}</span>&nbsp;&nbsp;` +
          `<b>F.ÚLT.Hb:</b>&nbsp;___/___/______&nbsp;&nbsp;` +
          `<b>F.ÚLT.REGLA:</b>&nbsp;<span class="hl-val">${furFmt}</span>&nbsp;&nbsp;` +
          `<b>COND.INGRESO:</b>&nbsp;<u><b>${condPair}</b></u>&nbsp;<span class="cond-expand">(${condExpand})</span>` +
        `</td>`;
      patTbody.appendChild(trDates);

      /* ── Fila NOMBRE ── */
      const trName = document.createElement("tr");
      trName.innerHTML =
        `<td colspan="16" class="tr-name">` +
          `NOMBRES Y APELLIDOS:&nbsp;` +
          `<b class="hl-name">${p.nombre || "_______________________________________"}</b>` +
        `</td>`;
      patTbody.appendChild(trName);

      /* ── Fila A ── */
      const trA = document.createElement("tr");
      trA.innerHTML =
        `<td class="td-id td-left">${p.dni || "&nbsp;"}</td>` +
        `<td class="td-fin">${p.financ || "&nbsp;"}</td>` +
        `<td class="td-dis td-left">${p.distrito || "&nbsp;"}</td>` +
        `<td class="td-amd">A</td>` +
        `<td rowspan="3" class="td-edad">${p.edad || "&nbsp;"}<br/><b>${p.sexo || "&nbsp;"}</b></td>` +
        `<td class="td-meas">${p.pc ? `<b>${p.pc}</b>` : "&nbsp;"}</td>` +
        `<td>&nbsp;</td>` +
        `<td class="td-meas">${p.peso ? `<b>${p.peso}</b>` : "&nbsp;"}</td>` +
        `<td>&nbsp;</td>` +
        `<td>&nbsp;</td>` +
        `<td rowspan="3" class="td-es">${upssShort}</td>` +
        `<td rowspan="3" class="td-es">1</td>` +
        `<td class="td-diag">${d1 ? `<span class="ds">1°</span>${d1.descripcion || d1.codigo}` : "<span class='ds'>1°</span>&nbsp;"}</td>` +
        `<td class="td-pdr">${pdRBoxes(d1?.tipo || "")}</td>` +
        `<td class="td-lab">${d1?.lab || "&nbsp;"}</td>` +
        `<td class="td-cie">${d1?.codigo || "&nbsp;"}</td>`;
      patTbody.appendChild(trA);

      /* ── Fila M ── */
      const trM = document.createElement("tr");
      trM.innerHTML =
        `<td class="td-id td-left">${p.hc || "&nbsp;"}</td>` +
        `<td class="td-fin" style="font-size:4pt;word-break:break-all">${p.etnia ? p.etnia.split("-")[0] : "&nbsp;"}</td>` +
        `<td class="td-dis td-left">${p.centroPoblado || "&nbsp;"}</td>` +
        `<td class="td-amd">M</td>` +
        `<td>&nbsp;</td>` +
        `<td class="td-meas">${p.perAbdom ? `<b>${p.perAbdom}</b>` : "&nbsp;"}</td>` +
        `<td>&nbsp;</td>` +
        `<td class="td-meas">${p.talla ? `<b>${p.talla}</b>` : "&nbsp;"}</td>` +
        `<td>&nbsp;</td>` +
        `<td class="td-diag">${d2 ? `<span class="ds">2°</span>${d2.descripcion || d2.codigo}` : "<span class='ds'>2°</span>&nbsp;"}</td>` +
        `<td class="td-pdr">${pdRBoxes(d2?.tipo || "")}</td>` +
        `<td class="td-lab">${d2?.lab || "&nbsp;"}</td>` +
        `<td class="td-cie">${d2?.codigo || "&nbsp;"}</td>`;
      patTbody.appendChild(trM);

      /* ── Fila D ── */
      const trD = document.createElement("tr");
      trD.innerHTML =
        `<td class="td-id td-left">${gp || "&nbsp;"}</td>` +
        `<td class="td-fin">&nbsp;</td>` +
        `<td class="td-dis">&nbsp;</td>` +
        `<td class="td-amd">D</td>` +
        `<td>&nbsp;</td>` +
        `<td>&nbsp;</td>` +
        `<td>&nbsp;</td>` +
        `<td>&nbsp;</td>` +
        `<td class="td-meas">${p.hb ? `<b>${p.hb}</b>` : "&nbsp;"}</td>` +
        `<td class="td-diag">${d3 ? `<span class="ds">3°</span>${d3.descripcion || d3.codigo}` : "<span class='ds'>3°</span>&nbsp;"}</td>` +
        `<td class="td-pdr">${pdRBoxes(d3?.tipo || "")}</td>` +
        `<td class="td-lab">${d3?.lab || "&nbsp;"}</td>` +
        `<td class="td-cie">${d3?.codigo || "&nbsp;"}</td>`;
      patTbody.appendChild(trD);

      /* ── Filas adicionales para el 4° diagnóstico en adelante (item 3) ── */
      extraDiags.forEach((d, i) => {
        const trExtra = document.createElement("tr");
        trExtra.innerHTML =
          `<td colspan="12" class="td-extra-fill">&nbsp;</td>` +
          `<td class="td-diag">${`<span class="ds">${i + 4}°</span>${d.descripcion || d.codigo}`}</td>` +
          `<td class="td-pdr">${pdRBoxes(d.tipo || "")}</td>` +
          `<td class="td-lab">${d.lab || "&nbsp;"}</td>` +
          `<td class="td-cie">${d.codigo || "&nbsp;"}</td>`;
        patTbody.appendChild(trExtra);
      });
    });

    /* ── VACUNAS ── */
    const vacSec = document.getElementById("p_vac_sec");
    if (vacSec && selectedVaccines.size > 0) {
      const vList = Array.from(selectedVaccines).map(i => VACUNAS_FLAT[i]);
      vacSec.innerHTML = `<div class="p-vac">
        <div class="p-vac-title">VACUNAS ADMINISTRADAS EN ESTA SESIÓN</div>
        <div class="p-vac-grid">${vList.map(v =>
          `<div class="p-vac-item"><b>${v.name}</b><br/><span>${v.label}</span><br/><span style="color:#555">${v.code}</span></div>`
        ).join("")}</div></div>`;
    } else if (vacSec) {
      vacSec.innerHTML = "";
    }

    window.print();
  };

  /* ══════════════════════════════════════════════════════ */

  const showVaccineBox = header.upss === "INMUNIZAC";

  return (
    <>
      {/* MARQUEE — sticky top */}
      <div className="his-mq no-print">
        <div className="his-mq-inner">
          <span>⚠ ESTA WEB SOLO SIRVE PARA LA IMPRESIÓN DIARIA DE HIS · NO SE CONECTA A NINGÚN OTRO APLICATIVO</span>
          <span>✅ SOLO PARA USO DENTRO DEL ESTABLECIMIENTO · CENTRO DE SALUD ATALAYA</span>
          <span>⚠ ESTA WEB SOLO SIRVE PARA LA IMPRESIÓN DIARIA DE HIS · NO SE CONECTA A NINGÚN OTRO APLICATIVO</span>
        </div>
      </div>

      {/* TOPBAR — sticky below marquee */}
      <div className="his-topbar no-print">
        <div className="his-tb-brand">
          <img className="his-tb-logo" src={logoImg} alt="C.S. Atalaya" />
          <div>
            <div className="his-tb-title">Registro Diario de Atención · HIS</div>
            <div className="his-tb-sub">CENTRO DE SALUD ATALAYA · MINSA</div>
          </div>
          <span className="his-tb-badge">MINSA</span>
        </div>
        <div className="his-tb-actions">
          {savedBadge && (
            <span className="his-saved-badge">💾 Guardado</span>
          )}
          <button className="btn btn-primary btn-lg" onClick={addPatient}>➕ Agregar Paciente</button>
          <button className="btn btn-accent btn-lg" onClick={printHIS}>🖨️ Imprimir HIS</button>
          <button className="btn btn-ghost btn-lg his-account-btn" onClick={() => setProfileOpen(true)}>
            👤 {profileDraft.responsable || userEmail || "Mi perfil"}
          </button>
          {isAdmin && onOpenAdmin && (
            <button className="btn btn-ghost btn-lg" onClick={onOpenAdmin}>👥 Administrar cuentas</button>
          )}
          <button className="btn btn-danger-out" onClick={() => setClearModal(true)}>🗑️ Limpiar todo</button>
          <button className="btn btn-danger-out" onClick={onLogout}>Cerrar sesión</button>
        </div>
      </div>

      {/* PAGE */}
      <div className="his-page no-print">

        {/* Resumen */}
        <div className="his-resumen">
          <div className="his-res-stats">
            <div className="his-res-item"><div className="his-res-num">{statTotal}</div><div className="his-res-lbl">Pacientes</div></div>
            <div className="his-res-item"><div className="his-res-num">{statM}</div><div className="his-res-lbl">Masculino</div></div>
            <div className="his-res-item"><div className="his-res-num">{statF}</div><div className="his-res-lbl">Femenino</div></div>
            <div className="his-res-item"><div className="his-res-num">{statSIS}</div><div className="his-res-lbl">SIS</div></div>
          </div>
          <div className="his-res-date">
            Fecha: <strong>{fechaDisplay}</strong><br />
            Turno: <strong style={{ color: "var(--accent)" }}>Turno {header.turno || "—"}</strong>
          </div>
        </div>

        {/* ESTABLECIMIENTO — NOT MODIFIED (per spec) */}
        <div className="scard">
          <div className="scard-head">📋 DATOS DEL ESTABLECIMIENTO Y FECHA</div>
          <div className="scard-body">
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr", gap: 14, marginBottom: 14 }}>
              <div className="fg" style={{ gridColumn: "span 2" }}>
                <label>🏥 Nombre del Establecimiento (IPRESS)</label>
                <input type="text" value={header.estab} placeholder="Centro de Salud…"
                  onChange={e => updateHeader("estab", e.target.value)} />
              </div>
              <div className="fg" style={{ gridColumn: "span 2" }}>
                <label>👤 Responsable de la Atención</label>
                <input type="text" value={header.resp} placeholder="Apellidos y Nombres"
                  onChange={e => updateHeader("resp", e.target.value)} />
              </div>
              <div className="fg">
                <label>🪪 DNI Responsable</label>
                <input type="text" value={header.dniResp} maxLength={8} placeholder="00000000"
                  onChange={e => updateHeader("dniResp", e.target.value)} />
              </div>
              <div className="fg">
                <label>🏢 UPSS / Servicio</label>
                <select value={header.upss} onChange={e => updateHeader("upss", e.target.value)}>
                  <option value="">Seleccionar…</option>
                  <option value="CONS.EXT.">Consulta Externa</option>
                  <option value="EMERGENCIA">Emergencia</option>
                  <option value="HOSPITALIZ">Hospitalización</option>
                  <option value="ODONTOLOGÍA">Odontología</option>
                  <option value="CRED">CRED</option>
                  <option value="INMUNIZAC">Inmunizaciones</option>
                  <option value="NUTRICIÓN">Nutrición</option>
                  <option value="SAL.MENTAL">Salud Mental</option>
                  <option value="OBSTETRICIA">Obstetricia</option>
                  <option value="FARMACIA">Farmacia</option>
                  <option value="LABORATORIO">Laboratorio</option>
                  <option value="TERAPIA">Terapia Física</option>
                  <option value="PSICOLOGÍA">Psicología</option>
                  <option value="TRAB.SOC.">Trabajo Social</option>
                  <option value="MED.GRAL.">Medicina General</option>
                  <option value="ENF.ADULTO">Enfermería – Adulto</option>
                  <option value="ENF.NIÑO">Enfermería – Niño</option>
                </select>
              </div>
            </div>
            {/* AÑO / MES / DÍA en una sola fila horizontal — item 16 */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 220px", gap: 14 }}>
              <div className="fg">
                <label>📅 Año</label>
                <input type="number" value={header.anio} min={2020} max={2035} placeholder="2025"
                  onChange={e => updateHeader("anio", e.target.value)} />
              </div>
              <div className="fg">
                <label>📅 Mes</label>
                <select value={header.mes} onChange={e => updateHeader("mes", e.target.value)}>
                  <option value="">Mes…</option>
                  {Object.entries(MESES).map(([k, v]) => (
                    <option key={k} value={k}>{k} – {v.charAt(0) + v.slice(1).toLowerCase()}</option>
                  ))}
                </select>
              </div>
              <div className="fg">
                <label>📅 Día</label>
                <input type="number" value={header.dia} min={1} max={31} placeholder="1"
                  onChange={e => updateHeader("dia", e.target.value)} />
              </div>
              <div className="fg">
                <label>⏰ Turno</label>
                <div className="his-turn-row">
                  <div className={`his-turn-btn${header.turno === "M" ? " active-M" : ""}`}
                    onClick={() => updateHeader("turno", "M")}>☀️ Mañana</div>
                  <div className={`his-turn-btn${header.turno === "T" ? " active-T" : ""}`}
                    onClick={() => updateHeader("turno", "T")}>🌤️ Tarde</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* VACUNAS */}
        {showVaccineBox && (
          <div className="vac-box no-print">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 10 }}>
              <div>
                <div className="vac-title">💉 Vacunas administradas en esta sesión</div>
                <div className="vac-sub">Marque las vacunas aplicadas. Se imprimirán al final de la hoja HIS.</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelectedVaccines(new Set())}>✕ Limpiar selección</button>
            </div>
            {VACUNA_GRUPOS.map((g, gi) => (
              <div key={gi}>
                <div className="vac-group-title">👥 {g.grupo}</div>
                <div className="vac-grid">
                  {g.vacunas.map((v, vi) => {
                    const flatIdx = VACUNA_GRUPOS.slice(0, gi).reduce((acc, g2) => acc + g2.vacunas.length, 0) + vi;
                    const sel = selectedVaccines.has(flatIdx);
                    return (
                      <div key={flatIdx} className={`vac-item${sel ? " selected" : ""}`} onClick={() => toggleVac(flatIdx)}>
                        <input type="checkbox" checked={sel} onChange={() => toggleVac(flatIdx)} />
                        <label>{v.label}<small>{v.code}</small></label>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PLANTILLA */}
        <div className="tpl-box">
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
            <label className="tpl-toggle">
              <input type="checkbox" checked={templateActive} onChange={e => toggleTemplate(e.target.checked)} />
              <div>
                <div className="tpl-toggle-text">📋 Misma atención para varios pacientes</div>
                <div className="tpl-sub">Actívalo y define los diagnósticos — se copiarán a cada nuevo paciente.</div>
              </div>
            </label>
            {templateActive && (
              <button className="btn btn-green btn-sm" onClick={applyTemplateToAll}>✅ Aplicar a todos</button>
            )}
          </div>
          {templateActive && (
            <div style={{ marginTop: 16 }}>
              <div className="diag-hdrs" style={{ marginBottom: 6 }}>
                <div className="diag-hdr">#</div>
                <div className="diag-hdr">Código CIE-10 / CPT</div>
                <div className="diag-hdr">Descripción</div>
                <div className="diag-hdr">Tipo</div>
                <div className="diag-hdr">Valor Lab</div>
                <div />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {templateDiags.map((d, i) => (
                  <TemplDiagRow key={d.id} diag={d} index={i} onUpdate={updateTemplDiag} onRemove={removeTemplDiag} />
                ))}
              </div>
              <button className="diag-add-btn" onClick={addTemplDiag}>➕ Agregar diagnóstico a la plantilla</button>
            </div>
          )}
        </div>

        {/* PACIENTES */}
        <div className="pat-toolbar">
          <div className="pat-count">Atenciones registradas: <span>{statTotal}</span></div>
          <button className="btn btn-primary btn-lg" onClick={addPatient}>➕ Agregar Paciente</button>
        </div>

        {patients.map((p, i) => (
          <div key={p.id} data-patid={p.id}>
            <PatientCard
              patient={p} index={i}
              onUpdate={updatePatient} onRemove={removePatient}
              onUpdateDiag={updateDiag} onAddDiag={addDiag} onRemoveDiag={removeDiag}
            />
          </div>
        ))}

        {patients.length === 0 && (
          <div className="his-empty">
            <div className="his-empty-icon">📄</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: "var(--g4)", marginBottom: 8 }}>No hay pacientes registrados</div>
            <div style={{ fontSize: 15, color: "var(--g4)", marginBottom: 20 }}>Presione el botón para agregar el primer paciente</div>
            <button className="btn btn-primary btn-lg" onClick={addPatient}>➕ Agregar Primer Paciente</button>
          </div>
        )}
      </div>

      {/* PIE */}
      <div className="his-pie no-print">Web creada por Estadística e Informática del Centro de Salud Atalaya</div>

      {/* PRINT VIEW */}
      <div id="his-print-view" />

      {/* PERFIL DEL PROFESIONAL */}
      <div className={`modal-bg no-print${profileOpen ? " open" : ""}`}
        onClick={e => { if (e.target === e.currentTarget) setProfileOpen(false); }}>
        <div className="modal-box profile-modal">
          <div className="modal-title profile-title">👤 Perfil del profesional</div>
          <div className="profile-account">Cuenta: <strong>{userEmail}</strong></div>
          <p className="profile-intro">Estos datos se completan automáticamente en el encabezado de cada registro HIS y se guardan en tu cuenta.</p>
          <div className="profile-grid">
            <div className="fg profile-wide">
              <label>Nombre del responsable de la atención</label>
              <input value={profileDraft.responsable} placeholder="Apellidos y nombres"
                onChange={e => updateProfileDraft("responsable", e.target.value)} />
            </div>
            <div className="fg">
              <label>DNI</label>
              <input value={profileDraft.dniResp} maxLength={8} placeholder="00000000"
                onChange={e => updateProfileDraft("dniResp", e.target.value)} />
            </div>
            <div className="fg">
              <label>Cargo / profesión</label>
              <input value={profileDraft.cargo} placeholder="Médico, enfermera, obstetra…"
                onChange={e => updateProfileDraft("cargo", e.target.value)} />
            </div>
            <div className="fg profile-wide">
              <label>Nombre del establecimiento (IPRESS)</label>
              <input value={profileDraft.estab} placeholder="Centro de Salud…"
                onChange={e => updateProfileDraft("estab", e.target.value)} />
            </div>
            <div className="fg profile-wide">
              <label>UPSS / Servicio habitual</label>
              <select value={profileDraft.upss} onChange={e => updateProfileDraft("upss", e.target.value)}>
                <option value="">Seleccionar…</option>
                <option value="CONS.EXT.">Consulta Externa</option>
                <option value="EMERGENCIA">Emergencia</option>
                <option value="HOSPITALIZ">Hospitalización</option>
                <option value="ODONTOLOGÍA">Odontología</option>
                <option value="CRED">CRED</option>
                <option value="INMUNIZAC">Inmunizaciones</option>
                <option value="NUTRICIÓN">Nutrición</option>
                <option value="SAL.MENTAL">Salud Mental</option>
                <option value="OBSTETRICIA">Obstetricia</option>
                <option value="FARMACIA">Farmacia</option>
                <option value="LABORATORIO">Laboratorio</option>
                <option value="TERAPIA">Terapia Física</option>
                <option value="PSICOLOGÍA">Psicología</option>
                <option value="TRAB.SOC.">Trabajo Social</option>
                <option value="MED.GRAL.">Medicina General</option>
                <option value="ENF.ADULTO">Enfermería – Adulto</option>
                <option value="ENF.NIÑO">Enfermería – Niño</option>
              </select>
            </div>
          </div>
          <div className="modal-acts profile-actions">
            <button className="btn btn-ghost" onClick={() => setProfileOpen(false)}>Cancelar</button>
            <button className="btn btn-primary" disabled={profileSaving} onClick={async () => {
              await saveProfessionalProfile();
              setProfileOpen(false);
            }}>{profileSaving ? "Guardando…" : "Guardar perfil"}</button>
          </div>
        </div>
      </div>

      {/* MODAL LIMPIAR — simple Sí/No (item 6) */}
      <div className={`modal-bg no-print${clearModal ? " open" : ""}`}
        onClick={e => { if (e.target === e.currentTarget) setClearModal(false); }}>
        <div className="modal-box">
          <div className="modal-title">🗑️ Limpiar formulario</div>
          <div className="modal-body" style={{ marginBottom: 22 }}>
            ¿Desea limpiar el formulario?<br />
            <span style={{ color: "var(--danger)", fontWeight: 700 }}>
              Esta acción eliminará todos los pacientes y diagnósticos.
            </span>
          </div>
          <div className="modal-acts">
            <button className="btn btn-ghost" onClick={() => setClearModal(false)}>Cancelar</button>
            <button className="btn btn-danger" onClick={executeClearAll}>Aceptar</button>
          </div>
        </div>
      </div>

      {/* NOTIF */}
      <div className={`his-notif ${notif.type}${notif.visible ? " show" : ""}`}>{notif.msg}</div>
    </>
  );
}
