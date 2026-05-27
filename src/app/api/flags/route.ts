import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { DEFAULT_FIFA_ISO_MAP } from "@/lib/flagUtils";

/**
 * Public endpoint (authenticated) that returns the resolved FIFA -> ISO map.
 * DB overrides take precedence over defaults from flagUtils.ts.
 */
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autenticado." }, { status: 401 });
    }

    // 1. Start with defaults
    const resolved: Record<string, string> = { ...DEFAULT_FIFA_ISO_MAP };

    // 2. Apply DB overrides
    const dbMappings = await prisma.fifaIsoMap.findMany();
    dbMappings.forEach((m) => {
      resolved[m.fifaCode] = m.isoCode;
    });

    return NextResponse.json(resolved);
  } catch (error: any) {
    console.error("GET /api/flags Error:", error);
    return NextResponse.json({ error: "Error al recuperar banderas." }, { status: 500 });
  }
}
