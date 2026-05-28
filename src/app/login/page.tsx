import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import LoginForm from "./LoginForm";
import styles from "../auth.module.css";
import { Suspense } from "react";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Iniciar Sesión - AlbumHelper",
  description: "Accede a tu cuenta de AlbumHelper para ver tu colección del álbum del Mundial de Fútbol.",
};

export default async function LoginPage() {
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
          <h1 className={styles.title}>Iniciar Sesión</h1>
          <p className={styles.subtitle}>
            Ingresa tus credenciales o utiliza tus datos biométricos para acceder a tu álbum de cromos.
          </p>
        </div>
        <Suspense fallback={<div className={styles.loading}>Cargando formulario...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </main>
  );
}
