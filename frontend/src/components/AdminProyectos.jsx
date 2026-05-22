/**
 * AdminProyectos.jsx
 * Panel de administración: crear proyectos y asignar usuarios.
 * Usa las variables CSS del tema para modo claro/oscuro.
 */

import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api } from '../lib/api';

// ── Helpers de diseño con variables CSS ─────────────────────────────────────────

function hashColor(str) {
  const palette = ["#3B82F6","#10B981","#F59E0B","#EF4444","#8B5CF6","#06B6D4","#F97316"];
  let h = 0;
  for (const c of str ?? "?") h = c.charCodeAt(0) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

// ── Sub-componentes usando variables CSS ─────────────────────────────────────────

function InitialsBadge({ initials, nombre, size = 40 }) {
  const color = hashColor(initials ?? nombre);
  return (
    <div style={{
      width: size, height: size, borderRadius: 8, flexShrink: 0,
      background: color + "1A", border: `1.5px solid ${color}55`,
      display: "flex", alignItems: "center", justifyContent: "center",
      color, fontWeight: 700, fontSize: size * 0.35,
      fontFamily: "var(--font-mono, monospace)", letterSpacing: 1,
    }}>
      {(initials ?? nombre ?? "?").slice(0, 3).toUpperCase()}
    </div>
  );
}

function RolBadge({ rol }) {
  const styles = {
    ADMIN:   { bg: "rgba(239,68,68,0.1)", color: "#f87171" },
    TECNICO: { bg: "rgba(59,130,246,0.1)", color: "#60a5fa" },
    VIEWER:  { bg: "var(--bg4)", color: "var(--txt2)" },
  };
  const s = styles[rol] ?? styles.VIEWER;
  return (
    <span style={{
      background: s.bg, color: s.color,
      fontSize: 11, fontWeight: 600, padding: "2px 9px",
      borderRadius: 20, whiteSpace: "nowrap", letterSpacing: 0.3,
      fontFamily: "var(--font-mono, monospace)",
    }}>
      {rol}
    </span>
  );
}

function StatusDot({ activo }) {
  return (
    <span style={{
      display: "inline-block", width: 7, height: 7, borderRadius: "50%",
      background: activo ? "#22c55e" : "var(--txt3)", marginRight: 5,
    }} />
  );
}

function Toast({ type, msg, onClose }) {
  const styles = {
    success: { bg: "rgba(34,197,94,0.08)", color: "#4ade80", border: "rgba(34,197,94,0.22)" },
    error:   { bg: "rgba(239,68,68,0.08)", color: "#f87171", border: "rgba(239,68,68,0.22)" },
  };
  const s = styles[type] ?? styles.error;
  return (
    <div style={{
      background: s.bg, color: s.color, border: `0.5px solid ${s.border}`,
      borderRadius: "var(--radius)", padding: "10px 14px", fontSize: 13,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      marginBottom: 16, gap: 12,
    }}>
      <span>{msg}</span>
      <button onClick={onClose} style={{ background:"none", border:"none", cursor:"pointer", color: s.color, fontSize: 18, lineHeight: 1, padding: 0 }}>×</button>
    </div>
  );
}

function Label({ children }) {
  return (
    <label style={{ display:"block", fontSize: 12, color:"var(--txt2)", marginBottom: 4, fontWeight: 500, fontFamily: "var(--font-mono, monospace)" }}>
      {children}
    </label>
  );
}

// ── Formulario nuevo proyecto ──────────────────────────────────────────────────

const EMPTY_FORM = { id:"", nombre:"", descripcion:"", initials:"", tipo:"generico", db_url:"", db_token:"" };

function FormNuevoProyecto({ onSuccess, onCancel }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [err, setErr]       = useState("");

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!form.id || !form.nombre || !form.initials || !form.db_url) {
      setErr("Campos obligatorios: ID, Nombre, Iniciales y URL de BD.");
      return;
    }
    setSaving(true);
    try {
      await api.post('/api/proyectos', form);
      onSuccess(`Proyecto "${form.nombre}" creado correctamente.`);
      setForm(EMPTY_FORM);
    } catch (error) {
      setErr(error.message || "Error al crear el proyecto.");
    } finally {
      setSaving(false);
    }
  };

  const inputStyle = {
    background: "var(--bg3)",
    border: "1px solid var(--border2)",
    borderRadius: "var(--radius)",
    color: "var(--txt)",
    fontFamily: "var(--font-mono, monospace)",
    fontSize: 13,
    padding: "10px 12px",
    width: "100%",
    boxSizing: "border-box",
  };

  return (
    <form onSubmit={handleSubmit} style={{ display:"flex", flexDirection:"column", gap: 14 }}>
      {err && <Toast type="error" msg={err} onClose={() => setErr("")} />}

      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap: 12 }}>
        <div>
          <Label>ID del proyecto *</Label>
          <input
            style={inputStyle}
            placeholder="ej: metro-bcn"
            value={form.id}
            onChange={(e) => setForm(f => ({ ...f, id: e.target.value.toLowerCase().replace(/\s+/g,"-") }))}
          />
        </div>
        <div>
          <Label>Iniciales *</Label>
          <input
            style={inputStyle}
            placeholder="ej: MBC"
            maxLength={5}
            value={form.initials}
            onChange={(e) => setForm(f => ({ ...f, initials: e.target.value.toUpperCase() }))}
          />
        </div>
      </div>

      <div>
        <Label>Nombre del proyecto *</Label>
        <input style={inputStyle} placeholder="Metro Barcelona" value={form.nombre} onChange={set("nombre")} />
      </div>

      <div>
        <Label>Descripción</Label>
        <input style={inputStyle} placeholder="Descripción breve (opcional)" value={form.descripcion} onChange={set("descripcion")} />
      </div>

      <div>
        <Label>Tipo</Label>
        <select style={inputStyle} value={form.tipo} onChange={set("tipo")}>
          <option value="generico">Genérico</option>
          <option value="metro">Metro</option>
        </select>
      </div>

      <div>
        <Label>URL de base de datos *</Label>
        <input
          style={inputStyle}
          placeholder="/data/proyectos/metro-bcn.db"
          value={form.db_url}
          onChange={set("db_url")}
        />
      </div>

      <div>
        <Label>Token de BD (opcional)</Label>
        <input type="password" style={inputStyle} placeholder="—" value={form.db_token} onChange={set("db_token")} />
      </div>

      <div style={{ display:"flex", gap: 8, marginTop: 4 }}>
        <button type="submit" disabled={saving} className="btn btn-primary" style={{ flex:1, justifyContent: "center" }}>
          {saving ? "Creando…" : "Crear proyecto"}
        </button>
        <button type="button" onClick={onCancel} className="btn btn-ghost">
          Cancelar
        </button>
      </div>
    </form>
  );
}

// ── Panel lateral: gestión de usuarios de un proyecto ─────────────────────────

function PanelUsuarios({ proyecto, todosLosUsuarios, onClose }) {
  const [asignados, setAsignados]     = useState([]);
  const [loading, setLoading]         = useState(true);
  const [assignUid, setAssignUid]     = useState("");
  const [assignRol, setAssignRol]     = useState("TECNICO");
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    if (type === "success") setTimeout(() => setToast(null), 3000);
  };

  const loadAsignados = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get(`/api/proyectos/${proyecto.id}/usuarios`);
      setAsignados(data);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    } finally {
      setLoading(false);
    }
  }, [proyecto.id]);

  useEffect(() => { loadAsignados(); }, [loadAsignados]);

  const disponibles = todosLosUsuarios.filter(u => !asignados.some(a => a.id === u.id));

  const asignar = async (e) => {
    e.preventDefault();
    if (!assignUid) { showToast("error", "Selecciona un usuario."); return; }
    setSaving(true);
    try {
      await api.post(`/api/proyectos/${proyecto.id}/usuarios`, { 
        usuario_id: parseInt(assignUid, 10), 
        rol: assignRol 
      });
      showToast("success", "Usuario asignado.");
      setAssignUid(""); 
      setAssignRol("TECNICO");
      loadAsignados();
    } catch (error) {
      showToast("error", error.message || "Error al asignar.");
    } finally {
      setSaving(false);
    }
  };

  const quitar = async (uid, nombre) => {
    if (!window.confirm(`¿Quitar a "${nombre}" del proyecto?`)) return;
    try {
      await api.delete(`/api/proyectos/${proyecto.id}/usuarios/${uid}`);
      showToast("success", `"${nombre}" eliminado.`);
      loadAsignados();
    } catch (error) {
      showToast("error", error.message || "Error al eliminar.");
    }
  };

  const selectStyle = {
    background: "var(--bg3)",
    border: "1px solid var(--border2)",
    borderRadius: "var(--radius)",
    color: "var(--txt)",
    fontFamily: "var(--font-mono, monospace)",
    fontSize: 13,
    padding: "8px 12px",
  };

  return (
    <div style={{
      background: "var(--bg2)",
      border: "1px solid var(--border)",
      borderRadius: "var(--radius-lg)",
      padding: "1.25rem",
    }}>
      <div style={{ display:"flex", alignItems:"center", gap: 12, marginBottom: 20 }}>
        <InitialsBadge initials={proyecto.initials} nombre={proyecto.nombre} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 15, color: "var(--txt)" }}>{proyecto.nombre}</div>
          <div style={{ color:"var(--txt3)", fontSize: 12, fontFamily:"var(--font-mono,monospace)" }}>{proyecto.id}</div>
        </div>
        <button onClick={onClose} aria-label="Cerrar" style={{ background:"none", border:"none", cursor:"pointer", color:"var(--txt3)", fontSize: 20, lineHeight:1, padding:4 }}>×</button>
      </div>

      {toast && <Toast type={toast.type} msg={toast.msg} onClose={() => setToast(null)} />}

      <div style={{ background:"var(--bg3)", borderRadius: "var(--radius)", padding: "12px 14px", marginBottom: 20 }}>
        <p style={{ fontSize: 12, color:"var(--txt2)", margin:"0 0 10px", fontWeight: 500, fontFamily: "var(--font-mono, monospace)" }}>
          Asignar usuario
        </p>
        <form onSubmit={asignar} style={{ display:"flex", gap: 8, flexWrap:"wrap" }}>
          <select
            value={assignUid}
            onChange={e => setAssignUid(e.target.value)}
            style={{ ...selectStyle, flex:2, minWidth: 150 }}
          >
            <option value="">Selecciona usuario…</option>
            {disponibles.map(u => (
              <option key={u.id} value={u.id}>{u.nombre} — {u.email}</option>
            ))}
          </select>
          <select
            value={assignRol}
            onChange={e => setAssignRol(e.target.value)}
            style={{ ...selectStyle, flex:1, minWidth: 110 }}
          >
            <option value="TECNICO">TECNICO</option>
            <option value="VIEWER">VIEWER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
          <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
            {saving ? "…" : "+ Asignar"}
          </button>
        </form>
        {disponibles.length === 0 && (
          <p style={{ fontSize: 12, color:"var(--txt3)", margin:"8px 0 0" }}>
            Todos los usuarios ya están asignados a este proyecto.
          </p>
        )}
      </div>

      <p style={{ fontSize: 12, color:"var(--txt2)", margin:"0 0 10px", fontWeight: 500, fontFamily: "var(--font-mono, monospace)" }}>
        Usuarios asignados ({loading ? "…" : asignados.length})
      </p>

      {loading ? (
        <p style={{ fontSize: 13, color:"var(--txt3)", textAlign:"center", padding:"16px 0" }}>Cargando…</p>
      ) : asignados.length === 0 ? (
        <p style={{ fontSize: 13, color:"var(--txt3)", textAlign:"center", padding:"20px 0" }}>
          Sin usuarios asignados todavía.
        </p>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap: 8 }}>
          {asignados.map(u => (
            <div key={u.id} style={{
              display:"flex", alignItems:"center", gap: 10,
              padding:"10px 12px",
              border:"1px solid var(--border)",
              borderRadius: "var(--radius)",
              background: "var(--bg)",
            }}>
              <div style={{
                width: 32, height: 32, borderRadius:"50%", flexShrink: 0,
                background:"rgba(59,130,246,0.15)", color:"var(--accent)",
                display:"flex", alignItems:"center", justifyContent:"center",
                fontSize: 12, fontWeight: 600,
              }}>
                {u.nombre.charAt(0).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--txt)" }}>{u.nombre}</div>
                <div style={{ fontSize: 11, color:"var(--txt3)", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{u.email}</div>
              </div>
              <RolBadge rol={u.rol} />
              <button
                onClick={() => quitar(u.id, u.nombre)}
                title={`Quitar a ${u.nombre}`}
                style={{ background:"none", border:"none", cursor:"pointer", color:"#EF4444", padding:4, fontSize: 15, opacity: 0.7, lineHeight:1 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function AdminProyectos() {
  const navigate = useNavigate();
  const [proyectos, setProyectos] = useState([]);
  const [usuarios, setUsuarios]   = useState([]);
  const [selected, setSelected]   = useState(null);
  const [tab, setTab]             = useState("lista");
  const [loading, setLoading]     = useState(true);
  const [toast, setToast]         = useState(null);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    if (type === "success") setTimeout(() => setToast(null), 3500);
  };

  const loadProyectos = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get('/api/proyectos');
      setProyectos(data);
    } catch (error) {
      showToast("error", "Error cargando proyectos.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadUsuarios = useCallback(async () => {
    try {
      const data = await api.get('/api/usuarios');
      setUsuarios(data);
    } catch (error) {
      console.error("Error cargando usuarios:", error);
    }
  }, []);

  useEffect(() => {
    loadProyectos();
    loadUsuarios();
  }, [loadProyectos, loadUsuarios]);

  const desactivar = async (proy, e) => {
    e.stopPropagation();
    if (!window.confirm(`¿Desactivar el proyecto "${proy.nombre}"?`)) return;
    try {
      await api.delete(`/api/proyectos/${proy.id}`);
      showToast("success", `Proyecto "${proy.nombre}" desactivado.`);
      if (selected?.id === proy.id) setSelected(null);
      loadProyectos();
    } catch (error) {
      showToast("error", "Error al desactivar el proyecto.");
    }
  };

  const handleNuevoOk = (msg) => {
    showToast("success", msg);
    setTab("lista");
    loadProyectos();
  };

  const tabBtn = (id, label) => (
    <button
      onClick={() => { setTab(id); setSelected(null); }}
      style={{
        fontSize: 13, padding:"6px 16px",
        background: tab === id ? "var(--bg3)" : "transparent",
        fontWeight: tab === id ? 500 : 400,
        border: "none",
        cursor: "pointer",
        borderRadius: "var(--radius)",
        color: "var(--txt)",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ 
      fontFamily: "var(--font, system-ui)", 
      color: "var(--txt)",
      background: "var(--bg)",
      minHeight: "100vh",
    }}>
      {/* Header con botón de volver */}
      <div style={{
        display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"14px 20px", borderBottom:"1px solid var(--border)",
        flexWrap:"wrap", gap: 10,
        background: "var(--bg2)",
      }}>
        <div style={{ display:"flex", alignItems:"center", gap: 10 }}>
          <button
            onClick={() => navigate('/select-project')}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--txt)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 10px',
              borderRadius: 'var(--radius)',
              fontSize: 13,
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--bg3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            Volver
          </button>
          
          <span style={{ fontSize: 20 }}>🏗️</span>
          <span style={{ fontWeight: 500, fontSize: 16 }}>Proyectos</span>
          {!loading && (
            <span style={{ fontSize: 12, color:"var(--txt3)", background:"var(--bg3)", borderRadius: 20, padding:"2px 10px" }}>
              {proyectos.length}
            </span>
          )}
        </div>
        <div style={{ display:"flex", gap: 6 }}>
          {tabBtn("lista", "Lista")}
          {tabBtn("nuevo", "+ Nuevo proyecto")}
        </div>
      </div>

      {/* Contenido */}
      <div style={{
        padding: "1.25rem 1.5rem",
        display:"grid",
        gridTemplateColumns: selected ? "minmax(0,1fr) minmax(0,1fr)" : "minmax(0,1fr)",
        gap: 20, alignItems:"start",
      }}>
        <div>
          {toast && <Toast type={toast.type} msg={toast.msg} onClose={() => setToast(null)} />}

          {tab === "lista" && (
            <>
              {loading ? (
                <div className="spinner" style={{ margin: "0 auto" }} />
              ) : proyectos.length === 0 ? (
                <div style={{ textAlign:"center", padding:"3rem 1rem" }}>
                  <div style={{ fontSize: 48 }}>📂</div>
                  <p style={{ color:"var(--txt2)", marginTop: 12 }}>No hay proyectos todavía.</p>
                  <button onClick={() => setTab("nuevo")} className="btn btn-primary" style={{ marginTop: 8 }}>
                    Crear primer proyecto
                  </button>
                </div>
              ) : (
                <div style={{ display:"flex", flexDirection:"column", gap: 10 }}>
                  {proyectos.map(p => (
                    <div
                      key={p.id}
                      onClick={() => setSelected(sel => sel?.id === p.id ? null : p)}
                      style={{
                        background: "var(--bg2)",
                        border: selected?.id === p.id
                          ? "1.5px solid var(--accent)"
                          : "1px solid var(--border)",
                        borderRadius: "var(--radius-lg)",
                        padding: "14px 16px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        transition: "border-color .15s, box-shadow .15s",
                      }}
                    >
                      <InitialsBadge initials={p.initials} nombre={p.nombre} />
                      <div style={{ flex:1, minWidth: 0 }}>
                        <div style={{ display:"flex", alignItems:"center", gap: 8, flexWrap:"wrap" }}>
                          <span style={{ fontWeight: 500, fontSize: 14, color: "var(--txt)" }}>{p.nombre}</span>
                          <span style={{ fontSize: 11, color:"var(--txt2)", background:"var(--bg3)", borderRadius: 20, padding:"1px 8px" }}>
                            {p.tipo}
                          </span>
                        </div>
                        <div style={{ display:"flex", alignItems:"center", gap: 6, marginTop: 3 }}>
                          <StatusDot activo={p.activo} />
                          <span style={{ fontFamily:"var(--font-mono,monospace)", fontSize: 11, color:"var(--txt3)" }}>{p.id}</span>
                        </div>
                        {p.descripcion && (
                          <div style={{ fontSize: 12, color:"var(--txt2)", marginTop: 3 }}>{p.descripcion}</div>
                        )}
                      </div>
                      <div style={{ display:"flex", alignItems:"center", gap: 6 }}>
                        <span style={{ fontSize: 12, color:"var(--accent)", fontWeight: 500 }}>
                          {selected?.id === p.id ? "▲ Cerrar" : "▼ Gestionar"}
                        </span>
                        <button
                          onClick={(e) => desactivar(p, e)}
                          title="Desactivar proyecto"
                          style={{ background:"none", border:"none", cursor:"pointer", color:"#EF4444", opacity: 0.6, fontSize: 15, padding:4, lineHeight:1 }}
                        >
                          🗑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {tab === "nuevo" && (
            <div style={{
              background: "var(--bg2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              padding: "1.5rem",
            }}>
              <h2 style={{ fontSize: 16, fontWeight: 500, marginTop: 0, marginBottom: 20, color: "var(--txt)" }}>Nuevo proyecto</h2>
              <FormNuevoProyecto
                onSuccess={handleNuevoOk}
                onCancel={() => setTab("lista")}
              />
            </div>
          )}
        </div>

        {selected && (
          <PanelUsuarios
            proyecto={selected}
            todosLosUsuarios={usuarios}
            onClose={() => setSelected(null)}
          />
        )}
      </div>
    </div>
  );
}