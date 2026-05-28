import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword, createSessionToken, setSessionCookie, hasValidTrustedDeviceCookie, createTrustedDeviceCookie } from "@/lib/auth";
import { verifyTOTP } from "@/lib/totp";
import crypto from "crypto";

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
    const { email, password, code2FA, trustDevice } = body;

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
      // Check if this device is trusted (by checking the trusted device cookie)
      const isDeviceTrusted = await hasValidTrustedDeviceCookie(user.id);
      
      if (!isDeviceTrusted) {
        if (!code2FA) {
          // Return instructions indicating 2FA verification is required
          return NextResponse.json({
            requires2FA: true,
            email: user.email
          });
        }

        // Check if it is a recovery code (format: XXXX-XXXX, 9 chars long)
        const isRecoveryCode = code2FA.length === 9 && code2FA.includes("-");
        
        if (isRecoveryCode) {
          // Verify recovery code
          const normalizedCode = code2FA.toUpperCase().trim();
          const hashedEntered = crypto.createHash("sha256").update(normalizedCode).digest("hex");
          
          const currentHashes = user.recoveryCodes ? user.recoveryCodes.split(",") : [];
          const codeIndex = currentHashes.indexOf(hashedEntered);
          
          if (codeIndex === -1) {
            return NextResponse.json(
              { error: "El código de recuperación es incorrecto o ya fue utilizado." },
              { status: 401 }
            );
          }

          // Remove the used code
          const updatedHashes = currentHashes.filter((_, idx) => idx !== codeIndex);
          await prisma.user.update({
            where: { id: user.id },
            data: {
              recoveryCodes: updatedHashes.length > 0 ? updatedHashes.join(",") : null
            }
          });

          // Set trusted device cookie if requested
          if (trustDevice) {
            await createTrustedDeviceCookie(user.id);
          }
        } else {
          // Verify standard 6-digit TOTP code
          const is2FAValid = verifyTOTP(code2FA, user.twoFactorSecret);
          if (!is2FAValid) {
            return NextResponse.json(
              { error: "El código de verificación de 2FA es incorrecto." },
              { status: 401 }
            );
          }

          // Set trusted device cookie if requested
          if (trustDevice) {
            await createTrustedDeviceCookie(user.id);
          }
        }
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
