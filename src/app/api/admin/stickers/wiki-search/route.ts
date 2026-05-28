import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const term = searchParams.get("term") || "";
    const limit = searchParams.get("limit") || "5";

    if (!term.trim()) {
      return NextResponse.json([]);
    }

    const wikiUrl = `https://commons.wikimedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(term)}&gsrlimit=${limit}&prop=pageimages|imageinfo&piprop=thumbnail&pithumbsize=250&iiprop=url&origin=*`;

    const res = await fetch(wikiUrl, {
      headers: {
        "User-Agent": "AlbumHelper/1.0 (contact: wantan@gmail.com; project: PaniniHelper)"
      }
    });

    if (!res.ok) {
      return NextResponse.json({ error: `Wikimedia returned status ${res.status}` }, { status: res.status });
    }

    const data = await res.json();
    const pages = data.query?.pages || {};
    const urls: string[] = [];
    for (const key in pages) {
      const page = pages[key];
      const imgUrl = page.thumbnail?.source || page.imageinfo?.[0]?.url;
      if (imgUrl) {
        urls.push(imgUrl);
      }
    }

    return NextResponse.json(urls);
  } catch (error: any) {
    console.error("Wikimedia Proxy Search Error:", error);
    return NextResponse.json({ error: error.message || "Error al buscar imágenes en Wikimedia." }, { status: 500 });
  }
}
