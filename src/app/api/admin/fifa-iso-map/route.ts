import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { SECTIONS } from "@/lib/albumData";
import { DEFAULT_FIFA_ISO_MAP } from "@/lib/flagUtils";

export async function GET(req: Request) {
  try {
    // 1. Authenticate and check Admin role
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado (Requiere administrador)." }, { status: 403 });
    }

    // 2. Fetch all mappings from DB
    const dbMappings = await prisma.fifaIsoMap.findMany();
    const dbMap: Record<string, string> = {};
    dbMappings.forEach((m) => {
      dbMap[m.fifaCode] = m.isoCode;
    });

    // 3. Assemble full list for only team/promo/special sections
    const items = SECTIONS.map((section) => {
      const dbValue = dbMap[section.code];
      const hasDbValue = dbValue !== undefined;
      const defaultVal = DEFAULT_FIFA_ISO_MAP[section.code] || "";
      const currentIso = hasDbValue ? dbValue : defaultVal;

      return {
        fifaCode: section.code,
        countryName: section.name,
        defaultIso: defaultVal,
        isoCode: currentIso,
        isCustom: hasDbValue,
        type: section.type,
      };
    });

    return NextResponse.json(items);
  } catch (error: any) {
    console.error("GET FIFA-ISO Map Error:", error);
    return NextResponse.json({ error: "Error al recuperar mapeo de banderas." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    // 1. Authenticate and check Admin role
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado (Requiere administrador)." }, { status: 403 });
    }

    const { mappings } = await req.json(); // expected Format: { mappings: { "GER": "de", "USA": "us" } }
    if (!mappings || typeof mappings !== "object") {
      return NextResponse.json({ error: "Datos de mapeo no válidos." }, { status: 400 });
    }

    // 2. Upsert each mapping in transaction
    const upserts = Object.keys(mappings).map((fifaCode) => {
      const isoCode = (mappings[fifaCode] || "").trim().toLowerCase();
      
      // If empty string, we can delete the database override to revert to default
      if (!isoCode) {
        return prisma.fifaIsoMap.deleteMany({
          where: { fifaCode }
        });
      }

      return prisma.fifaIsoMap.upsert({
        where: { fifaCode },
        update: { isoCode },
        create: { fifaCode, isoCode },
      });
    });

    await prisma.$transaction(upserts);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("POST FIFA-ISO Map Error:", error);
    return NextResponse.json({ error: "Error al guardar el mapeo de banderas." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    // 1. Authenticate and check Admin role
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado (Requiere administrador)." }, { status: 403 });
    }

    // 2. Clear all DB custom mappings (reverting to DEFAULT_FIFA_ISO_MAP)
    await prisma.fifaIsoMap.deleteMany();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE FIFA-ISO Map Error:", error);
    return NextResponse.json({ error: "Error al reiniciar el mapeo de banderas." }, { status: 500 });
  }
}
