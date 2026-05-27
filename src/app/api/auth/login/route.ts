import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
import { verifyTOTP } from "@/lib/totp";

export async function POST(req: Request) {
  try {
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      return NextResponse.json(
        { error: "Por favor, inicializa el sistema primero en la ruta /setup" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, password, code2FA } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "El correo electrónico y la contraseña son requeridos." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Fetch user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json(
        { error: "Credenciales de inicio de sesión inválidas." },
        { status: 401 }
      );
    }

    // 2. Verify password
    const isPasswordValid = verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Credenciales de inicio de sesión inválidas." },
        { status: 401 }
      );
    }

    // 3. Handle Two-Factor Authentication (2FA) if enabled
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      if (!code2FA) {
        // Return instructions indicating 2FA verification is required
        return NextResponse.json({
          requires2FA: true,
          email: user.email
        });
      }

      // Verify the 6-digit TOTP code
      const is2FAValid = verifyTOTP(code2FA, user.twoFactorSecret);
      if (!is2FAValid) {
        return NextResponse.json(
          { error: "El código de verificación de 2FA es incorrecto." },
          { status: 401 }
        );
      }
    }

    // 4. Create session and set cookie
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, role: user.role }
    });
  } catch (error: any) {
    console.error("Login API Error:", error);
    return NextResponse.json(
      { error: "Fallo interno durante el inicio de sesión." },
      { status: 500 }
    );
  }
}
