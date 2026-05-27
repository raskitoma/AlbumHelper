import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import StickerAlbum from "@/components/StickerAlbum";

export const metadata = {
  title: "Álbum de Cromos - AlbumHelper",
  description: "Registra, filtra y revisa tu colección del Álbum Mundial de Fútbol 2026.",
};

export default async function AlbumPage() {
  // 1. Authenticate user
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  // 2. Query all items in catalog (ordered by code)
  const catalog = await prisma.stickerCatalog.findMany({
    select: {
      code: true,
      sectionCode: true,
      number: true,
      name: true,
      position: true,
      imageUrl: true,
      isSpecial: true
    },
    orderBy: [
      { sectionCode: "asc" },
      { number: "asc" }
    ]
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
        <StickerAlbum catalog={catalog} />
      </div>
    </DashboardLayout>
  );
}
