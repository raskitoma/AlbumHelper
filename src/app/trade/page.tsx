import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import TradeMatcher from "@/components/TradeMatcher";

export const metadata = {
  title: "Intercambio y Match QR - AlbumHelper",
  description: "Intercambia cromos repetidos usando códigos QR y compara faltantes instantáneamente.",
};

export default async function TradePage() {
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
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1rem" }}>Intercambiar Cromos</h1>
        <TradeMatcher catalog={catalog} userEmail={currentUser.email} />
      </div>
    </DashboardLayout>
  );
}
