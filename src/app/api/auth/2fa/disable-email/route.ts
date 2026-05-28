import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const origin = new URL(req.url).origin;

  if (!token) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Token no proporcionado.")}`);
  }

  try {
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token }
    });

    if (!verificationToken || verificationToken.type !== "DISABLE_2FA") {
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("El token es inválido o no existe.")}`);
    }

    if (new Date() > verificationToken.expiresAt) {
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("El token ha expirado.")}`);
    }

    // Disable 2FA on the user
    await prisma.user.update({
      where: { email: verificationToken.email },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
        recoveryCodes: null
      }
    });

    // Delete token
    await prisma.verificationToken.delete({ where: { token } });

    // Redirect to login page with success code
    return NextResponse.redirect(`${origin}/login?success=2fa_disabled_email`);
  } catch (error) {
    console.error("Disable 2FA email route error:", error);
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Error interno al procesar la solicitud.")}`);
  }
}
