import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import PackOpener from "@/components/PackOpener";

export const metadata = {
  title: "Simulador de Sobres - AlbumHelper",
  description: "Abre sobres virtuales de cromos y completa tu álbum del Mundial 2026.",
};

export default async function PacksPage() {
  // 1. Authenticate user
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  // 2. Query all items in catalog to pass as reference
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
        <PackOpener catalog={catalog} />
      </div>
    </DashboardLayout>
  );
}
