import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import crypto from "crypto";

// Helper to generate a unique 6-character uppercase invite code
async function generateUniqueInviteCode(): Promise<string> {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  let isUnique = false;

  while (!isUnique) {
    code = "";
    for (let i = 0; i < 6; i++) {
      const idx = crypto.randomInt(0, chars.length);
      code += chars[idx];
    }

    const existing = await prisma.familyGroup.findUnique({
      where: { inviteCode: code }
    });

    if (!existing) {
      isUnique = true;
    }
  }

  return code;
}

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    if (!currentUser.familyGroupId) {
      return NextResponse.json({ group: null });
    }

    // Fetch group details along with its members and latest 20 logs
    const group = await prisma.familyGroup.findUnique({
      where: { id: currentUser.familyGroupId },
      include: {
        members: {
          include: {
            user: {
              select: {
                id: true,
                email: true
              }
            }
          },
          orderBy: { joinedAt: "asc" }
        },
        logs: {
          orderBy: { timestamp: "desc" },
          take: 20
        }
      }
    });

    if (!group) {
      return NextResponse.json({ group: null });
    }

    return NextResponse.json({
      id: group.id,
      name: group.name,
      inviteCode: group.inviteCode,
      createdAt: group.createdAt,
      members: group.members.map((m) => ({
        userId: m.user.id,
        email: m.user.email,
        role: m.role,
        joinedAt: m.joinedAt
      })),
      activity: group.logs.map((l) => ({
        id: l.id,
        userEmail: l.userEmail,
        stickerCode: l.stickerCode,
        action: l.action,
        quantity: l.quantity,
        timestamp: l.timestamp
      }))
    });
  } catch (error) {
    console.error("Group GET Error:", error);
    return NextResponse.json({ error: "Error al recuperar datos del grupo." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "El nombre del grupo es requerido." }, { status: 400 });
    }

    const inviteCode = await generateUniqueInviteCode();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Remove user from existing groups
      await tx.familyGroupMember.deleteMany({
        where: { userId: currentUser.id }
      });

      // 2. Create the new family group
      const newGroup = await tx.familyGroup.create({
        data: {
          name: name.trim(),
          inviteCode
        }
      });

      // 3. Link user as Principal
      await tx.familyGroupMember.create({
        data: {
          familyGroupId: newGroup.id,
          userId: currentUser.id,
          role: "PRINCIPAL"
        }
      });

      return newGroup;
    });

    return NextResponse.json({
      success: true,
      group: { id: result.id, name: result.name, inviteCode: result.inviteCode }
    });
  } catch (error) {
    console.error("Group POST Error:", error);
    return NextResponse.json({ error: "Error al crear el grupo familiar." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const body = await req.json();
    const { inviteCode } = body;

    if (!inviteCode || !inviteCode.trim()) {
      return NextResponse.json({ error: "El código de invitación es requerido." }, { status: 400 });
    }

    const cleanCode = inviteCode.trim().toUpperCase();

    // Find group by invite code
    const targetGroup = await prisma.familyGroup.findUnique({
      where: { inviteCode: cleanCode }
    });

    if (!targetGroup) {
      return NextResponse.json({ error: "El código de invitación ingresado no es válido." }, { status: 400 });
    }

    await prisma.$transaction(async (tx) => {
      // 1. Remove user from existing groups
      await tx.familyGroupMember.deleteMany({
        where: { userId: currentUser.id }
      });

      // 2. Join the target family group as Guest
      await tx.familyGroupMember.create({
        data: {
          familyGroupId: targetGroup.id,
          userId: currentUser.id,
          role: "GUEST"
        }
      });
    });

    return NextResponse.json({
      success: true,
      group: { id: targetGroup.id, name: targetGroup.name }
    });
  } catch (error) {
    console.error("Group PUT Error:", error);
    return NextResponse.json({ error: "Error al unirse al grupo familiar." }, { status: 500 });
  }
}
