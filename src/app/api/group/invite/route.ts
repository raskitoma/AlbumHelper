import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { email, inviteCode } = body;

    if (!email || !email.trim()) {
      return NextResponse.json({ error: "El correo electrónico es requerido." }, { status: 400 });
    }
    if (!inviteCode || !inviteCode.trim()) {
      return NextResponse.json({ error: "El código de invitación es requerido." }, { status: 400 });
    }

    // Verify current user belongs to this group
    const membership = await prisma.familyGroupMember.findFirst({
      where: {
        userId: currentUser.id,
        familyGroup: {
          inviteCode: inviteCode.trim().toUpperCase()
        }
      },
      include: {
        familyGroup: true
      }
    });

    if (!membership) {
      return NextResponse.json({ error: "No tienes permiso para enviar invitaciones para este grupo." }, { status: 403 });
    }

    const actualGroupName = membership.familyGroup.name;

    // Send invitation email
    const subject = `Invitación para unirte al grupo "${actualGroupName}" en AlbumHelper`;
    const inviteLink = `${new URL(req.url).origin}/login?invite=${inviteCode}`;
    const text = `¡Hola!

Te han invitado a unirte al grupo familiar "${actualGroupName}" en AlbumHelper.

Usa el código de invitación a continuación para unirte:
👉 ${inviteCode}

O haz clic en el siguiente enlace para registrarte o iniciar sesión y unirte automáticamente:
${inviteLink}

¡Esperamos verte pronto!`;

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #0f172a; text-align: center;">⚽ Invitación de AlbumHelper</h2>
        <p style="color: #334155; font-size: 16px; line-height: 1.5;">
          Te han invitado a unirte al grupo familiar <strong>"${actualGroupName}"</strong> para coleccionar e intercambiar cromos del Mundial juntos en tiempo real.
        </p>
        <div style="text-align: center; margin: 30px 0; padding: 15px; background-color: #f8fafc; border-radius: 6px; border: 1px dashed #cbd5e1;">
          <span style="display: block; font-size: 14px; color: #64748b; font-weight: 600; text-transform: uppercase;">Código de Invitación</span>
          <strong style="font-size: 28px; color: #0f172a; letter-spacing: 2px;">${inviteCode}</strong>
        </div>
        <p style="text-align: center;">
          <a href="${inviteLink}" style="display: inline-block; background-color: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">Unirse al Grupo</a>
        </p>
        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 30px 0;" />
        <p style="font-size: 12px; color: #64748b; text-align: center;">
          Si no esperabas esta invitación, puedes ignorar este correo.
        </p>
      </div>
    `;

    const sent = await sendEmail({
      to: email.trim(),
      subject,
      text,
      html
    });

    if (!sent) {
      return NextResponse.json({ error: "No se pudo enviar el correo de invitación. Verifica la configuración SMTP." }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Invite API Error:", error);
    return NextResponse.json({ error: "Error interno al enviar la invitación." }, { status: 500 });
  }
}
