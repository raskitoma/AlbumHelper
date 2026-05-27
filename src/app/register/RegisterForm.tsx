"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import styles from "../auth.module.css";

export default function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

      <div className={styles.footer}>
        ¿Ya tienes cuenta? <Link href="/login">Inicia Sesión</Link>
      </div>
    </form>
  );
}
