import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateSecret, verifyTOTP, getOTPAuthURL } from "@/lib/totp";
import crypto from "crypto";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ action: string }> }
) {
  const { action } = await params;

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    // ----------------------------------------------------
    // ACTION 1: Generate 2FA Secret Key & URL
    // ----------------------------------------------------
    if (action === "generate") {
      const secret = generateSecret();
      const otpAuthUrl = getOTPAuthURL(currentUser.email, secret);

      return NextResponse.json({
        secret,
        otpAuthUrl
      });
    }

    // ----------------------------------------------------
    // ACTION 2: Verify TOTP Code and Enable 2FA
    // ----------------------------------------------------
    if (action === "verify") {
      const body = await req.json();
      const { secret, token } = body;

      if (!secret || !token) {
        return NextResponse.json({ error: "El secreto y el código de verificación son requeridos." }, { status: 400 });
      }

      // Verify the code
      const isValid = verifyTOTP(token, secret);
      if (!isValid) {
        return NextResponse.json({ error: "El código ingresado es incorrecto." }, { status: 400 });
      }

      // Generate 8 recovery codes (XXXX-XXXX)
      const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
      const codes = Array.from({ length: 8 }, () => {
        let code = "";
        for (let i = 0; i < 8; i++) {
          if (i === 4) code += "-";
          const idx = crypto.randomInt(0, chars.length);
          code += chars[idx];
        }
        return code;
      });

      // Hash with SHA-256
      const hashedCodes = codes.map((c) =>
        crypto.createHash("sha256").update(c).digest("hex")
      );

      // Save secret, enable 2FA, and store recovery codes in database
      await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          twoFactorSecret: secret,
          twoFactorEnabled: true,
          recoveryCodes: hashedCodes.join(",")
        }
      });

      return NextResponse.json({ success: true, recoveryCodes: codes });
    }

    // ----------------------------------------------------
    // ACTION 3: Disable 2FA
    // ----------------------------------------------------
    if (action === "disable") {
      await prisma.user.update({
        where: { id: currentUser.id },
        data: {
          twoFactorSecret: null,
          twoFactorEnabled: false,
          recoveryCodes: null
        }
      });

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Acción no encontrada." }, { status: 404 });
  } catch (error) {
    console.error("2FA Route Error:", error);
    return NextResponse.json({ error: "Fallo interno en la operación de 2FA." }, { status: 500 });
  }
}
