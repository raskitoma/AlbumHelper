"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { startAuthentication } from "@simplewebauthn/browser";
import styles from "../auth.module.css";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code2FA, setCode2FA] = useState("");
  const [step, setStep] = useState<"credentials" | "totp">("credentials");
  const [oauthEnabled, setOauthEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Check if Google OAuth is configured on mount
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

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email || !password) {
      setError("Por favor, ingresa tu correo y contraseña.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fallo en el inicio de sesión.");
      }

      if (data.requires2FA) {
        // Switch to the TOTP 2FA step
        setStep("totp");
      } else {
        setSuccess("¡Sesión iniciada con éxito! Redirigiendo...");
        setTimeout(() => {
          router.push("/album");
          router.refresh();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || "Fallo al autenticar.");
    } finally {
      setLoading(false);
    }
  };

  const handle2FASubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!code2FA || code2FA.length !== 6) {
      setError("Por favor, ingresa el código de 6 dígitos.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, code2FA })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Fallo al verificar el código 2FA.");
      }

      setSuccess("¡Verificación exitosa! Redirigiendo...");
      setTimeout(() => {
        router.push("/album");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Código 2FA incorrecto.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Redirect browser to our Google OAuth initiate endpoint
    window.location.href = "/api/auth/google/login";
  };

  const handlePasskeyLogin = async () => {
    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // 1. Request authentication options from the server
      const optionsRes = await fetch("/api/auth/passkey/generate-assertion-options", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() || undefined }) // Optional email (passwordless autofill support)
      });

      const optionsData = await optionsRes.json();
      if (!optionsRes.ok) {
        throw new Error(optionsData.error || "No se pudieron obtener las opciones de Passkey.");
      }

      // 2. Prompt client authenticator
      const assertionResponse = await startAuthentication({
        optionsJSON: optionsData
      });

      // 3. Verify assertion signature on the server
      const verifyRes = await fetch("/api/auth/passkey/verify-assertion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || undefined,
          assertion: assertionResponse
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        throw new Error(verifyData.error || "La firma de la Passkey no pudo ser verificada.");
      }

      setSuccess("¡Llave de paso verificada! Redirigiendo...");
      setTimeout(() => {
        router.push("/album");
        router.refresh();
      }, 1500);
    } catch (err: any) {
      setError(err.message || "Fallo al autenticar con la Llave de Paso.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {error && <div className={styles.errorBox} style={{ marginBottom: "1rem" }}>{error}</div>}
      {success && <div className={styles.successBox} style={{ marginBottom: "1rem" }}>{success}</div>}

      {step === "credentials" ? (
        <form onSubmit={handleCredentialsSubmit} className={styles.form}>
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

          <div className={styles.group}>
            <label className={styles.label} htmlFor="password">Contraseña</label>
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

          <button
            type="submit"
            disabled={loading}
            className={`${styles.submitBtn} btn-primary`}
          >
            {loading ? "Iniciando..." : "Iniciar Sesión"}
          </button>

          <div className={styles.divider}>Opciones Biométricas / Seguras</div>

          <button
            type="button"
            onClick={handlePasskeyLogin}
            disabled={loading}
            className={styles.passkeyBtn}
          >
            🔑 Entrar con Llave de Paso
          </button>

          {oauthEnabled && (
            <>
              <div className={styles.divider}>o entra con</div>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={loading}
                className={styles.googleBtn}
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
                Iniciar Sesión con Google
              </button>
            </>
          )}

          <div className={styles.footer}>
            ¿No tienes cuenta? <Link href={searchParams.get("invite") || searchParams.get("code") ? `/register?invite=${searchParams.get("invite") || searchParams.get("code")}` : "/register"}>Regístrate</Link>
          </div>
        </form>
      ) : (
        <form onSubmit={handle2FASubmit} className={styles.form}>
          <div className={styles.header} style={{ marginBottom: "1.25rem" }}>
            <h2 className={styles.title} style={{ fontSize: "1.25rem" }}>Verificación de Dos Factores</h2>
            <p className={styles.subtitle} style={{ fontSize: "0.85rem" }}>
              Ingresa el código temporal de 6 dígitos generado por tu aplicación de autenticación para {email}.
            </p>
          </div>

          <div className={styles.group}>
            <label className={styles.label} htmlFor="code2FA">Código de 6 dígitos</label>
            <input
              id="code2FA"
              type="text"
              pattern="[0-9]{6}"
              value={code2FA}
              onChange={(e) => setCode2FA(e.target.value.replace(/[^0-9]/g, ""))}
              className={styles.input}
              placeholder="000000"
              maxLength={6}
              required
              disabled={loading}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`${styles.submitBtn} btn-primary`}
          >
            {loading ? "Verificando..." : "Verificar y Entrar"}
          </button>

          <button
            type="button"
            onClick={() => {
              setStep("credentials");
              setError(null);
            }}
            disabled={loading}
            className="btn-secondary"
            style={{ width: "100%" }}
          >
            Volver
          </button>
        </form>
      )}
    </div>
  );
}
