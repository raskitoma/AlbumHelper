import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import SetupForm from "./SetupForm";
import styles from "../auth.module.css";

export const metadata = {
  title: "Inicializar Sistema - AlbumHelper",
  description: "Crea la cuenta de administrador principal para tu tracker de cromos del Mundial.",
};

export default async function SetupPage() {
  // Query DB to see if any user exists
  const userCount = await prisma.user.count();

  // If at least one user exists, setup is forbidden. Redirect to login.
  if (userCount > 0) {
    redirect("/login");
  }

  return (
    <main className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>⚽ AlbumHelper</div>
          <h1 className={styles.title}>Inicializar Tracker</h1>
          <p className={styles.subtitle}>
            Crea la cuenta del administrador principal del sistema para configurar las opciones de álbum, OAuth y SMTP.
          </p>
        </div>
        <SetupForm />
      </div>
    </main>
  );
}
