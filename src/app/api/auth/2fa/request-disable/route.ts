import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "El correo electrónico y la contraseña son requeridos." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 1. Fetch user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user || !user.passwordHash) {
      return NextResponse.json({ error: "Credenciales incorrectas." }, { status: 401 });
    }

    // 2. Verify password
    const isPasswordValid = verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json({ error: "Credenciales incorrectas." }, { status: 401 });
    }

    // 3. Verify user actually has 2FA enabled
    if (!user.twoFactorEnabled) {
      return NextResponse.json({ error: "La verificación de dos factores no está activa para este usuario." }, { status: 400 });
    }

    // 4. Clean up old tokens of same type/email
    await prisma.verificationToken.deleteMany({
      where: { email: normalizedEmail, type: "DISABLE_2FA" }
    });

    // 5. Create verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.verificationToken.create({
      data: {
        token,
        email: normalizedEmail,
        type: "DISABLE_2FA",
        expiresAt
      }
    });

    // 6. Send disable email
    const origin = new URL(req.url).origin;
    const disableLink = `${origin}/api/auth/2fa/disable-email?token=${token}`;

    const subject = "Desactivar Verificación de Dos Factores (2FA) - AlbumHelper";
    const text = `¡Hola!

Recibimos una solicitud para desactivar la verificación de dos factores (2FA) de tu cuenta en AlbumHelper.

Haz clic en el siguiente enlace para confirmar la desactivación (válido por 1 hora):
${disableLink}

Si no realizaste esta solicitud, puedes ignorar este correo.`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; text-align: center;">🛡️ Desactivar 2FA</h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">
          Recibimos una solicitud para desactivar la verificación de dos factores (2FA) de tu cuenta en <strong>AlbumHelper</strong>.
        </p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${disableLink}" style="display: inline-block; background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Desactivar 2FA</a>
        </p>
        <p style="color: #64748b; font-size: 14px;">
          Este enlace es válido por 1 hora. Si el botón no funciona, copia y pega esta URL en tu navegador:
          <br/>
          <a href="${disableLink}">${disableLink}</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #64748b; text-align: center;">
          Si no esperabas esta solicitud, puedes ignorar este correo de forma segura.
        </p>
      </div>
    `;

    await sendEmail({
      to: normalizedEmail,
      subject,
      text,
      html
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Request 2FA disable error:", error);
    return NextResponse.json({ error: "Error interno al procesar solicitud." }, { status: 500 });
  }
}
