import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { codes } = await req.json();
    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json({ error: "No se proporcionaron códigos válidos." }, { status: 400 });
    }

    const emailSubject = "Códigos de recuperación 2FA - AlbumHelper";
    const text = `¡Hola!

Aquí están tus códigos de recuperación de 2FA para tu cuenta en AlbumHelper. Guarda estos códigos en un lugar seguro:

${codes.map((c, i) => `${i + 1}. ${c}`).join("\n")}

Cada código se puede usar solo una vez.`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; text-align: center;">🛡️ Códigos de Recuperación 2FA</h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">
          Guarda estos códigos de recuperación en un lugar seguro. Si pierdes el acceso a tu dispositivo 2FA, puedes usarlos para iniciar sesión.
        </p>
        <div style="margin: 20px 0; padding: 15px; background-color: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0;">
          <ul style="font-family: monospace; font-size: 16px; color: #0f172a; list-style: none; padding: 0; margin: 0;">
            ${codes.map(c => `<li style="padding: 6px 0; border-bottom: 1px solid #f1f5f9; letter-spacing: 1px;">👉 <strong>${c}</strong></li>`).join("")}
          </ul>
        </div>
        <p style="font-size: 13px; color: #64748b; font-style: italic;">
          Nota: Cada código de recuperación se puede usar solo una vez para iniciar sesión o desactivar la protección 2FA.
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #64748b; text-align: center;">
          Este es un correo automático. Por favor, no respondas.
        </p>
      </div>
    `;

    await sendEmail({
      to: currentUser.email,
      subject: emailSubject,
      text,
      html
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Send recovery codes error:", error);
    return NextResponse.json({ error: "Error al enviar los códigos por correo." }, { status: 500 });
  }
}
