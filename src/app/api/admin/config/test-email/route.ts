import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import nodemailer from "nodemailer";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "No autorizado. Requiere administrador." }, { status: 401 });
    }

    const body = await req.json();
    let { smtpHost, smtpPort, smtpUser, smtpPass, smtpFrom, testRecipient } = body;

    // Fetch config from DB for fallbacks
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: {
          in: ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "SMTP_FROM"]
        }
      }
    });

    const configMap: Record<string, string> = {};
    configs.forEach((c) => {
      configMap[c.key] = c.value;
    });

    // Check overrides or DB
    const host = smtpHost !== undefined && smtpHost !== "" ? smtpHost : configMap["SMTP_HOST"];
    const port = smtpPort !== undefined && smtpPort !== "" ? smtpPort : configMap["SMTP_PORT"];
    const user = smtpUser !== undefined && smtpUser !== "" ? (smtpUser === "••••••••" ? configMap["SMTP_USER"] : smtpUser) : configMap["SMTP_USER"];
    const pass = smtpPass !== undefined && smtpPass !== "" ? (smtpPass === "••••••••" ? configMap["SMTP_PASS"] : smtpPass) : configMap["SMTP_PASS"];
    const from = smtpFrom !== undefined && smtpFrom !== "" ? smtpFrom : configMap["SMTP_FROM"] || "Figuritas <no-reply@figuritas.app>";
    const recipient = testRecipient || currentUser.email;

    const isFullyConfigured = host && port && user && pass;
    if (!isFullyConfigured) {
      return NextResponse.json({ error: "La configuración de correo SMTP no está completa." }, { status: 400 });
    }

    // Try sending email
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: parseInt(port) === 465,
      auth: {
        user,
        pass
      }
    });

    await transporter.sendMail({
      from,
      to: recipient,
      subject: "Correo de prueba de AlbumHelper",
      text: "¡Hola! Este es un correo de prueba enviado desde AlbumHelper para verificar tu configuración SMTP.",
      html: "<p>¡Hola! Este es un correo de prueba enviado desde <strong>AlbumHelper</strong> para verificar tu configuración SMTP.</p>"
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Test email error:", error);
    return NextResponse.json({ error: error.message || "Fallo al enviar correo de prueba." }, { status: 500 });
  }
}
