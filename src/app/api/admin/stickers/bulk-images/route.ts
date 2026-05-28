import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
    }

    const body = await req.json();
    const { updates } = body; // Array of { code, imageUrl }

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: "Actualizaciones inválidas." }, { status: 400 });
    }

    await prisma.$transaction(
      updates.map((up) =>
        prisma.stickerCatalog.update({
          where: { code: up.code },
          data: { imageUrl: up.imageUrl || null }
        })
      )
    );

    // Invalidate local image proxy cache for all updated codes
    try {
      const cacheDir = path.join(process.cwd(), "prisma", "images_cache");
      if (fs.existsSync(cacheDir)) {
        const files = fs.readdirSync(cacheDir);
        for (const up of updates) {
          const cachedFile = files.find(f => path.parse(f).name === up.code);
          if (cachedFile) {
            fs.unlinkSync(path.join(cacheDir, cachedFile));
          }
        }
      }
    } catch (e) {
      console.error("Failed to invalidate bulk image cache", e);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin Bulk Stickers Image Update Error:", error);
    return NextResponse.json({ error: error.message || "Error al actualizar cromos en lote." }, { status: 500 });
  }
}
