"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../auth.module.css";

export default function SetupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Simple client side validation
    if (!email || !password || !confirmPassword) {
      setError("Por favor, completa todos los campos requeridos.");
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
      const response = await fetch("/api/setup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, groupName })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Algo salió mal.");
      }

      setSuccess("¡Administrador creado con éxito! Redirigiendo...");
      
      // Delay redirection slightly so the user sees the success state
      setTimeout(() => {
        router.push("/admin");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Fallo en la comunicación con el servidor.");
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
          placeholder="admin@correo.com"
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

      <div className={styles.group}>
        <label className={styles.label} htmlFor="groupName">Nombre de tu Grupo Familiar (Opcional)</label>
        <input
          id="groupName"
          type="text"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className={styles.input}
          placeholder="Ej: Familia Gómez"
          disabled={loading}
        />
        <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.2rem" }}>
          Crea automáticamente tu primer álbum compartido.
        </span>
      </div>

      <button
        type="submit"
        disabled={loading}
        className={`${styles.submitBtn} btn-primary`}
      >
        {loading ? "Creando..." : "Crear Administrador"}
      </button>
    </form>
  );
}
