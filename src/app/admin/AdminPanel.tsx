"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";

interface User {
  id: string;
  email: string;
  role: string;
  twoFactorEnabled: boolean;
  createdAt: string;
  group: string;
}

interface FlagEntry {
  fifaCode: string;
  countryName: string;
  defaultIso: string;
  isoCode: string;
  isCustom: boolean;
  type: string;
}

export default function AdminPanel() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"config" | "users" | "flags">("config");
  
  // Configurations states
  const [googleClientId, setGoogleClientId] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("");
  const [smtpUser, setSmtpUser] = useState("");
  const [smtpPass, setSmtpPass] = useState("");
  const [smtpFrom, setSmtpFrom] = useState("");
  const [detectedOrigin, setDetectedOrigin] = useState("http://localhost:3000");
  
  // Users list states
  const [users, setUsers] = useState<User[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Flag mapping states
  const [flagEntries, setFlagEntries] = useState<FlagEntry[]>([]);
  const [flagEdits, setFlagEdits] = useState<Record<string, string>>({});
  const [flagLoadStatus, setFlagLoadStatus] = useState<Record<string, "ok" | "error" | "loading">>({});

  // Status alerts
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // Load configurations and users list on mount
  useEffect(() => {
    fetchConfigs();
    fetchUsers();
    fetchFlagMappings();
    if (typeof window !== "undefined") {
      setDetectedOrigin(window.location.origin);
    }
  }, []);

  const fetchConfigs = async () => {
    try {
      const res = await fetch("/api/admin/config");
      if (res.ok) {
        const data = await res.json();
        setGoogleClientId(data.GOOGLE_CLIENT_ID || "");
        setGoogleClientSecret(data.GOOGLE_CLIENT_SECRET || "");
        setSmtpHost(data.SMTP_HOST || "");
        setSmtpPort(data.SMTP_PORT || "");
        setSmtpUser(data.SMTP_USER || "");
        setSmtpPass(data.SMTP_PASS || "");
        setSmtpFrom(data.SMTP_FROM || "");
      }
    } catch (err) {
      showMsg("error", "Error al cargar las configuraciones.");
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      showMsg("error", "Error al cargar el listado de usuarios.");
    }
  };

  const fetchFlagMappings = async () => {
    try {
      const res = await fetch("/api/admin/fifa-iso-map");
      if (res.ok) {
        const data: FlagEntry[] = await res.json();
        setFlagEntries(data);
        // Initialize edits with current values
        const edits: Record<string, string> = {};
        data.forEach((e) => {
          edits[e.fifaCode] = e.isoCode;
        });
        setFlagEdits(edits);
        // Validate all flags
        data.forEach((entry) => {
          if (entry.isoCode) {
            validateFlagImage(entry.fifaCode, entry.isoCode);
          }
        });
      }
    } catch (err) {
      showMsg("error", "Error al cargar el mapeo de banderas.");
    }
  };

  const validateFlagImage = (fifaCode: string, isoCode: string) => {
    if (!isoCode) {
      setFlagLoadStatus((prev) => ({ ...prev, [fifaCode]: "error" }));
      return;
    }
    setFlagLoadStatus((prev) => ({ ...prev, [fifaCode]: "loading" }));
    const img = new Image();
    img.onload = () => {
      setFlagLoadStatus((prev) => ({ ...prev, [fifaCode]: "ok" }));
    };
    img.onerror = () => {
      setFlagLoadStatus((prev) => ({ ...prev, [fifaCode]: "error" }));
    };
    img.src = `https://flagcdn.com/w40/${isoCode.trim().toLowerCase()}.png`;
  };

  const showMsg = (type: "success" | "error", message: string) => {
    setStatus({ type, message });
    setTimeout(() => {
      setStatus(null);
    }, 4000);
  };

  const handleSaveConfigs = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/admin/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          GOOGLE_CLIENT_ID: googleClientId,
          GOOGLE_CLIENT_SECRET: googleClientSecret,
          SMTP_HOST: smtpHost,
          SMTP_PORT: smtpPort,
          SMTP_USER: smtpUser,
          SMTP_PASS: smtpPass,
          SMTP_FROM: smtpFrom
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fallo al guardar configuraciones.");
      }

      showMsg("success", "¡Configuraciones guardadas exitosamente!");
      // Reload masking values
      fetchConfigs();
    } catch (err: any) {
      showMsg("error", err.message || "Fallo en la comunicación con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === "ADMIN" ? "USER" : "ADMIN";
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/admin/users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role: newRole })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fallo al cambiar rol.");
      }

      showMsg("success", `Rol del usuario actualizado a ${newRole} con éxito.`);
      fetchUsers();
    } catch (err: any) {
      showMsg("error", err.message || "Fallo al actualizar rol.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setLoading(true);
    setStatus(null);
    setDeleteConfirmId(null);

    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: "DELETE"
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fallo al eliminar usuario.");
      }

      showMsg("success", "El usuario ha sido eliminado de la base de datos.");
      fetchUsers();
    } catch (err: any) {
      showMsg("error", err.message || "Fallo al eliminar usuario.");
    } finally {
      setLoading(false);
    }
  };

  // ---- Flag Mapping Handlers ----
  const handleFlagIsoChange = (fifaCode: string, value: string) => {
    setFlagEdits((prev) => ({ ...prev, [fifaCode]: value }));
    // Debounce validation
    if (value.trim()) {
      validateFlagImage(fifaCode, value.trim());
    } else {
      setFlagLoadStatus((prev) => ({ ...prev, [fifaCode]: "error" }));
    }
  };

  const handleSaveFlags = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/admin/fifa-iso-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mappings: flagEdits })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Fallo al guardar mapeo de banderas.");
      }

      showMsg("success", "¡Mapeo de banderas guardado exitosamente! Recarga el álbum para ver los cambios.");
      fetchFlagMappings();
    } catch (err: any) {
      showMsg("error", err.message || "Fallo al guardar el mapeo.");
    } finally {
      setLoading(false);
    }
  };

  const handleImportDefaults = async () => {
    setLoading(true);
    setStatus(null);

    try {
      // First reset all
      await fetch("/api/admin/fifa-iso-map", { method: "DELETE" });
      showMsg("success", "Mapeo reiniciado a los valores por defecto. Recarga el álbum para ver los cambios.");
      fetchFlagMappings();
    } catch (err: any) {
      showMsg("error", err.message || "Fallo al reiniciar el mapeo.");
    } finally {
      setLoading(false);
    }
  };

  // Stats for flag panel
  const teamEntries = flagEntries.filter((e) => e.type === "team");
  const flagsOk = teamEntries.filter((e) => flagLoadStatus[e.fifaCode] === "ok").length;
  const flagsError = teamEntries.filter((e) => flagLoadStatus[e.fifaCode] === "error").length;
  const flagsLoading = teamEntries.filter((e) => flagLoadStatus[e.fifaCode] === "loading" || !flagLoadStatus[e.fifaCode]).length;

  return (
    <div className={styles.panel}>
      {status && (
        <div
          className={styles.alertBox}
          style={{
            background: status.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
            border: `1px solid ${status.type === "success" ? "var(--success)" : "var(--danger)"}`,
            color: status.type === "success" ? "var(--success)" : "var(--danger)"
          }}
        >
          {status.message}
        </div>
      )}

      <div className={styles.tabs}>
        <button
          onClick={() => setActiveTab("config")}
          className={`${styles.tab} ${activeTab === "config" ? styles.tabActive : ""}`}
        >
          ⚙️ Ajustes del Sistema
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={`${styles.tab} ${activeTab === "users" ? styles.tabActive : ""}`}
        >
          👥 Gestión de Usuarios
        </button>
        <button
          onClick={() => setActiveTab("flags")}
          className={`${styles.tab} ${activeTab === "flags" ? styles.tabActive : ""}`}
        >
          🏳️ Banderas
        </button>
      </div>

      {activeTab === "config" ? (
        <form onSubmit={handleSaveConfigs} className={styles.form}>
          {/* Domain Detector & Redirect URIs */}
          <div className={`${styles.sectionCard} glass-card`}>
            <h2 className={styles.sectionTitle}>🌐 Información de Dominio</h2>
            <p className={styles.sectionDesc}>
              Detecta automáticamente el dominio actual y provee las URLs de redirección necesarias para configurar proveedores externos (como Google Console).
            </p>
            <div className={styles.grid}>
              <div className={styles.groupFull}>
                <label className={styles.label}>Origen de la Aplicación (Domain Origin)</label>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="text"
                    value={detectedOrigin}
                    readOnly
                    className={styles.input}
                    style={{ background: "rgba(0,0,0,0.02)", cursor: "default" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(detectedOrigin);
                      showMsg("success", "Origen copiado al portapapeles.");
                    }}
                    className="btn-secondary"
                    style={{ padding: "0.85rem 1.25rem", whiteSpace: "nowrap" }}
                  >
                    Copiar
                  </button>
                </div>
              </div>
              <div className={styles.groupFull}>
                <label className={styles.label}>URI de redirección autorizada (Google Redirect URI)</label>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <input
                    type="text"
                    value={`${detectedOrigin}/api/auth/google/callback`}
                    readOnly
                    className={styles.input}
                    style={{ background: "rgba(0,0,0,0.02)", cursor: "default" }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(`${detectedOrigin}/api/auth/google/callback`);
                      showMsg("success", "URI de redirección copiado.");
                    }}
                    className="btn-secondary"
                    style={{ padding: "0.85rem 1.25rem", whiteSpace: "nowrap" }}
                  >
                    Copiar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Google OAuth Config Card */}
          <div className={`${styles.sectionCard} glass-card`}>
            <h2 className={styles.sectionTitle}>🔑 Google OAuth 2.0</h2>
            <p className={styles.sectionDesc}>
              Configura los valores del proyecto de Google Cloud para habilitar el inicio de sesión con un clic de Google.
            </p>
            <div className={styles.grid}>
              <div className={styles.group}>
                <label className={styles.label}>Google Client ID</label>
                <input
                  type="text"
                  value={googleClientId}
                  onChange={(e) => setGoogleClientId(e.target.value)}
                  className={styles.input}
                  placeholder="ej. 123456-abcdef.apps.googleusercontent.com"
                  disabled={loading}
                />
              </div>
              <div className={styles.group}>
                <label className={styles.label}>Google Client Secret</label>
                <input
                  type="password"
                  value={googleClientSecret}
                  onChange={(e) => setGoogleClientSecret(e.target.value)}
                  className={styles.input}
                  placeholder="Secreto del cliente Google OAuth"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          {/* SMTP Email Config Card */}
          <div className={`${styles.sectionCard} glass-card`}>
            <h2 className={styles.sectionTitle}>✉️ Configuración de Correo (SMTP)</h2>
            <p className={styles.sectionDesc}>
              Ajusta los detalles de tu servidor SMTP para enviar invitaciones grupales, notificaciones y códigos de seguridad 2FA.
            </p>
            <div className={styles.grid}>
              <div className={styles.group}>
                <label className={styles.label}>Servidor SMTP (Host)</label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className={styles.input}
                  placeholder="ej. smtp.gmail.com o mail.servidor.com"
                  disabled={loading}
                />
              </div>
              <div className={styles.group}>
                <label className={styles.label}>Puerto SMTP</label>
                <input
                  type="text"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className={styles.input}
                  placeholder="ej. 465, 587 o 25"
                  disabled={loading}
                />
              </div>
              <div className={styles.group}>
                <label className={styles.label}>Usuario SMTP</label>
                <input
                  type="text"
                  value={smtpUser}
                  onChange={(e) => setSmtpUser(e.target.value)}
                  className={styles.input}
                  placeholder="correo@servidor.com"
                  disabled={loading}
                />
              </div>
              <div className={styles.group}>
                <label className={styles.label}>Contraseña SMTP</label>
                <input
                  type="password"
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  className={styles.input}
                  placeholder="Contraseña del correo SMTP"
                  disabled={loading}
                />
              </div>
              <div className={styles.groupFull}>
                <label className={styles.label}>Remitente Autorizado (From Address)</label>
                <input
                  type="text"
                  value={smtpFrom}
                  onChange={(e) => setSmtpFrom(e.target.value)}
                  className={styles.input}
                  placeholder="Figuritas <no-reply@figuritas.app>"
                  disabled={loading}
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`${styles.saveBtn} btn-primary`}
          >
            {loading ? "Guardando..." : "Guardar Configuraciones"}
          </button>
        </form>
      ) : activeTab === "users" ? (
        <div className={`${styles.sectionCard} glass-card`}>
          <h2 className={styles.sectionTitle}>👥 Usuarios Registrados</h2>
          <p className={styles.sectionDesc}>
            Administra a todos los usuarios registrados en el sistema. Puedes promover a otros usuarios a administradores o eliminar sus cuentas.
          </p>

          <div className={styles.tableContainer}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.th}>Correo Electrónico</th>
                  <th className={styles.th}>Rol</th>
                  <th className={styles.th}>Grupo</th>
                  <th className={styles.th}>2FA</th>
                  <th className={styles.th}>Registro</th>
                  <th className={styles.th}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {users.length === 0 ? (
                  <tr>
                    <td className={styles.td} colSpan={6} style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                      Cargando listado de usuarios...
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className={styles.tr}>
                      <td className={styles.td} style={{ fontWeight: 600 }}>{user.email}</td>
                      <td className={styles.td}>
                        <span
                          className={`${styles.badge} ${
                            user.role === "ADMIN" ? styles.badgeAdmin : styles.badgeUser
                          }`}
                        >
                          {user.role}
                        </span>
                      </td>
                      <td className={styles.td}>{user.group}</td>
                      <td className={styles.td}>{user.twoFactorEnabled ? "✅ Sí" : "❌ No"}</td>
                      <td className={styles.td}>{new Date(user.createdAt).toLocaleDateString("es-ES")}</td>
                      <td className={styles.td}>
                        <div className={styles.actionCell}>
                          {deleteConfirmId === user.id ? (
                            <div style={{ display: "flex", gap: "0.25rem", alignItems: "center" }}>
                              <span style={{ fontSize: "0.8rem", color: "var(--danger)", marginRight: "0.25rem" }}>¿Seguro?</span>
                              <button
                                onClick={() => handleDeleteUser(user.id)}
                                disabled={loading}
                                className={styles.actionBtn}
                                style={{ background: "var(--danger)", color: "white" }}
                              >
                                Sí, eliminar
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(null)}
                                disabled={loading}
                                className={styles.actionBtn}
                                style={{ background: "var(--bg-glass)", color: "var(--text-primary)", border: "1px solid var(--border-glass)" }}
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => handleToggleRole(user.id, user.role)}
                                disabled={loading}
                                className={`${styles.actionBtn} ${
                                  user.role === "ADMIN" ? styles.demoteBtn : styles.promoteBtn
                                }`}
                              >
                                {user.role === "ADMIN" ? "Demostrar a Usuario" : "Promover a Admin"}
                              </button>
                              <button
                                onClick={() => setDeleteConfirmId(user.id)}
                                disabled={loading}
                                className={`${styles.actionBtn} ${styles.deleteBtn}`}
                              >
                                Eliminar
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ---- FLAGS TAB ---- */
        <div className={`${styles.sectionCard} glass-card`}>
          <h2 className={styles.sectionTitle}>🏳️ Mapeo de Banderas (FIFA → ISO)</h2>
          <p className={styles.sectionDesc}>
            Las secciones del álbum usan códigos FIFA (ej. GER, NED, SUI) que no coinciden con los códigos ISO de las banderas (ej. de, nl, ch).
            Aquí puedes ajustar manualmente cada código para que se muestre la bandera correcta.
            Si la imagen no carga, verás un ❌. Si carga correctamente verás un ✅.
          </p>

          {/* Summary Bar */}
          <div className={styles.flagSummary}>
            <div className={styles.flagSummaryItem}>
              <span>✅</span> <span>{flagsOk} correctas</span>
            </div>
            <div className={styles.flagSummaryItem}>
              <span>❌</span> <span>{flagsError} sin bandera</span>
            </div>
            {flagsLoading > 0 && (
              <div className={styles.flagSummaryItem}>
                <span>⏳</span> <span>{flagsLoading} verificando...</span>
              </div>
            )}
            <div className={styles.flagSummaryItem}>
              <span>🏳️</span> <span>{teamEntries.length} selecciones</span>
            </div>
          </div>

          {/* Flag List */}
          <div className={styles.flagList}>
            {flagEntries
              .filter((e) => e.type === "team")
              .map((entry) => {
                const iso = flagEdits[entry.fifaCode] || "";
                const flagUrl = iso ? `https://flagcdn.com/w40/${iso.trim().toLowerCase()}.png` : null;
                const loadStat = flagLoadStatus[entry.fifaCode];

                return (
                  <div key={entry.fifaCode} className={styles.flagRow}>
                    {/* Flag preview */}
                    {flagUrl && loadStat === "ok" ? (
                      <img src={flagUrl} alt={entry.countryName} className={styles.flagPreview} />
                    ) : (
                      <div className={styles.flagPreviewFallback}>?</div>
                    )}

                    {/* FIFA Code */}
                    <span className={styles.flagFifaCode}>{entry.fifaCode}</span>

                    {/* Country Name */}
                    <span className={styles.flagCountryName}>{entry.countryName}</span>

                    {/* ISO Input */}
                    <input
                      type="text"
                      value={iso}
                      onChange={(e) => handleFlagIsoChange(entry.fifaCode, e.target.value)}
                      className={styles.flagIsoInput}
                      placeholder="iso"
                      maxLength={10}
                      disabled={loading}
                    />

                    {/* Status indicator */}
                    {loadStat === "ok" && <span className={styles.flagStatusOk}>✅</span>}
                    {loadStat === "error" && <span className={styles.flagStatusBad}>❌</span>}
                    {loadStat === "loading" && <span style={{ width: 24, textAlign: "center", flexShrink: 0 }}>⏳</span>}
                    {!loadStat && <span style={{ width: 24, flexShrink: 0 }} />}
                  </div>
                );
              })}
          </div>

          {/* Action buttons */}
          <div className={styles.flagActions}>
            <button
              onClick={handleSaveFlags}
              disabled={loading}
              className="btn-primary"
              style={{ fontSize: "0.9rem" }}
            >
              {loading ? "Guardando..." : "💾 Guardar Mapeo"}
            </button>
            <button
              onClick={handleImportDefaults}
              disabled={loading}
              className="btn-secondary"
              style={{ fontSize: "0.9rem" }}
            >
              🔄 Reiniciar a Defaults
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
