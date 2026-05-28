"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import styles from "../auth.module.css";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError("Token de restablecimiento inválido o ausente.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fallo al restablecer contraseña.");

      setSuccess("¡Contraseña restablecida con éxito! Redirigiendo al inicio de sesión...");
      setTimeout(() => {
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Error al procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div style={{ textAlign: "center", padding: "1rem" }}>
        <div className={styles.errorBox} style={{ marginBottom: "1.5rem" }}>
          Token de restablecimiento ausente en la URL.
        </div>
        <Link href="/login" className="btn-primary" style={{ display: "inline-block", padding: "0.65rem 1.5rem", textDecoration: "none", borderRadius: "10px", color: "white" }}>
          Volver al inicio de sesión
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error && <div className={styles.errorBox} style={{ marginBottom: "1rem" }}>{error}</div>}
      {success && <div className={styles.successBox} style={{ marginBottom: "1rem" }}>{success}</div>}

      {!success && (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.group}>
            <label className={styles.label} htmlFor="password">Nueva Contraseña</label>
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
            <label className={styles.label} htmlFor="confirmPassword">Confirmar Nueva Contraseña</label>
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

          <button
            type="submit"
            disabled={loading}
            className={`${styles.submitBtn} btn-primary`}
          >
            {loading ? "Actualizando..." : "Restablecer Contraseña"}
          </button>
        </form>
      )}
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>⚽ AlbumHelper</div>
          <h1 className={styles.title}>Nueva Contraseña</h1>
          <p className={styles.subtitle}>
            Ingresa tu nueva contraseña para recuperar el acceso a tu cuenta.
          </p>
        </div>

        <Suspense fallback={<div style={{ textAlign: "center", color: "var(--text-secondary)" }}>Cargando...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </main>
  );
}
