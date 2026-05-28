import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import RegisterForm from "./RegisterForm";
import styles from "../auth.module.css";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Registro - AlbumHelper",
  description: "Crea tu cuenta para comenzar a trackear tus cromos del Mundial de Fútbol 2026.",
};

export default async function RegisterPage() {
  // 1. Guardrail: If no users exist, redirect to setup
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    redirect("/setup");
  }

  // 2. Check if already logged in
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect("/album");
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>⚽ AlbumHelper</div>
          <h1 className={styles.title}>Crear Cuenta</h1>
          <p className={styles.subtitle}>
            Regístrate con tu correo para empezar a registrar y compartir tus cromos del Mundial Fifa 2026.
          </p>
        </div>
        <Suspense fallback={<div className={styles.loading}>Cargando formulario...</div>}>
          <RegisterForm />
        </Suspense>
      </div>
    </main>
  );
}
