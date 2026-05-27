import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, createSessionToken, setSessionCookie } from "@/lib/auth";
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

export async function POST(req: Request) {
  try {
    // 1. Guardrail: Block register if no users exist
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      return NextResponse.json(
        { error: "Por favor, inicializa el sistema primero en la ruta /setup" },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, password, inviteCode, groupName } = body;

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { error: "El correo electrónico y la contraseña son requeridos." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "El correo electrónico ya se encuentra registrado." },
        { status: 400 }
      );
    }

    // 2. Resolve Family Group Assignment
    let familyGroupId: string | null = null;
    let memberRole: "PRINCIPAL" | "GUEST" = "PRINCIPAL";
    let inviteCodeToUse = inviteCode;

    // Transaction to safely handle user and group creation
    const result = await prisma.$transaction(async (tx) => {
      // Hash password
      const passwordHash = hashPassword(password);
      
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          passwordHash,
          role: "USER"
        }
      });

      if (inviteCode && inviteCode.trim()) {
        // Option A: Join an existing family group
        const existingGroup = await tx.familyGroup.findUnique({
          where: { inviteCode: inviteCode.trim().toUpperCase() }
        });

        if (!existingGroup) {
          throw new Error("El código de invitación ingresado no es válido.");
        }

        familyGroupId = existingGroup.id;
        memberRole = "GUEST"; // Invited members join as Guests
        
        await tx.familyGroupMember.create({
          data: {
            familyGroupId,
            userId: newUser.id,
            role: memberRole
          }
        });
      } else {
        // Option B: Create a new family group (or default solo album)
        const nameToUse = groupName && groupName.trim() ? groupName.trim() : "Mi Álbum";
        const newInviteCode = await generateUniqueInviteCode();
        
        const newGroup = await tx.familyGroup.create({
          data: {
            name: nameToUse,
            inviteCode: newInviteCode
          }
        });

        familyGroupId = newGroup.id;
        memberRole = "PRINCIPAL"; // Creator is Principal
        
        await tx.familyGroupMember.create({
          data: {
            familyGroupId,
            userId: newUser.id,
            role: memberRole
          }
        });
      }

      return newUser;
    });

    // 3. Authenticate and create JWT session
    const token = await createSessionToken({
      userId: result.id,
      email: result.email,
      role: result.role
    });

    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: { id: result.id, email: result.email, role: result.role }
    });
  } catch (error: any) {
    console.error("Register API Error:", error);
    return NextResponse.json(
      { error: error.message || "Fallo interno durante el registro de usuario." },
      { status: 500 }
    );
  }
}
