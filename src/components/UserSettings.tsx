"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { startRegistration } from "@simplewebauthn/browser";
import QRCode from "qrcode";
import styles from "./UserSettings.module.css";
import { useI18n } from "@/lib/i18n";

interface AuthenticatorInfo {
  id: string;
  credentialDeviceType: string;
  credentialBackedUp: boolean;
  name: string | null;
}

interface UserSettingsProps {
  userEmail: string;
  initialName: string | null;
  initial2faEnabled: boolean;
  initialGroupName: string;
  initialGroupInvite: string;
  initialGroupRole: string;
  initialKeys: AuthenticatorInfo[];
  initialAvatarType: string;
  initialAvatarUrl: string | null;
  userRole: string;
  isMailConfigured: boolean;
  initialGoogleEmail: string | null;
}

export default function UserSettings({
  userEmail,
  initialName,
  initial2faEnabled,
  initialGroupName,
  initialGroupInvite,
  initialGroupRole,
  initialKeys,
  initialAvatarType,
  initialAvatarUrl,
  userRole,
  isMailConfigured,
  initialGoogleEmail
}: UserSettingsProps) {
  const router = useRouter();
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);
  const { t, language } = useI18n();

  // States
  const [displayName, setDisplayName] = useState(initialName || "");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(initial2faEnabled);
  const [twoFactorSetup, setTwoFactorSetup] = useState<{ secret: string; qrUrl: string } | null>(null);
  const [token2FA, setToken2FA] = useState("");
  
  // Group states
  const [groupName, setGroupName] = useState(initialGroupName);
  const [groupInvite, setGroupInvite] = useState(initialGroupInvite);
  const [groupRole, setGroupRole] = useState(initialGroupRole);
  
  const [joinCode, setJoinCode] = useState("");
  const [newGroupName, setNewGroupName] = useState("");

  // Passkey states
  const [keys, setKeys] = useState<AuthenticatorInfo[]>(initialKeys);

  // Avatar states
  const [avatarType, setAvatarType] = useState(initialAvatarType);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [avatarSrc, setAvatarSrc] = useState("");

  // Google OAuth states
  const [googleEmail, setGoogleEmail] = useState<string | null>(initialGoogleEmail);

  // Email invitation states
  const [inviteEmail, setInviteEmail] = useState("");
  const [sendingInvite, setSendingInvite] = useState(false);

  // 2FA Recovery Codes states
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);

  useEffect(() => {
    const resolveAvatar = async () => {
      if (avatarType === "UPLOAD" && avatarUrl) {
        setAvatarSrc(avatarUrl);
      } else {
        try {
          const msgUint8 = new TextEncoder().encode(userEmail.trim().toLowerCase());
          const hashBuffer = await crypto.subtle.digest("SHA-256", msgUint8);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
          setAvatarSrc(`https://www.gravatar.com/avatar/${hashHex}?d=identicon&s=150`);
        } catch (e) {
          setAvatarSrc(`https://www.gravatar.com/avatar/default?d=identicon`);
        }
      }
    };
    resolveAvatar();
  }, [avatarType, avatarUrl, userEmail]);

  // Avatar action callbacks
  const handleSaveAvatar = async (type: "GRAVATAR" | "UPLOAD", url: string | null) => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarType: type, avatarUrl: url })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al actualizar perfil.");
      setAvatarType(data.avatarType);
      setAvatarUrl(data.avatarUrl);
      showMsg("success", "Imagen de perfil actualizada correctamente.");
      router.refresh();
    } catch (err: any) {
      showMsg("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1 * 1024 * 1024) {
      showMsg("error", "La imagen supera el límite de 1MB. Por favor sube una imagen más pequeña.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      handleSaveAvatar("UPLOAD", base64String);
    };
    reader.readAsDataURL(file);
  };

  // Status message
  const [status, setStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const showMsg = (type: "success" | "error", message: string) => {
    setStatus({ type, message });
    setTimeout(() => setStatus(null), 4000);
  };

  // Draw 2FA QR code when setup state mounts
  useEffect(() => {
    if (twoFactorSetup && qrCanvasRef.current) {
      QRCode.toCanvas(
        qrCanvasRef.current,
        twoFactorSetup.qrUrl,
        {
          width: 140,
          margin: 1,
          color: {
            dark: "#1e293b",
            light: "#ffffff"
          }
        },
        (err) => {
          if (err) console.error("2FA QR Generation Error:", err);
        }
      );
    }
  }, [twoFactorSetup]);

  // ----------------------------------------------------
  // TWO-FACTOR AUTH (2FA) ACTIONS
  // ----------------------------------------------------
  const handleStart2FASetup = async () => {
    setLoading(true);
    setStatus(null);
    try {
      const res = await fetch("/api/auth/2fa/generate", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fallo al generar secreto 2FA.");
      setTwoFactorSetup({
        secret: data.secret,
        qrUrl: data.otpAuthUrl
      });
    } catch (err: any) {
      showMsg("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyAndEnable2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!twoFactorSetup || !token2FA) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/2fa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          secret: twoFactorSetup.secret,
          token: token2FA
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Código 2FA incorrecto.");

      setTwoFactorEnabled(true);
      setTwoFactorSetup(null);
      setToken2FA("");
      
      if (data.recoveryCodes) {
        setRecoveryCodes(data.recoveryCodes);
        setShowRecoveryModal(true);
      } else {
        showMsg("success", "¡Verificación de dos factores activada con éxito!");
      }
      router.refresh();
    } catch (err: any) {
      showMsg("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisable2FA = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/2fa/disable", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fallo al desactivar 2FA.");
      
      setTwoFactorEnabled(false);
      showMsg("success", "La verificación de dos factores ha sido desactivada.");
      router.refresh();
    } catch (err: any) {
      showMsg("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // WEBAUTHN PASSKEYS (BIOMETRICS) ACTIONS
  // ----------------------------------------------------
  const handleRegisterPasskey = async () => {
    setLoading(true);
    setStatus(null);

    try {
      const passkeyName = window.prompt(t("passkeyNamePrompt") || "Ingresa un nombre para esta llave de paso (ej. Mi Laptop):");
      if (passkeyName === null) {
        setLoading(false);
        return; // user cancelled
      }

      // 1. Fetch options
      const optionsRes = await fetch("/api/auth/passkey/generate-registration-options", { method: "POST" });
      const optionsData = await optionsRes.json();
      if (!optionsRes.ok) throw new Error(optionsData.error || "Fallo al obtener opciones.");

      // 2. Trigger browser authenticator popup
      const registrationResponse = await startRegistration({
        optionsJSON: optionsData
      });

      // 3. Verify response on server
      const verifyRes = await fetch("/api/auth/passkey/verify-registration", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...registrationResponse,
          passkeyName: passkeyName || "Dispositivo Biométrico"
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) throw new Error(verifyData.error || "Fallo en la firma del dispositivo.");

      showMsg("success", "¡Llave de paso (Passkey) agregada con éxito!");
      
      // Reload keys from server
      const keysRes = await fetch("/api/auth/passkey/list"); // or reload page
      if (keysRes.ok) {
        const freshKeys = await keysRes.json();
        setKeys(freshKeys);
      } else {
        window.location.reload();
      }
    } catch (err: any) {
      showMsg("error", err.message || "Fallo al registrar la llave.");
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // GROUP MANAGEMENT ACTIONS
  // ----------------------------------------------------
  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/group", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: joinCode })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fallo al unirse al grupo.");

      showMsg("success", `Te has unido al grupo familiar "${data.group.name}"!`);
      setGroupName(data.group.name);
      setGroupInvite(joinCode.toUpperCase());
      setGroupRole("GUEST");
      setJoinCode("");
      router.refresh();
    } catch (err: any) {
      showMsg("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fallo al crear el grupo.");

      showMsg("success", `Grupo familiar "${data.group.name}" creado con éxito.`);
      setGroupName(data.group.name);
      setGroupInvite(data.group.inviteCode);
      setGroupRole("PRINCIPAL");
      setNewGroupName("");
      router.refresh();
    } catch (err: any) {
      showMsg("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // Copy invite code to clipboard
  const handleCopyInviteCode = () => {
    if (!groupInvite) return;
    navigator.clipboard.writeText(groupInvite);
    showMsg("success", "¡Código de invitación copiado al portapapeles!");
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(15);
    }
  };

  // Send email invitation
  const handleSendInviteEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !groupInvite) return;
    setSendingInvite(true);
    try {
      const res = await fetch("/api/group/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, inviteCode: groupInvite })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fallo al enviar la invitación.");
      showMsg("success", "¡Invitación enviada con éxito!");
      setInviteEmail("");
    } catch (err: any) {
      showMsg("error", err.message);
    } finally {
      setSendingInvite(false);
    }
  };

  // Share invitation via Web Share or fallback
  const handleShareInvite = async () => {
    if (!groupInvite) return;
    const shareText = `¡Únete a mi grupo familiar "${groupName}" en AlbumHelper para coleccionar y cambiar cromos del Mundial juntos!\n\nCódigo de invitación: ${groupInvite}\nEnlace para unirse: ${window.location.origin}/login?invite=${groupInvite}`;

    if (navigator.share) {
      try {
        await navigator.share({
          text: shareText
        });
        showMsg("success", "¡Invitación compartida!");
      } catch (err) {
        navigator.clipboard.writeText(shareText);
        showMsg("success", "¡Mensaje de invitación copiado al portapapeles!");
      }
    } else {
      navigator.clipboard.writeText(shareText);
      showMsg("success", "¡Mensaje de invitación copiado al portapapeles!");
    }
  };

  // Google OAuth Association actions
  const handleLinkGoogle = () => {
    window.location.href = "/api/auth/google/login?associate=true";
  };

  const handleUnlinkGoogle = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/google/unlink", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fallo al desvincular.");
      setGoogleEmail(null);
      showMsg("success", "Cuenta de Google desvinculada con éxito.");
    } catch (err: any) {
      showMsg("error", err.message);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------
  // PROFILE NAME ACTION
  // ----------------------------------------------------
  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingName) return;
    setIsSavingName(true);
    try {
      const res = await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: displayName.trim() })
      });
      if (res.ok) {
        showMsg("success", language === "es" ? "¡Nombre de usuario actualizado!" : "Username updated!");
        setIsEditingName(false);
        router.refresh();
      } else {
        const data = await res.json();
        showMsg("error", data.error || (language === "es" ? "Fallo al actualizar el nombre." : "Failed to update name."));
      }
    } catch (e) {
      showMsg("error", language === "es" ? "Error al guardar el nombre." : "Error saving name.");
    } finally {
      setIsSavingName(false);
    }
  };

  // ----------------------------------------------------
  // LOGOUT ACTION
  // ----------------------------------------------------
  const handleLogout = async () => {
    setLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      showMsg("error", "Error al cerrar sesión.");
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
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

      {/* 1. Profile / Account Summary Card */}
      <div className={`${styles.section} glass-card`} style={{ position: "relative" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
            {/* Avatar Preview */}
            <div className={styles.avatarPreviewContainer} style={{ margin: 0 }}>
              <img
                src={avatarSrc || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%2364748b' d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/%3E%3C/svg%3E"}
                alt="Avatar Preview"
                className={styles.avatarPreview}
              />
            </div>

            {/* Greeting and editable display name */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
              {isEditingName ? (
                <form onSubmit={handleSaveName} style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span style={{ fontSize: "1.3rem", fontWeight: 800, color: "var(--text-primary)" }}>
                    👋 {language === "es" ? "¡Hola" : "Hello"}
                  </span>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="input"
                    placeholder={language === "es" ? "Tu nombre" : "Your name"}
                    style={{
                      padding: "0.2rem 0.5rem",
                      fontSize: "1.2rem",
                      fontWeight: 800,
                      borderRadius: "6px",
                      width: "140px",
                      background: "var(--bg-secondary)",
                      border: "1px solid var(--border-subtle)"
                    }}
                    autoFocus
                    required
                  />
                  <button
                    type="submit"
                    disabled={isSavingName}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--success, #10b981)",
                      cursor: "pointer",
                      padding: "0.25rem",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "opacity 0.2s"
                    }}
                    title={language === "es" ? "Guardar" : "Save"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDisplayName(initialName || "");
                      setIsEditingName(false);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      padding: "0.25rem",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "opacity 0.2s"
                    }}
                    title={language === "es" ? "Cancelar" : "Cancel"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                </form>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                  <h2 className={styles.sectionTitle} style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800 }}>
                    {displayName ? `👋 ${language === "es" ? "¡Hola" : "Hello"} ${displayName}!` : `👋 ${language === "es" ? "¡Hola!" : "Hello!"}`}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setIsEditingName(true)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--text-secondary)",
                      cursor: "pointer",
                      padding: "0.25rem",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "color 0.2s"
                    }}
                    title={language === "es" ? "Editar nombre" : "Edit name"}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                      <path d="M12 20h9"/>
                      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/>
                    </svg>
                  </button>
                </div>
              )}
              
              <p className={styles.sectionDesc} style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-secondary)" }}>
                {t("profileDesc")}<strong>{userEmail}</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={loading}
            className="btn-danger"
            style={{
              margin: 0,
              padding: "0.55rem 1.25rem",
              fontSize: "0.85rem",
              background: "var(--danger, #ef4444)",
              color: "#ffffff",
              border: "none",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(239, 68, 68, 0.25)",
              display: "flex",
              alignItems: "center",
              gap: "0.4rem"
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            {t("profileLogout")}
          </button>
        </div>

        {/* Divider line between main details and avatar configurations */}
        <div style={{ borderTop: "1px solid var(--border-glass)", margin: "1.5rem 0" }} />

        {/* Avatar Configurations (bottom part) */}
        <div className={styles.avatarControls}>
          <span className={styles.label} style={{ display: "block", marginBottom: "0.5rem", fontWeight: 700, fontSize: "0.75rem", letterSpacing: "0.05em" }}>
            {t("profileConfigAvatar")}
          </span>
          
          <div className={styles.avatarToggleGroup}>
            <button
              type="button"
              onClick={() => handleSaveAvatar("GRAVATAR", null)}
              className={`${styles.avatarToggleBtn} ${avatarType === "GRAVATAR" ? styles.avatarToggleBtnActive : ""}`}
              disabled={loading}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.6rem 1.25rem",
                borderRadius: "10px"
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                <circle cx="12" cy="12" r="10"/>
                <circle cx="12" cy="10" r="3"/>
                <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662"/>
              </svg>
              {t("profileUseGravatar")}
            </button>
            
            <label
              className={`${styles.avatarToggleBtn} ${avatarType === "UPLOAD" ? styles.avatarToggleBtnActive : ""}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.6rem 1.25rem",
                borderRadius: "10px",
                margin: 0
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              {t("profileUploadImg")}
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                style={{ display: "none" }}
                disabled={loading}
              />
            </label>
          </div>
        </div>
      </div>

      {/* 2. Family Group Management Card */}
      <div className={`${styles.section} glass-card`}>
        <h2 className={styles.sectionTitle}>{t("groupTitle")}</h2>
        <p className={styles.sectionDesc}>
          {t("groupDesc")}
        </p>

        {groupName && (
          <div className={styles.groupInfo}>
            <div>
              <span className={styles.groupLabel}>{t("groupActive")}</span>
              <div className={styles.groupVal}>{groupName}</div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 600 }}>
                {t("groupRoleLabel")} {groupRole === "PRINCIPAL" ? t("groupRoleAdmin") : t("groupRoleGuest")}
              </span>
            </div>
            {groupInvite && (
              <div>
                <span className={styles.groupLabel} style={{ display: "block", marginBottom: "0.25rem" }}>
                  {t("groupInviteLabel")}
                </span>
                <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <div className={styles.codeBox}>
                    <span className={styles.codeText}>{groupInvite}</span>
                    <button type="button" onClick={handleCopyInviteCode} className={styles.copyBtn} title="Copiar Código">
                      📋
                    </button>
                  </div>
                  <button type="button" onClick={handleShareInvite} className={styles.avatarToggleBtn} style={{ padding: "0.6rem 0.85rem", height: "100%", margin: 0 }} title={t("groupInviteShareBtn")}>
                    📲 Compartir
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {groupName && groupInvite && isMailConfigured && (
          <form onSubmit={handleSendInviteEmail} className={styles.miniForm} style={{ marginBottom: "1.5rem", background: "var(--bg-glass)", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--border-glass)" }}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-secondary)" }}>✉️ {t("groupInviteEmailLabel")}</h3>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className={`${styles.input} input`}
                placeholder={t("groupInviteEmailPlaceholder")}
                disabled={loading || sendingInvite}
                required
                style={{ flex: 1 }}
              />
              <button type="submit" disabled={loading || sendingInvite} className="btn-primary" style={{ padding: "0.55rem 1.25rem", whiteSpace: "nowrap" }}>
                {sendingInvite ? "..." : t("groupInviteEmailBtn")}
              </button>
            </div>
          </form>
        )}

        <div className={styles.formsRow}>
          {/* Join Form */}
          <form onSubmit={handleJoinGroup} className={styles.miniForm}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>{t("groupJoinTitle")}</h3>
            <div className={styles.group}>
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                maxLength={6}
                className={`${styles.input} input`}
                placeholder={t("groupJoinPlaceholder")}
                disabled={loading}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-secondary" style={{ padding: "0.55rem" }}>
              {t("groupJoinBtn")}
            </button>
          </form>

          {/* Create Form */}
          <form onSubmit={handleCreateGroup} className={styles.miniForm}>
            <h3 style={{ fontSize: "0.95rem", fontWeight: 700 }}>{t("groupCreateTitle")}</h3>
            <div className={styles.group}>
              <input
                type="text"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                className={`${styles.input} input`}
                placeholder={t("groupCreatePlaceholder")}
                disabled={loading}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-secondary" style={{ padding: "0.55rem" }}>
              {t("groupCreateBtn")}
            </button>
          </form>
        </div>
      </div>

      {/* 3. Google Authentication Card */}
      <div className={`${styles.section} glass-card`}>
        <h2 className={styles.sectionTitle}>⚙️ {t("googleLinkTitle")}</h2>
        <p className={styles.sectionDesc}>
          {t("googleLinkDesc")}
        </p>
        
        {googleEmail ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", background: "var(--primary-glow)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(59, 130, 246, 0.1)" }}>
            <div>
              <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", fontWeight: 600, textTransform: "uppercase" }}>{t("googleLinkedStatus")}</span>
              <strong style={{ fontSize: "1rem", color: "var(--text-primary)" }}>{googleEmail}</strong>
            </div>
            <button type="button" onClick={handleUnlinkGoogle} disabled={loading} className={`${styles.avatarToggleBtn} btn-secondary btnDanger`} style={{ margin: 0, padding: "0.5rem 1rem" }}>
              {t("googleUnlinkBtn")}
            </button>
          </div>
        ) : (
          <button type="button" onClick={handleLinkGoogle} disabled={loading} className={`${styles.avatarToggleBtn}`} style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.5rem 1rem" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" style={{ marginRight: "4px" }}>
              <path fill="#EA4335" d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.6 14.99 1 12 1 7.35 1 3.37 3.65 1.4 7.56l3.85 2.99c.92-2.75 3.5-4.51 6.75-4.51z"/>
              <path fill="#4285F4" d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.44c-.28 1.47-1.11 2.71-2.35 3.55l3.65 2.83c2.14-1.97 3.75-4.88 3.75-8.54z"/>
              <path fill="#FBBC05" d="M5.25 14.57c-.24-.72-.37-1.49-.37-2.29s.13-1.57.37-2.29L1.4 7.01C.51 8.81 0 10.82 0 12.91s.51 4.1 1.4 5.9l3.85-2.99z"/>
              <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.65-2.83c-1.01.68-2.31 1.09-4.31 1.09-3.25 0-5.83-1.76-6.75-4.51L1.4 16.83C3.37 20.74 7.35 23 12 23z"/>
            </svg>
            {t("googleLinkBtn")}
          </button>
        )}
      </div>

      {/* 4. Two-Factor Authentication (2FA) Card */}
      <div className={`${styles.section} glass-card`}>
        <h2 className={styles.sectionTitle}>{t("tfaTitle")}</h2>
        <p className={styles.sectionDesc}>
          {t("tfaDesc")}
        </p>

        {twoFactorEnabled ? (
          <div>
            <div style={{ color: "var(--success)", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem" }}>
              {t("tfaEnabled")}
            </div>
            <button onClick={handleDisable2FA} disabled={loading} className="btn-secondary btnDanger">
              {t("tfaDisableBtn")}
            </button>
          </div>
        ) : twoFactorSetup ? (
          <div>
            <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.75rem" }}>
              {t("tfaSetupText")}
            </p>
            <div className={styles.qrContainer}>
              <div className={styles.qrCanvasContainer}>
                <canvas ref={qrCanvasRef} className={styles.qrCanvas} />
              </div>
              <div className={styles.qrDetails}>
                <span className={styles.label}>{t("tfaManualText")}</span>
                <span className={styles.secretText}>{twoFactorSetup.secret}</span>
                <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>
                  {t("tfaManualTip")}
                </span>
              </div>
            </div>

            <form onSubmit={handleVerifyAndEnable2FA} className={styles.miniForm} style={{ maxWidth: "300px" }}>
              <div className={styles.group}>
                <label className={styles.label}>{t("tfaVerifyLabel")}</label>
                <input
                  type="text"
                  maxLength={6}
                  value={token2FA}
                  onChange={(e) => setToken2FA(e.target.value.replace(/[^0-9]/g, ""))}
                  className={`${styles.input} input`}
                  placeholder="000000"
                  required
                  disabled={loading}
                />
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button type="submit" disabled={loading} className="btn-primary" style={{ padding: "0.55rem", flex: 1 }}>
                  {t("tfaVerifyBtn")}
                </button>
                <button
                  type="button"
                  onClick={() => setTwoFactorSetup(null)}
                  disabled={loading}
                  className="btn-secondary"
                  style={{ padding: "0.55rem" }}
                >
                  {t("tfaCancelBtn")}
                </button>
              </div>
            </form>
          </div>
        ) : (
          <button onClick={handleStart2FASetup} disabled={loading} className="btn-primary">
            {t("tfaTitle")}
          </button>
        )}
      </div>

      {/* 4. WebAuthn Passkeys Card */}
      <div className={`${styles.section} glass-card`}>
        <h2 className={styles.sectionTitle}>{t("passkeysTitle")}</h2>
        <p className={styles.sectionDesc}>
          {t("passkeysDesc")}
        </p>

        <button onClick={handleRegisterPasskey} disabled={loading} className="btn-primary">
          {t("passkeysRegisterBtn")}
        </button>

        {keys.length > 0 && (
          <div className={styles.keysList}>
            <h3 style={{ fontSize: "0.9rem", fontWeight: 700, color: "var(--text-primary)" }}>{t("passkeysRegisteredHeader")}</h3>
            {keys.map((key) => (
              <div key={key.id} className={styles.keyItem}>
                <div className={styles.keyInfo}>
                  <span className={styles.keyIcon}>💻</span>
                  <div>
                    <span className={styles.keyName}>{key.name || t("passkeysBiometric")}</span>
                    <div className={styles.keyMeta}>
                      Tipo: {key.credentialDeviceType} • Respaldo: {key.credentialBackedUp ? "Sí" : "No"}
                    </div>
                  </div>
                </div>
                <span style={{ color: "var(--success)", fontSize: "0.8rem", fontWeight: 700 }}>{t("passkeysStatusActive")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 5. Administration Section (Admins only, placed at the very bottom) */}
      {userRole === "ADMIN" && (
        <div className={`${styles.section} glass-card`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(59, 130, 246, 0.2)", background: "rgba(29, 78, 216, 0.05)", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 className={styles.sectionTitle} style={{ margin: 0 }}>{t("adminPanelBtn")}</h2>
            <p className={styles.sectionDesc} style={{ margin: "0.25rem 0 0 0" }}>
              Accede al panel global de configuración, SMTP y gestión de usuarios del sistema.
            </p>
          </div>
          <button onClick={() => router.push("/admin")} disabled={loading} className="btn-primary" style={{ padding: "0.65rem 1.5rem", margin: 0 }}>
            {t("adminPanelBtn")}
          </button>
        </div>
      )}

      {/* Packs Simulator Link Section */}
      <div className={`${styles.section} glass-card`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(59, 130, 246, 0.2)", background: "rgba(59, 130, 246, 0.03)", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 className={styles.sectionTitle} style={{ margin: 0 }}>{t("packsTitle")}</h2>
          <p className={styles.sectionDesc} style={{ margin: "0.25rem 0 0 0" }}>
            {t("packsDesc")}
          </p>
        </div>
        <button onClick={() => router.push("/packs")} className="btn-secondary" style={{ padding: "0.65rem 1.5rem", margin: 0 }}>
          {t("packsTitle")}
        </button>
      </div>

      {/* Help Section */}
      <div className={`${styles.section} glass-card`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid rgba(147, 51, 234, 0.2)", background: "rgba(147, 51, 234, 0.03)", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <h2 className={styles.sectionTitle} style={{ margin: 0 }}>❓ {t("helpHeader")}</h2>
          <p className={styles.sectionDesc} style={{ margin: "0.25rem 0 0 0" }}>
            {t("helpDesc")}
          </p>
        </div>
        <button onClick={() => router.push("/help")} className="btn-secondary" style={{ padding: "0.65rem 1.5rem", margin: 0 }}>
          {t("helpTitle")}
        </button>
      </div>

      {/* 6. About Section */}
      <div className={`${styles.section} glass-card`} style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem" }}>
        <h2 className={styles.sectionTitle} style={{ margin: 0 }}>{t("aboutTitle")}</h2>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.5rem" }}>
          <span style={{ fontSize: "1.5rem" }}>⚽</span>
          <strong style={{ fontSize: "1.25rem", color: "var(--text-primary)" }}>AlbumHelper</strong>
        </div>
        <p className={styles.sectionDesc} style={{ margin: "0.5rem 0", maxWidth: "500px", lineHeight: "1.5", fontSize: "0.9rem" }}>
          {t("aboutDesc")}
        </p>
        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
          &copy; {new Date().getFullYear()}{" "}
          <a
            href="https://raskitoma.io"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "var(--primary)", textDecoration: "none", fontWeight: 600 }}
          >
            Raskitoma.io
          </a>
        </div>
      </div>

      {/* 2FA Recovery Codes Modal */}
      {showRecoveryModal && recoveryCodes && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "1rem" }}>
          <div className="glass-card" style={{ maxWidth: "450px", width: "100%", padding: "2rem", display: "flex", flexDirection: "column", gap: "1.25rem", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.3)" }}>
            <h2 style={{ fontSize: "1.25rem", fontWeight: 800, color: "var(--text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {t("recoveryCodesModalTitle")}
            </h2>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.4, margin: 0 }}>
              {t("recoveryCodesModalDesc")}
            </p>
            
            <div style={{ background: "var(--bg-glass)", border: "1px solid var(--border-glass)", borderRadius: "10px", padding: "1rem" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem", fontFamily: "monospace", fontSize: "1rem", color: "var(--text-primary)" }}>
                {recoveryCodes.map((code, idx) => (
                  <div key={idx} style={{ padding: "0.25rem 0", display: "flex", gap: "0.5rem" }}>
                    <span style={{ color: "var(--text-secondary)" }}>{idx + 1}.</span>
                    <strong>{code}</strong>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ flex: 1, padding: "0.5rem", fontSize: "0.85rem" }}
                onClick={() => {
                  navigator.clipboard.writeText(recoveryCodes.join("\n"));
                  showMsg("success", "¡Códigos copiados!");
                }}
              >
                {t("recoveryCodesCopyBtn")}
              </button>
              
              {isMailConfigured && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1, padding: "0.5rem", fontSize: "0.85rem" }}
                  onClick={async () => {
                    try {
                      const res = await fetch("/api/auth/2fa/send-recovery", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ codes: recoveryCodes })
                      });
                      if (!res.ok) throw new Error("Fallo al enviar.");
                      showMsg("success", "¡Códigos enviados al correo!");
                    } catch (err) {
                      showMsg("error", "No se pudieron enviar los códigos.");
                    }
                  }}
                >
                  {t("recoveryCodesEmailBtn")}
                </button>
              )}
            </div>

            <button
              type="button"
              className="btn-primary"
              style={{ width: "100%", padding: "0.6rem" }}
              onClick={() => {
                setShowRecoveryModal(false);
                setRecoveryCodes(null);
                showMsg("success", "¡2FA activado y configurado!");
              }}
            >
              {t("recoveryCodesDoneBtn")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
