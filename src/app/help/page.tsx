import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import DashboardLayout from "@/components/DashboardLayout";
import HelpGuide from "@/components/HelpGuide";

export const metadata = {
  title: "Guía de Ayuda - AlbumHelper",
  description: "Aprende a coleccionar cromos, gestionar repetidos y coordinar intercambios.",
};

export default async function HelpPage() {
  // 1. Authenticate user session
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

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
        <HelpGuide />
      </div>
    </DashboardLayout>
  );
}
