import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const section = searchParams.get("section") || "ALL";
    const query = searchParams.get("query") || "";
    const onlyMissing = searchParams.get("onlyMissing") === "true";

    const where: any = {};
    if (section !== "ALL") {
      where.sectionCode = section;
    }
    if (query.trim() !== "") {
      where.OR = [
        { code: { contains: query } },
        { name: { contains: query } }
      ];
    }
    if (onlyMissing) {
      where.OR = [
        { imageUrl: null },
        { imageUrl: "" }
      ];
    }

    const stickers = await prisma.stickerCatalog.findMany({
      where,
      orderBy: [
        { sectionCode: "asc" },
        { number: "asc" }
      ],
      take: 1000 // increased from 150 to allow bulk operations on the whole catalog
    });

    return NextResponse.json(stickers);
  } catch (error) {
    console.error("Admin GET Stickers Catalog Error:", error);
    return NextResponse.json({ error: "Fallo al recuperar catálogo de cromos." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
    }

    const body = await req.json();
    const { code, imageUrl } = body;

    if (!code) {
      return NextResponse.json({ error: "Código de cromo es requerido." }, { status: 400 });
    }

    const updated = await prisma.stickerCatalog.update({
      where: { code },
      data: { imageUrl: imageUrl || null }
    });

    // Invalidate local image proxy cache
    try {
      const cacheDir = path.join(process.cwd(), "prisma", "images_cache");
      if (fs.existsSync(cacheDir)) {
        const files = fs.readdirSync(cacheDir);
        const cachedFile = files.find(f => path.parse(f).name === code);
        if (cachedFile) {
          fs.unlinkSync(path.join(cacheDir, cachedFile));
        }
      }
    } catch (e) {
      console.error("Failed to invalidate image cache for code", code, e);
    }

    return NextResponse.json({ success: true, sticker: updated });
  } catch (error: any) {
    console.error("Admin PUT Sticker Catalog Error:", error);
    return NextResponse.json({ error: error.message || "Error al actualizar cromo." }, { status: 500 });
  }
}
