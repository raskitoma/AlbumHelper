import nodemailer from "nodemailer";
import { prisma } from "./db";

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

/**
 * Dynamically retrieves SMTP settings from the database and sends an email.
 * If SMTP is not fully configured, it falls back to printing the email to the console.
 */
export async function sendEmail({ to, subject, text, html }: SendEmailParams): Promise<boolean> {
  try {
    // Fetch SMTP settings
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

    const host = configMap["SMTP_HOST"];
    const port = configMap["SMTP_PORT"];
    const user = configMap["SMTP_USER"];
    const pass = configMap["SMTP_PASS"];
    const from = configMap["SMTP_FROM"] || "Figuritas <no-reply@figuritas.app>";

    const isFullyConfigured = host && port && user && pass;

    if (!isFullyConfigured) {
      console.log("\n==================================================");
      console.log("📨 fallback de correo electrónico (SMTP no configurado)");
      console.log(`Para: ${to}`);
      console.log(`Asunto: ${subject}`);
      console.log("--------------------------------------------------");
      console.log(`Texto:\n${text}`);
      console.log("==================================================\n");
      return true;
    }

    // Initialize nodemailer transport on-demand
    const transporter = nodemailer.createTransport({
      host,
      port: parseInt(port),
      secure: parseInt(port) === 465, // Use SSL for port 465
      auth: {
        user,
        pass
      }
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      text,
      html
    });

    console.log(`📧 Correo enviado exitosamente a ${to} (${subject})`);
    return true;
  } catch (error) {
    console.error("❌ Fallo al enviar correo electrónico:", error);
    // Even if it fails, log the content to stdout in dev environment
    console.log("\n======================== FALLBACK LOG ==================");
    console.log(`Para: ${to}`);
    console.log(`Asunto: ${subject}`);
    console.log(`Texto:\n${text}`);
    console.log("========================================================\n");
    return false;
  }
}
