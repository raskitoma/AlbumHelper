import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || !email.trim()) {
      return NextResponse.json({ error: "El correo electrónico es requerido." }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      // For security, don't reveal if user exists or not, but return success
      return NextResponse.json({ success: true, message: "Si el correo está registrado, se enviará una instrucción de restablecimiento." });
    }

    // Delete existing tokens of same type/email to avoid bloat
    await prisma.verificationToken.deleteMany({
      where: { email: normalizedEmail, type: "PASSWORD_RESET" }
    });

    // Create verification token
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.verificationToken.create({
      data: {
        token,
        email: normalizedEmail,
        type: "PASSWORD_RESET",
        expiresAt
      }
    });

    // Send reset email
    const origin = new URL(req.url).origin;
    const resetLink = `${origin}/reset-password?token=${token}`;

    const subject = "Restablece tu contraseña - AlbumHelper";
    const text = `¡Hola!

Recibimos una solicitud para restablecer la contraseña de tu cuenta en AlbumHelper.

Haz clic en el siguiente enlace para establecer una nueva contraseña (válido por 1 hora):
${resetLink}

Si no realizaste esta solicitud, puedes ignorar este correo de forma segura.`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; text-align: center;">🔑 Restablecer Contraseña</h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">
          Recibimos una solicitud para restablecer la contraseña de tu cuenta en <strong>AlbumHelper</strong>.
        </p>
        <p style="text-align: center; margin: 30px 0;">
          <a href="${resetLink}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Restablecer Contraseña</a>
        </p>
        <p style="color: #64748b; font-size: 14px;">
          Este enlace es válido por 1 hora. Si el botón no funciona, puedes copiar y pegar la siguiente URL en tu navegador:
          <br/>
          <a href="${resetLink}">${resetLink}</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #64748b; text-align: center;">
          Si no esperabas esta solicitud, puedes ignorar este correo.
        </p>
      </div>
    `;

    await sendEmail({
      to: normalizedEmail,
      subject,
      text,
      html
    });

    return NextResponse.json({ success: true, message: "Si el correo está registrado, se enviará una instrucción de restablecimiento." });
  } catch (error: any) {
    console.error("Forgot password route error:", error);
    return NextResponse.json({ error: "Error interno al procesar solicitud." }, { status: 500 });
  }
}
