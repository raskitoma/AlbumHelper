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
    // Generate 6 random characters
    for (let i = 0; i < 6; i++) {
      const idx = crypto.randomInt(0, chars.length);
      code += chars[idx];
    }

    // Check uniqueness in database
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
    // 1. Security Check: Block setup if database already has users
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return NextResponse.json(
        { error: "La configuración inicial ya ha sido completada." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { email, password, groupName } = body;

    // Validate inputs
    if (!email || !password) {
      return NextResponse.json(
        { error: "Correo electrónico y contraseña son requeridos." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "La contraseña debe tener al menos 6 caracteres." },
        { status: 400 }
      );
    }

    // 2. Hash password and create first ADMIN user
    const passwordHash = hashPassword(password);
    
    // Perform creation in a transaction to ensure atomic group assignment
    const result = await prisma.$transaction(async (tx) => {
      const adminUser = await tx.user.create({
        data: {
          email: email.toLowerCase().trim(),
          passwordHash,
          role: "ADMIN"
        }
      });

      let familyGroup = null;

      // 3. Create Family Group if requested
      if (groupName && groupName.trim()) {
        const inviteCode = await generateUniqueInviteCode();
        familyGroup = await tx.familyGroup.create({
          data: {
            name: groupName.trim(),
            inviteCode
          }
        });

        // Add admin as Principal member of the family group
        await tx.familyGroupMember.create({
          data: {
            familyGroupId: familyGroup.id,
            userId: adminUser.id,
            role: "PRINCIPAL"
          }
        });
      }

      return { user: adminUser, group: familyGroup };
    });

    // 4. Create JWT session token and set cookie
    const token = await createSessionToken({
      userId: result.user.id,
      email: result.user.email,
      role: result.user.role
    });

    await setSessionCookie(token);

    return NextResponse.json({
      success: true,
      user: { id: result.user.id, email: result.user.email, role: result.user.role },
      group: result.group ? { id: result.group.id, name: result.group.name, inviteCode: result.group.inviteCode } : null
    });
  } catch (error: any) {
    console.error("Setup API Error:", error);
    return NextResponse.json(
      { error: "Fallo interno durante la configuración del administrador." },
      { status: 500 }
    );
  }
}
