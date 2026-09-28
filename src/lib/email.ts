import nodemailer from "nodemailer";
import { prisma } from "./db";

interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Never log message bodies: they carry password-reset / 2FA-disable links,
// 2FA recovery codes and invite codes. Log only a masked recipient.

// Strip control characters (CR/LF, ANSI escapes) from user-influenced text
// (the invite subject embeds the group name) and cap its length, so a value
// cannot forge or garble log lines.
function clean(value: unknown, max = 120): string {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f-\u009f]/g, " ").slice(0, max);
}

function maskRecipient(to: string): string {
  const addr = String(to ?? "").trim();
  const at = addr.lastIndexOf("@");
  if (at < 1) return "<invalid>";
  return clean(`${addr[0]}***@${addr.slice(at + 1)}`, 80);
}

// Error class + SMTP code + a scrubbed, truncated message. Never the whole
// error object (nodemailer attaches the server response / envelope to it).
function describeError(error: unknown): string {
  const e = (error ?? {}) as { name?: string; code?: string; responseCode?: number; message?: string };
  const tag = [e.name || "Error", e.code, e.responseCode].filter(Boolean).join(" ");
  const msg = String(e.message ?? error ?? "")
    .replace(/https?:\/\/\S+/gi, "<url>")
    .replace(/[^\s<>"'(),;:]+@([^\s<>"'(),;:]+)/g, "***@$1");
  return `${clean(tag, 60)}: ${clean(msg, 200)}`;
}

/**
 * Dynamically retrieves SMTP settings from the database and sends an email.
 * If SMTP is not fully configured, nothing is sent and false is returned.
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
      console.warn(`⚠️ SMTP no configurado: correo NO enviado a ${maskRecipient(to)} (${clean(subject)})`);
      return false;
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

    console.log(`📧 Correo enviado a ${maskRecipient(to)} (${clean(subject)})`);
    return true;
  } catch (error) {
    console.error(`❌ Fallo al enviar correo a ${maskRecipient(to)} (${clean(subject)}): ${describeError(error)}`);
    return false;
  }
}
