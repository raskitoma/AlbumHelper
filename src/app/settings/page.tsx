import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import DashboardLayout from "@/components/DashboardLayout";
import UserSettings from "@/components/UserSettings";

export const metadata = {
  title: "Ajustes de Usuario - AlbumHelper",
  description: "Administra tu grupo familiar, la seguridad 2FA y tus llaves biométricas (Passkeys).",
};

export default async function SettingsPage() {
  // 1. Authenticate user
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login");
  }

  // 2. Fetch full user data to verify 2FA enabled status
  const dbUser = await prisma.user.findUnique({
    where: { id: currentUser.id },
    include: {
      authenticators: {
        select: {
          id: true,
          credentialDeviceType: true,
          credentialBackedUp: true,
          name: true
        }
      }
    }
  });

  if (!dbUser) {
    redirect("/login");
  }

  const groupName = currentUser.familyGroupName || "Mi Álbum";
  const groupRole = currentUser.familyGroupRole || "PRINCIPAL";

  // Fetch the group invitation code from DB if group exists
  let inviteCode = "";
  if (currentUser.familyGroupId) {
    const group = await prisma.familyGroup.findUnique({
      where: { id: currentUser.familyGroupId },
      select: { inviteCode: true }
    });
    inviteCode = group?.inviteCode || "";
  }

  // Check if SMTP is configured
  const configs = await prisma.systemConfig.findMany({
    where: {
      key: {
        in: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS"]
      }
    }
  });

  const configMap: Record<string, string> = {};
  configs.forEach((c) => {
    configMap[c.key] = c.value;
  });

  const isMailConfigured = !!(
    configMap["SMTP_HOST"] &&
    configMap["SMTP_PORT"] &&
    configMap["SMTP_USER"] &&
    configMap["SMTP_PASS"]
  );

  return (
    <DashboardLayout
      userEmail={currentUser.email}
      groupName={groupName}
      userRole={currentUser.role}
      avatarType={dbUser.avatarType}
      avatarUrl={dbUser.avatarUrl}
    >
      <div style={{ padding: "1.5rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, marginBottom: "1rem" }}>Ajustes y Configuración</h1>
        <UserSettings
          userEmail={currentUser.email}
          initial2faEnabled={dbUser.twoFactorEnabled}
          initialGroupName={groupName}
          initialGroupInvite={inviteCode}
          initialGroupRole={groupRole}
          initialKeys={dbUser.authenticators}
          initialAvatarType={dbUser.avatarType}
          initialAvatarUrl={dbUser.avatarUrl}
          userRole={currentUser.role}
          isMailConfigured={isMailConfigured}
          initialGoogleEmail={dbUser.googleEmail || null}
        />
      </div>
    </DashboardLayout>
  );
}
