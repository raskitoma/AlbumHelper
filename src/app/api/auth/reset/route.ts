import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const { token, newPassword } = await req.json();

    if (!token) {
      return NextResponse.json({ error: "El token es requerido." }, { status: 400 });
    }
    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: "La contraseña debe tener al menos 6 caracteres." }, { status: 400 });
    }

    // Find verification token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token }
    });

    if (!verificationToken || verificationToken.type !== "PASSWORD_RESET") {
      return NextResponse.json({ error: "El token es inválido o no existe." }, { status: 400 });
    }

    // Check expiration
    if (new Date() > verificationToken.expiresAt) {
      // Clean up expired token
      await prisma.verificationToken.delete({ where: { token } });
      return NextResponse.json({ error: "El token ha expirado." }, { status: 400 });
    }

    // Hash new password
    const passwordHash = hashPassword(newPassword);

    // Update user
    await prisma.user.update({
      where: { email: verificationToken.email },
      data: { passwordHash }
    });

    // Delete used token
    await prisma.verificationToken.delete({ where: { token } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Reset password route error:", error);
    return NextResponse.json({ error: "Error interno al restablecer la contraseña." }, { status: 500 });
  }
}
