"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "../auth.module.css";

export default function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [groupName, setGroupName] = useState("");

  // Pre-populate invite code from URL if present
  useEffect(() => {
    const invite = searchParams.get("invite") || searchParams.get("code");
    if (invite) {
      setInviteCode(invite.toUpperCase());
    }
  }, [searchParams]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [oauthEnabled, setOauthEnabled] = useState(false);

  useEffect(() => {
    async function checkOauth() {
      try {
        const res = await fetch("/api/auth/config");
        if (res.ok) {
          const data = await res.json();
          setOauthEnabled(data.googleEnabled);
        }
      } catch (err) {
        console.error("Failed to fetch auth configurations:", err);
      }
    }
    checkOauth();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Form validations
    if (!email || !password || !confirmPassword) {
      setError("Por favor, completa todos los campos obligatorios.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          inviteCode: inviteCode.trim().toUpperCase(),
          groupName: groupName.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Algo salió mal.");
      }

      setSuccess("¡Cuenta registrada con éxito! Redirigiendo...");

      setTimeout(() => {
        router.push("/album");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Fallo en el registro de la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <div className={styles.errorBox}>{error}</div>}
      {success && <div className={styles.successBox}>{success}</div>}

      <div className={styles.group}>
        <label className={styles.label} htmlFor="email">Correo Electrónico *</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={styles.input}
          placeholder="nombre@correo.com"
          required
          disabled={loading}
        />
      </div>

      <div className={styles.group}>
        <label className={styles.label} htmlFor="password">Contraseña *</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={styles.input}
          placeholder="••••••"
          required
          disabled={loading}
        />
      </div>

      <div className={styles.group}>
        <label className={styles.label} htmlFor="confirmPassword">Confirmar Contraseña *</label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={styles.input}
          placeholder="••••••"
          required
          disabled={loading}
        />
      </div>

      <div className={styles.divider}>Grupo Familiar (Opcional)</div>

      <div className={styles.group}>
        <label className={styles.label} htmlFor="inviteCode">Código de Invitación de Grupo</label>
        <input
          id="inviteCode"
          type="text"
          value={inviteCode}
          onChange={(e) => setInviteCode(e.target.value)}
          className={styles.input}
          placeholder="Ej: FAM123 (6 caracteres)"
          maxLength={6}
          disabled={loading || !!groupName}
        />
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
          Ingresa el código si te invitaron a un grupo existente.
        </span>
      </div>

      <div style={{ textAlign: "center", fontSize: "0.85rem", color: "var(--text-secondary)", margin: "0.25rem 0" }}>o</div>

      <div className={styles.group}>
        <label className={styles.label} htmlFor="groupName">Crear un Nuevo Grupo Familiar</label>
        <input
          id="groupName"
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className={styles.input}
          placeholder="Ej: Familia Gómez"
          disabled={loading || !!inviteCode}
        />
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
          Si dejas ambos vacíos, se creará un álbum individual por defecto.
        </span>
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`${styles.submitBtn} btn-primary`}
      >
        {loading ? "Registrando..." : "Registrarse"}
      </button>

      {oauthEnabled && (
        <>
          <div className={styles.divider}>o regístrate con</div>
          <button
            type="button"
            onClick={() => {
              const params = new URLSearchParams();
              if (inviteCode.trim()) {
                params.set("inviteCode", inviteCode.trim().toUpperCase());
              }
              if (groupName.trim()) {
                params.set("groupName", groupName.trim());
              }
              const queryStr = params.toString() ? `?${params.toString()}` : "";
              window.location.href = `/api/auth/google/login${queryStr}`;
            }}
            disabled={loading}
            className={styles.googleBtn}
            style={{ width: "100%" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M12 5.04c1.66 0 3.2.57 4.38 1.69l3.27-3.27C17.67 1.6 14.99 1 12 1 7.35 1 3.37 3.65 1.4 7.56l3.85 2.99c.92-2.75 3.5-4.51 6.75-4.51z"
              />
              <path
                fill="#4285F4"
                d="M23.49 12.27c0-.81-.07-1.59-.2-2.35H12v4.51h6.44c-.28 1.47-1.11 2.71-2.35 3.55l3.65 2.83c2.14-1.97 3.75-4.88 3.75-8.54z"
              />
              <path
                fill="#FBBC05"
                d="M5.25 14.57c-.24-.72-.37-1.49-.37-2.29s.13-1.57.37-2.29L1.4 7.01C.51 8.81 0 10.82 0 12.91s.51 4.1 1.4 5.9l3.85-2.99z"
              />
              <path
                fill="#34A853"
                d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.65-2.83c-1.01.68-2.31 1.09-4.31 1.09-3.25 0-5.83-1.76-6.75-4.51L1.4 16.83C3.37 20.74 7.35 23 12 23z"
              />
            </svg>
            Registrarse con Google
          </button>
        </>
      )}

      <div className={styles.footer}>
        ¿Ya tienes cuenta? <Link href="/login">Inicia Sesión</Link>
      </div>
    </form>
  );
}
