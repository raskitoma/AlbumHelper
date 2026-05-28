"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./admin.module.css";
import { SECTIONS } from "@/lib/albumData";

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
  const [activeTab, setActiveTab] = useState<"config" | "users" | "flags" | "stickers">("config");
  
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
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userPage, setUserPage] = useState(1);
  const usersPerPage = 5;

  // Flag mapping states
  const [flagEntries, setFlagEntries] = useState<FlagEntry[]>([]);
  const [flagEdits, setFlagEdits] = useState<Record<string, string>>({});
  const [flagLoadStatus, setFlagLoadStatus] = useState<Record<string, "ok" | "error" | "loading">>({});

  // Status alerts
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  interface StickerItem {
    code: string;
    sectionCode: string;
    number: number;
    name: string;
    position: string | null;
    imageUrl: string | null;
    isSpecial: boolean;
  }

  // Sticker Editor state
  const [catalogStickers, setCatalogStickers] = useState<StickerItem[]>([]);
  const [stickerQuery, setStickerQuery] = useState("");
  const [stickerSection, setStickerSection] = useState("ALL");
  const [stickerOnlyMissing, setStickerOnlyMissing] = useState(false);
  const [selectedStickers, setSelectedStickers] = useState<Record<string, boolean>>({});
  const [wikiImagesResult, setWikiImagesResult] = useState<Record<string, string[]>>({});
  const [selectedWikiImages, setSelectedWikiImages] = useState<Record<string, string>>({});
  const [searchingWiki, setSearchingWiki] = useState(false);
  const [completingMissing, setCompletingMissing] = useState(false);
  const [completeProgress, setCompleteProgress] = useState("");

  // Pagination & Sorting & One-by-one search states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("number-asc");
  const [individualSearching, setIndividualSearching] = useState<Record<string, boolean>>({});
  const [customSearchTerms, setCustomSearchTerms] = useState<Record<string, string>>({});

  // Load configurations and users list on mount
  useEffect(() => {
    fetchConfigs();
    fetchUsers();
    fetchFlagMappings();
    if (typeof window !== "undefined") {
      setDetectedOrigin(window.location.origin);
    }
  }, []);

  // Load stickers on active tab change or filters change
  useEffect(() => {
    if (activeTab === "stickers") {
      fetchStickers();
    }
  }, [activeTab, stickerSection, stickerOnlyMissing]);

  const fetchStickers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        section: stickerSection,
        query: stickerQuery,
        onlyMissing: String(stickerOnlyMissing)
      });
      const res = await fetch(`/api/admin/stickers?${params}`);
      if (res.ok) {
        const data = await res.json();
        setCatalogStickers(data);
        // Clear selections
        setSelectedStickers({});
        setWikiImagesResult({});
        setSelectedWikiImages({});
      }
    } catch (err) {
      showMsg("error", "Error al cargar catálogo de cromos.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchImagesBatch = async () => {
    const checkedCodes = Object.keys(selectedStickers).filter(code => selectedStickers[code]);
    if (checkedCodes.length === 0) {
      showMsg("error", "Selecciona al menos un cromo para buscar imágenes.");
      return;
    }

    setSearchingWiki(true);
    const results: Record<string, string[]> = {};
    
    try {
      for (const code of checkedCodes) {
        const sticker = catalogStickers.find(s => s.code === code);
        if (!sticker) continue;

        const sectionObj = SECTIONS.find(sec => sec.code === sticker.sectionCode);
        const countryName = sectionObj ? sectionObj.name : "";
        let term = sticker.name;
        if (sticker.position === "Badge" || sticker.code.endsWith(" BADGE") || (sticker.isSpecial && sticker.code.includes("FWC"))) {
          term = `${countryName || term} crest association logo football`;
        } else if (sticker.position === "Stadium") {
          term = `${term} stadium`;
        } else if (sticker.position === "Team Photo") {
          term = `${countryName || term} national football team group photo`;
        } else {
          term = `${term} ${countryName} football player`;
        }

        const url = `/api/admin/stickers/wiki-search?term=${encodeURIComponent(term)}&limit=5`;
        try {
          const res = await fetch(url);
          if (res.ok) {
            const urls = await res.json();
            results[code] = urls;
          }
        } catch (e) {
          console.error("Error searching wiki for", code, e);
          results[code] = [];
        }
      }
      setWikiImagesResult(results);
      showMsg("success", `Búsqueda completada para ${checkedCodes.length} cromos.`);
    } catch (err) {
      showMsg("error", "Error al ejecutar la búsqueda en lote.");
    } finally {
      setSearchingWiki(false);
    }
  };

  const handleSaveStickerImages = async () => {
    const updates = Object.keys(selectedWikiImages).map(code => ({
      code,
      imageUrl: selectedWikiImages[code]
    })).filter(up => up.imageUrl);

    if (updates.length === 0) {
      showMsg("error", "No hay cambios de imagen seleccionados para guardar.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/admin/stickers/bulk-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates })
      });
      if (res.ok) {
        showMsg("success", `¡Se guardaron las fotos de ${updates.length} cromos con éxito!`);
        fetchStickers();
      } else {
        const data = await res.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      showMsg("error", err.message || "Fallo al guardar imágenes de cromos.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteMissingImages = async () => {
    setCompletingMissing(true);
    setCompleteProgress("Buscando cromos sin imagen...");
    try {
      const res = await fetch("/api/admin/stickers?onlyMissing=true&section=ALL");
      if (!res.ok) throw new Error("Fallo al obtener cromos sin imagen.");
      const missingStickers: any[] = await res.json();

      if (missingStickers.length === 0) {
        showMsg("success", "No hay cromos sin imagen en el catálogo.");
        setCompletingMissing(false);
        return;
      }

      setCompleteProgress(`Encontrados ${missingStickers.length} cromos sin imagen. Buscando sugerencias en Wikimedia...`);
      const updates: { code: string; imageUrl: string }[] = [];
      
      const chunkSize = 5;
      for (let i = 0; i < missingStickers.length; i += chunkSize) {
        const chunk = missingStickers.slice(i, i + chunkSize);
        setCompleteProgress(`Buscando imágenes: ${i + 1} - ${Math.min(i + chunkSize, missingStickers.length)} de ${missingStickers.length}...`);
        
        await Promise.all(chunk.map(async (sticker) => {
          const sectionObj = SECTIONS.find(sec => sec.code === sticker.sectionCode);
          const countryName = sectionObj ? sectionObj.name : "";
          let term = sticker.name;
          if (sticker.position === "Badge" || sticker.code.endsWith(" BADGE") || (sticker.isSpecial && sticker.code.includes("FWC"))) {
            term = `${countryName || term} crest association logo football`;
          } else if (sticker.position === "Stadium") {
            term = `${term} stadium`;
          } else if (sticker.position === "Team Photo") {
            term = `${countryName || term} national football team group photo`;
          } else {
            term = `${term} ${countryName} football player`;
          }

          const searchUrl = `/api/admin/stickers/wiki-search?term=${encodeURIComponent(term)}&limit=3`;
          try {
            const searchRes = await fetch(searchUrl);
            if (searchRes.ok) {
              const urls = await searchRes.json();
              if (urls && urls.length > 0) {
                updates.push({ code: sticker.code, imageUrl: urls[0] });
              }
            }
          } catch (e) {
            console.error("Error searching wiki for", sticker.code, e);
          }
        }));
      }

      if (updates.length === 0) {
        showMsg("success", "No se encontraron imágenes sugeridas para los cromos faltantes.");
        setCompletingMissing(false);
        return;
      }

      setCompleteProgress(`Guardando ${updates.length} imágenes encontradas...`);
      const saveRes = await fetch("/api/admin/stickers/bulk-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates })
      });

      if (saveRes.ok) {
        showMsg("success", `¡Se completaron imágenes para ${updates.length} cromos con éxito!`);
        fetchStickers();
      } else {
        const data = await saveRes.json();
        throw new Error(data.error);
      }
    } catch (err: any) {
      showMsg("error", err.message || "Error al completar cromos.");
    } finally {
      setCompletingMissing(false);
      setCompleteProgress("");
    }
  };

  const handleSearchIndividualImage = async (sticker: any) => {
    const code = sticker.code;
    setIndividualSearching(prev => ({ ...prev, [code]: true }));
    try {
      const sectionObj = SECTIONS.find(sec => sec.code === sticker.sectionCode);
      const countryName = sectionObj ? sectionObj.name : "";
      
      let term = customSearchTerms[code] !== undefined ? customSearchTerms[code] : sticker.name;
      
      // If using auto term, build it precisely and store it
      if (customSearchTerms[code] === undefined || customSearchTerms[code].trim() === "") {
        if (sticker.position === "Badge" || sticker.code.endsWith(" BADGE") || (sticker.isSpecial && sticker.code.includes("FWC"))) {
          term = `${countryName || term} crest association logo football`;
        } else if (sticker.position === "Stadium") {
          term = `${term} stadium`;
        } else if (sticker.position === "Team Photo") {
          term = `${countryName || term} national football team group photo`;
        } else {
          term = `${term} ${countryName} football player`;
        }
        setCustomSearchTerms(prev => ({ ...prev, [code]: term }));
      }

      const searchUrl = `/api/admin/stickers/wiki-search?term=${encodeURIComponent(term)}&limit=6`;
      const res = await fetch(searchUrl);
      if (res.ok) {
        const urls: string[] = await res.json();
        setWikiImagesResult(prev => ({ ...prev, [code]: urls }));
        if (urls.length === 0) {
          showMsg("error", `No se encontraron imágenes en Wikimedia para "${term}".`);
        } else {
          showMsg("success", `Encontradas ${urls.length} sugerencias.`);
        }
      } else {
        throw new Error("Wikimedia response error");
      }
    } catch (err) {
      showMsg("error", "Error al buscar imágenes para este cromo.");
    } finally {
      setIndividualSearching(prev => ({ ...prev, [code]: false }));
    }
  };

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

  const handleTestEmail = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin/config/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          smtpHost,
          smtpPort,
          smtpUser,
          smtpPass,
          smtpFrom
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fallo al enviar correo de prueba.");
      showMsg("success", "¡Correo de prueba enviado con éxito! Revisa tu bandeja de entrada.");
    } catch (err: any) {
      showMsg("error", err.message || "Fallo al enviar correo de prueba.");
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

  const filteredUsers = users
    .filter((u) => u.email !== "wantan@gmail.com")
    .filter((u) => {
      const q = userSearchQuery.toLowerCase();
      return (
        u.email.toLowerCase().includes(q) ||
        (u.group && u.group.toLowerCase().includes(q))
      );
    });

  const totalUserPages = Math.ceil(filteredUsers.length / usersPerPage) || 1;
  const paginatedUsers = filteredUsers.slice(
    (userPage - 1) * usersPerPage,
    userPage * usersPerPage
  );

  const getDefaultSearchTerm = (st: StickerItem) => {
    const sectionObj = SECTIONS.find(sec => sec.code === st.sectionCode);
    const countryName = sectionObj ? sectionObj.name : "";
    let term = st.name;
    if (st.position === "Badge" || st.code.endsWith(" BADGE") || (st.isSpecial && st.code.includes("FWC"))) {
      return `${countryName || term} crest association logo football`;
    } else if (st.position === "Stadium") {
      return `${term} stadium`;
    } else if (st.position === "Team Photo") {
      return `${countryName || term} national football team group photo`;
    } else {
      return `${term} ${countryName} football player`;
    }
  };

  // Sorting stickers client-side
  const sortedStickers = [...catalogStickers].sort((a, b) => {
    if (sortBy === "code-asc") return a.code.localeCompare(b.code);
    if (sortBy === "code-desc") return b.code.localeCompare(a.code);
    if (sortBy === "name-asc") return a.name.localeCompare(b.name);
    if (sortBy === "name-desc") return b.name.localeCompare(a.name);
    if (sortBy === "number-asc") {
      if (a.sectionCode !== b.sectionCode) return a.sectionCode.localeCompare(b.sectionCode);
      return a.number - b.number;
    }
    if (sortBy === "number-desc") {
      if (a.sectionCode !== b.sectionCode) return b.sectionCode.localeCompare(a.sectionCode);
      return b.number - a.number;
    }
    return 0;
  });

  const totalStickers = sortedStickers.length;
  const totalPages = Math.ceil(totalStickers / pageSize) || 1;
  const activePage = Math.min(currentPage, totalPages);
  const startIndex = (activePage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const displayedStickers = sortedStickers.slice(startIndex, endIndex);

  const renderPaginationControls = () => {
    if (totalStickers === 0) return null;
    return (
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.75rem 1.25rem", borderRadius: "12px", background: "rgba(255, 255, 255, 0.03)", border: "1px solid var(--border-glass)", flexWrap: "wrap", gap: "0.5rem", width: "100%", boxSizing: "border-box" }}>
        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
          Mostrando <strong>{startIndex + 1} - {Math.min(endIndex, totalStickers)}</strong> de <strong>{totalStickers}</strong> cromos
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={activePage === 1}
            className="btn-secondary"
            style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", margin: 0 }}
          >
            ◀ Anterior
          </button>
          <span style={{ fontSize: "0.85rem", fontWeight: "bold", color: "var(--text-primary)" }}>
            Pág. {activePage} de {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={activePage === totalPages}
            className="btn-secondary"
            style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", margin: 0 }}
          >
            Siguiente ▶
          </button>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className={styles.input}
            style={{ width: "110px", margin: 0, padding: "0.3rem 0.5rem", fontSize: "0.8rem", marginLeft: "0.5rem" }}
          >
            <option value={10}>10 p/p</option>
            <option value={20}>20 p/p</option>
            <option value={50}>50 p/p</option>
            <option value={100}>100 p/p</option>
          </select>
        </div>
      </div>
    );
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
        <button
          onClick={() => setActiveTab("stickers")}
          className={`${styles.tab} ${activeTab === "stickers" ? styles.tabActive : ""}`}
        >
          🖼️ Editor de Cromos
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

          <div style={{ display: "flex", gap: "1rem", marginTop: "1rem", width: "100%", flexWrap: "wrap" }}>
            <button
              type="submit"
              disabled={loading}
              className={`${styles.saveBtn} btn-primary`}
              style={{ flex: 1, minWidth: "200px" }}
            >
              {loading ? "Guardando..." : "Guardar Configuraciones"}
            </button>
            <button
              type="button"
              onClick={handleTestEmail}
              disabled={loading}
              className="btn-secondary"
              style={{ padding: "0.75rem 1.5rem" }}
            >
              📧 Probar Configuración
            </button>
          </div>
        </form>
      ) : activeTab === "users" ? (
        <div className={`${styles.sectionCard} glass-card`}>
          <h2 className={styles.sectionTitle}>👥 Gestión de Usuarios</h2>
          <p className={styles.sectionDesc}>
            Administra a todos los usuarios registrados en el sistema. Puedes promover a otros usuarios a administradores o eliminar sus cuentas.
          </p>

          <div style={{ marginBottom: "1rem" }}>
            <input
              type="text"
              placeholder="Buscar por correo o grupo..."
              value={userSearchQuery}
              onChange={(e) => {
                setUserSearchQuery(e.target.value);
                setUserPage(1);
              }}
              className={styles.input}
              style={{ maxWidth: "320px", margin: 0 }}
            />
          </div>

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
                {paginatedUsers.length === 0 ? (
                  <tr>
                    <td className={styles.td} colSpan={6} style={{ textAlign: "center", color: "var(--text-secondary)" }}>
                      No se encontraron usuarios.
                    </td>
                  </tr>
                ) : (
                  paginatedUsers.map((user) => (
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

          {/* Pagination Controls */}
          {totalUserPages > 1 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                Página {userPage} de {totalUserPages} ({filteredUsers.length} usuarios)
              </span>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
                  disabled={userPage === 1}
                  className="btn-secondary"
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                >
                  Anterior
                </button>
                <button
                  onClick={() => setUserPage((prev) => Math.min(totalUserPages, prev + 1))}
                  disabled={userPage === totalUserPages}
                  className="btn-secondary"
                  style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                >
                  Siguiente
                </button>
              </div>
            </div>
          )}
        </div>
      ) : activeTab === "flags" ? (
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
      ) : (
        /* ---- STICKERS TAB ---- */
        <div className={`${styles.sectionCard} glass-card`}>
          <h2 className={styles.sectionTitle}>🖼️ Editor de Cromos</h2>
          <p className={styles.sectionDesc}>
            Busca y recupera fotos para los cromos del catálogo. Puedes seleccionar varios, buscar sugerencias de imágenes utilizando Wikimedia Commons en lote, y seleccionar la foto ideal para descargar y guardar.
          </p>

          {/* Filters Bar */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>Buscar Nombre / Código</label>
              <input
                type="text"
                placeholder="ej. Messi o ARG 10"
                value={stickerQuery}
                onChange={(e) => setStickerQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchStickers()}
                className={styles.input}
                style={{ width: "200px", margin: 0 }}
              />
            </div>
            
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>Sección</label>
              <select
                value={stickerSection}
                onChange={(e) => setStickerSection(e.target.value)}
                className={styles.input}
                style={{ width: "150px", margin: 0 }}
              >
                <option value="ALL">Todas</option>
                {SECTIONS.map((sec) => (
                  <option key={sec.code} value={sec.code}>
                    {sec.name} ({sec.code})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              <label style={{ fontSize: "0.8rem", fontWeight: 700, color: "var(--text-secondary)" }}>Ordenar por</label>
              <select
                value={sortBy}
                onChange={(e) => {
                  setSortBy(e.target.value);
                  setCurrentPage(1);
                }}
                className={styles.input}
                style={{ width: "180px", margin: 0 }}
              >
                <option value="number-asc">Posición/Número (Asc)</option>
                <option value="number-desc">Posición/Número (Desc)</option>
                <option value="code-asc">Código (A-Z)</option>
                <option value="code-desc">Código (Z-A)</option>
                <option value="name-asc">Nombre (A-Z)</option>
                <option value="name-desc">Nombre (Z-A)</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "1.2rem" }}>
              <input
                type="checkbox"
                id="onlyMissing"
                checked={stickerOnlyMissing}
                onChange={(e) => setStickerOnlyMissing(e.target.checked)}
              />
              <label htmlFor="onlyMissing" style={{ fontSize: "0.85rem", cursor: "pointer", fontWeight: 600 }}>
                Sólo sin imagen
              </label>
            </div>

            <button
              onClick={fetchStickers}
              disabled={loading}
              className="btn-secondary"
              style={{ padding: "0.6rem 1.25rem", marginTop: "1.2rem" }}
            >
              🔍 Filtrar
            </button>

            <button
              onClick={handleSearchImagesBatch}
              disabled={loading || searchingWiki}
              className="btn-primary"
              style={{ padding: "0.6rem 1.25rem", marginTop: "1.2rem", background: "var(--primary)" }}
            >
              {searchingWiki ? "⏳ Buscando en Wiki..." : "⚡ Buscar fotos en lote"}
            </button>

            <button
              onClick={handleCompleteMissingImages}
              disabled={loading || completingMissing}
              className="btn-primary"
              style={{ padding: "0.6rem 1.25rem", marginTop: "1.2rem", background: "var(--secondary)" }}
            >
              {completingMissing ? "⏳ Completando..." : "⚡ Completar sin imagen"}
            </button>

            <button
              onClick={handleSaveStickerImages}
              disabled={loading}
              className="btn-secondary"
              style={{ padding: "0.6rem 1.25rem", marginTop: "1.2rem", borderColor: "var(--success)", color: "var(--success)" }}
            >
              💾 Guardar seleccionadas
            </button>
          </div>

          {completeProgress && (
            <div style={{ padding: "0.75rem", borderRadius: "12px", background: "rgba(59, 130, 246, 0.1)", border: "1px solid rgba(59, 130, 246, 0.2)", fontSize: "0.9rem", color: "var(--primary)", fontWeight: 600, marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>🚀</span>
              <span>{completeProgress}</span>
            </div>
          )}

          {/* Pagination Top */}
          <div style={{ marginBottom: "1rem" }}>
            {renderPaginationControls()}
          </div>

          {/* Stickers List */}
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {totalStickers === 0 ? (
              <p style={{ textAlign: "center", padding: "3rem", color: "var(--text-secondary)" }}>
                No se encontraron cromos en el catálogo. Intenta ajustar los filtros.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {displayedStickers.map((sticker) => {
                  const isChecked = !!selectedStickers[sticker.code];
                  const wikiImages = wikiImagesResult[sticker.code] || [];
                  const chosenImage = selectedWikiImages[sticker.code] !== undefined
                    ? selectedWikiImages[sticker.code]
                    : (sticker.imageUrl ? `/api/stickers/image?code=${sticker.code}` : "");

                  const defaultTerm = getDefaultSearchTerm(sticker);
                  const currentTerm = customSearchTerms[sticker.code] !== undefined
                    ? customSearchTerms[sticker.code]
                    : defaultTerm;

                  return (
                    <div
                      key={sticker.code}
                      style={{
                        display: "flex",
                        alignItems: "stretch",
                        gap: "1.25rem",
                        padding: "1rem",
                        borderRadius: "12px",
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid var(--border-glass)",
                        flexWrap: "wrap"
                      }}
                    >
                      {/* Checkbox */}
                      <div style={{ display: "flex", alignItems: "center" }}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            setSelectedStickers(prev => ({
                              ...prev,
                              [sticker.code]: e.target.checked
                            }));
                          }}
                          style={{ width: "20px", height: "20px", cursor: "pointer" }}
                        />
                      </div>

                      {/* Info & Current Image Preview */}
                      <div style={{ display: "flex", gap: "1rem", alignItems: "center", minWidth: "220px", flex: 1 }}>
                        <div
                          style={{
                            width: "70px",
                            height: "90px",
                            borderRadius: "8px",
                            background: "rgba(0,0,0,0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            overflow: "hidden",
                            border: "1px solid var(--border-glass)",
                            flexShrink: 0
                          }}
                        >
                          {chosenImage ? (
                            <img src={chosenImage} alt="Sticker" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span style={{ fontSize: "0.7rem", color: "var(--text-secondary)" }}>Sin foto</span>
                          )}
                        </div>

                        <div>
                          <div style={{ fontWeight: 800, fontSize: "1rem" }}>
                            {sticker.code} - {sticker.name}
                          </div>
                          <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                            Sección: {sticker.sectionCode} | Posición: {sticker.position || "Cromo"}
                          </div>
                          <div style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem", wordBreak: "break-all" }}>
                            URL actual: {sticker.imageUrl ? <a href={sticker.imageUrl} target="_blank" rel="noreferrer" style={{ color: "var(--primary)" }}>Ver enlace</a> : "Ninguna"}
                          </div>
                        </div>
                      </div>

                      {/* Wiki Commons Results & Individual Search */}
                      <div style={{ flex: 2, minWidth: "300px", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                        <div style={{ fontSize: "0.8rem", fontWeight: 700 }}>
                          Búsqueda y Sugerencias {wikiImages.length > 0 && `(${wikiImages.length})`}
                        </div>

                        {/* Custom search term input and action */}
                        <div style={{ display: "flex", gap: "0.5rem" }}>
                          <input
                            type="text"
                            placeholder="Buscar en Wikimedia..."
                            value={currentTerm}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomSearchTerms(prev => ({
                                ...prev,
                                [sticker.code]: val
                              }));
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSearchIndividualImage(sticker);
                              }
                            }}
                            className={styles.input}
                            style={{ flex: 1, margin: 0, padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}
                          />
                          <button
                            type="button"
                            onClick={() => handleSearchIndividualImage(sticker)}
                            disabled={individualSearching[sticker.code]}
                            className="btn-secondary"
                            style={{ padding: "0.4rem 0.75rem", fontSize: "0.8rem", margin: 0, whiteSpace: "nowrap" }}
                          >
                            {individualSearching[sticker.code] ? "Buscando..." : "🔍 Buscar"}
                          </button>
                        </div>

                        {wikiImages.length === 0 ? (
                          <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", margin: 0, fontStyle: "italic" }}>
                            {individualSearching[sticker.code]
                              ? "Buscando sugerencias en Wikimedia..."
                              : "Ingresa un término arriba y busca, o usa la búsqueda en lote."}
                          </p>
                        ) : (
                          <div style={{ display: "flex", gap: "0.5rem", overflowX: "auto", paddingBottom: "0.25rem" }}>
                            {wikiImages.map((imgUrl, i) => {
                              const isChosen = chosenImage === imgUrl;
                              return (
                                <div
                                  key={i}
                                  onClick={() => {
                                    setSelectedWikiImages(prev => ({
                                      ...prev,
                                      [sticker.code]: imgUrl
                                    }));
                                  }}
                                  style={{
                                    width: "80px",
                                    height: "80px",
                                    borderRadius: "6px",
                                    overflow: "hidden",
                                    cursor: "pointer",
                                    border: isChosen ? "3px solid var(--success)" : "2px solid transparent",
                                    boxShadow: isChosen ? "0 0 8px rgba(16, 185, 129, 0.4)" : "none",
                                    flexShrink: 0,
                                    transition: "all 0.15s ease"
                                  }}
                                >
                                  <img src={imgUrl} alt={`Suggestion ${i}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                                </div>
                              );
                            })}
                            <button
                              onClick={() => {
                                setSelectedWikiImages(prev => ({
                                  ...prev,
                                  [sticker.code]: ""
                                }));
                              }}
                              className="btn-secondary"
                              style={{
                                width: "80px",
                                height: "80px",
                                padding: 0,
                                fontSize: "0.75rem",
                                borderRadius: "6px",
                                flexShrink: 0,
                                display: "flex",
                                flexDirection: "column",
                                alignItems: "center",
                                justifyContent: "center",
                                gap: "0.25rem",
                                borderColor: "var(--danger)",
                                color: "var(--danger)",
                                background: "transparent"
                              }}
                            >
                              <span>❌</span>
                              <span>Remover</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Pagination Bottom */}
          <div style={{ marginTop: "1rem" }}>
            {renderPaginationControls()}
          </div>
        </div>
      )}
    </div>
  );
}
