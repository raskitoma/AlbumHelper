import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const CONFIG_KEYS = [
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM"
];

const SECRET_KEYS = ["GOOGLE_CLIENT_SECRET", "SMTP_PASS"];

export async function GET(req: Request) {
  try {
    // 1. Authenticate and check Admin role
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado (Requiere administrador)." }, { status: 403 });
    }

    // 2. Fetch configurations from DB
    const configs = await prisma.systemConfig.findMany({
      where: { key: { in: CONFIG_KEYS } }
    });

    const configMap: Record<string, string> = {};
    CONFIG_KEYS.forEach((k) => {
      configMap[k] = ""; // Default empty
    });

    configs.forEach((c) => {
      // Mask secret keys in response
      if (SECRET_KEYS.includes(c.key) && c.value) {
        configMap[c.key] = "••••••••";
      } else {
        configMap[c.key] = c.value;
      }
    });

    return NextResponse.json(configMap);
  } catch (error) {
    console.error("Admin GET Config Error:", error);
    return NextResponse.json({ error: "Error al recuperar la configuración." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate and check Admin role
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado (Requiere administrador)." }, { status: 403 });
    }

    const body = await req.json();

    // 2. Save configurations in transaction
    await prisma.$transaction(
      Object.keys(body).map((key) => {
        if (!CONFIG_KEYS.includes(key)) {
          throw new Error(`Clave de configuración inválida: ${key}`);
        }

        const value = body[key];

        // Skip saving if secret was not modified (remained masked)
        if (SECRET_KEYS.includes(key) && value === "••••••••") {
          // No-op query to satisfy transaction array type
          return prisma.systemConfig.findUnique({ where: { key } });
        }

        return prisma.systemConfig.upsert({
          where: { key },
          update: { value: value.trim() },
          create: { key, value: value.trim() }
        });
      })
    );

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin POST Config Error:", error);
    return NextResponse.json({ error: error.message || "Error al actualizar la configuración." }, { status: 500 });
  }
}
