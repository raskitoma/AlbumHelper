import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const { avatarType, avatarUrl } = await req.json();

    if (avatarType !== "GRAVATAR" && avatarType !== "UPLOAD") {
      return NextResponse.json({ error: "Tipo de avatar inválido." }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: {
        avatarType,
        avatarUrl: avatarType === "UPLOAD" ? avatarUrl : null
      }
    });

    return NextResponse.json({
      success: true,
      avatarType: updatedUser.avatarType,
      avatarUrl: updatedUser.avatarUrl
    });
  } catch (error: any) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Fallo al actualizar el perfil." }, { status: 500 });
  }
}
