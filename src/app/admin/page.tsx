import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminPanel from "./AdminPanel";
import Link from "next/link";
import styles from "./admin.module.css";

export const metadata = {
  title: "Panel de Administración - AlbumHelper",
  description: "Configura el inicio de sesión con Google, el servidor de correos SMTP y administra usuarios.",
};

export default async function AdminPage() {
  // 1. Authenticate user
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  // 2. Authorization check (only ADMIN role)
  if (currentUser.role !== "ADMIN") {
    redirect("/album");
  }

  return (
    <main className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Panel de Administración</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.25rem" }}>
            Ajustes globales del sistema, integraciones de autenticación y gestión de usuarios.
          </p>
        </div>
        <Link href="/album" className="btn-secondary">
          ⚽ Volver al Álbum
        </Link>
      </div>

      <AdminPanel />
    </main>
  );
}
