"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "../auth.module.css";
import AlbumLogo from "@/components/AlbumLogo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Fallo al enviar solicitud.");
      setMessage("¡Correo de restablecimiento enviado! Revisa tu bandeja de entrada.");
    } catch (err: any) {
      setError(err.message || "Error al procesar la solicitud.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <AlbumLogo />
            <span className={styles.logoText}>AlbumHelper</span>
          </div>
          <h1 className={styles.title}>Restablecer Contraseña</h1>
          <p className={styles.subtitle}>
            Ingresa tu correo electrónico para recibir un enlace seguro para redefinir tu contraseña.
          </p>
        </div>

        {error && <div className={styles.errorBox} style={{ marginBottom: "1rem" }}>{error}</div>}
        {message && <div className={styles.successBox} style={{ marginBottom: "1rem" }}>{message}</div>}

        {!message ? (
          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.group}>
              <label className={styles.label} htmlFor="email">Correo Electrónico</label>
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

            <button
              type="submit"
              disabled={loading}
              className={`${styles.submitBtn} btn-primary`}
            >
              {loading ? "Enviando..." : "Enviar Enlace"}
            </button>

            <div className={styles.footer} style={{ marginTop: "1rem" }}>
              <Link href="/login">Volver al inicio de sesión</Link>
            </div>
          </form>
        ) : (
          <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
            <Link href="/login" className="btn-primary" style={{ display: "inline-block", padding: "0.65rem 1.5rem", textDecoration: "none", borderRadius: "10px", color: "white" }}>
              Volver al inicio de sesión
            </Link>
          </div>
        )}
      </div>
      <footer className={styles.authCopyright}>
        &copy; {new Date().getFullYear()}{" "}
        <a href="https://raskitoma.io" target="_blank" rel="noopener noreferrer">
          Raskitoma.io
        </a>
      </footer>
    </main>
  );
}
