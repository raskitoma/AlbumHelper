import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        createdAt: true,
        twoFactorEnabled: true,
        memberships: {
          select: {
            familyGroup: {
              select: {
                name: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Format list to show group names
    const formatted = users.map((u) => ({
      id: u.id,
      email: u.email,
      role: u.role,
      twoFactorEnabled: u.twoFactorEnabled,
      createdAt: u.createdAt,
      group: u.memberships[0]?.familyGroup.name || "Sin grupo"
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error("Admin GET Users Error:", error);
    return NextResponse.json({ error: "Fallo al recuperar usuarios." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
    }

    const body = await req.json();
    const { userId, role } = body;

    if (!userId || !role || !["USER", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "ID de usuario y rol válido son requeridos." }, { status: 400 });
    }

    // Prevent demoting oneself
    if (userId === currentUser.id) {
      return NextResponse.json({ error: "No puedes cambiar tu propio rol." }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { role }
    });

    return NextResponse.json({ success: true, role: updatedUser.role });
  } catch (error: any) {
    console.error("Admin PUT User Error:", error);
    return NextResponse.json({ error: error.message || "Error al actualizar rol del usuario." }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== "ADMIN") {
      return NextResponse.json({ error: "Acceso denegado." }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "ID de usuario requerido." }, { status: 400 });
    }

    // Prevent deleting oneself
    if (userId === currentUser.id) {
      return NextResponse.json({ error: "No puedes eliminar tu propia cuenta de administrador." }, { status: 400 });
    }

    await prisma.user.delete({
      where: { id: userId }
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin DELETE User Error:", error);
    return NextResponse.json({ error: error.message || "Error al eliminar usuario." }, { status: 500 });
  }
}
