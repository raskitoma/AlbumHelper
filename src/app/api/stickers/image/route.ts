import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import fs from "fs";
import path from "path";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return new NextResponse("Code is required", { status: 400 });
    }

    const cacheDir = path.join(process.cwd(), "prisma", "images_cache");
    
    // Ensure cache directory exists
    if (!fs.existsSync(cacheDir)) {
      fs.mkdirSync(cacheDir, { recursive: true });
    }

    // Check if we have it cached locally
    const files = fs.readdirSync(cacheDir);
    const cachedFile = files.find(f => path.parse(f).name === code);

    if (cachedFile) {
      const filePath = path.join(cacheDir, cachedFile);
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(cachedFile).toLowerCase();
      let contentType = "image/jpeg";
      if (ext === ".png") contentType = "image/png";
      else if (ext === ".webp") contentType = "image/webp";
      else if (ext === ".gif") contentType = "image/gif";
      else if (ext === ".svg") contentType = "image/svg+xml";

      return new NextResponse(buffer, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=31536000, immutable",
        },
      });
    }

    // If not cached, lookup in DB
    const sticker = await prisma.stickerCatalog.findUnique({
      where: { code },
    });

    if (!sticker || !sticker.imageUrl) {
      return new NextResponse("Not Found", { status: 404 });
    }

    // Fetch the image from external source
    const res = await fetch(sticker.imageUrl);
    if (!res.ok) {
      return new NextResponse("Failed to fetch source image", { status: 502 });
    }

    const contentType = res.headers.get("content-type") || "image/jpeg";
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Save to disk cache
    let ext = ".jpg";
    if (contentType.includes("png")) ext = ".png";
    else if (contentType.includes("webp")) ext = ".webp";
    else if (contentType.includes("gif")) ext = ".gif";
    else if (contentType.includes("svg")) ext = ".svg";

    const targetPath = path.join(cacheDir, `${code}${ext}`);
    fs.writeFileSync(targetPath, buffer);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Image proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
