import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    // Set googleEmail to null
    await prisma.user.update({
      where: { id: currentUser.id },
      data: { googleEmail: null }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Google Unlink Error:", error);
    return NextResponse.json({ error: "Error al desvincular la cuenta de Google." }, { status: 500 });
  }
}
