import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardStats from "@/components/DashboardStats";

export const metadata = {
  title: "Estadísticas del Álbum - AlbumHelper",
  description: "Visualiza el progreso de completitud, repetidos y actividad grupal de tu álbum.",
};

export default async function StatsPage() {
  // 1. Authenticate user
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  // 2. Query catalog details to resolve breakdowns
  const catalog = await prisma.stickerCatalog.findMany({
    select: {
      code: true,
      sectionCode: true,
      number: true,
      name: true,
      position: true,
      imageUrl: true,
      isSpecial: true
    }
  });

  const groupName = currentUser.familyGroupName || "Mi Álbum";

  return (
    <DashboardLayout
      userEmail={currentUser.email}
      groupName={groupName}
      userRole={currentUser.role}
      avatarType={currentUser.avatarType}
      avatarUrl={currentUser.avatarUrl}
    >
      <div style={{ padding: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1rem" }}>Resumen del Álbum</h1>
        <DashboardStats catalog={catalog} />
      </div>
    </DashboardLayout>
  );
}
