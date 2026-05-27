import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSessionToken, setSessionCookie } from "@/lib/auth";
import crypto from "crypto";
import { cookies } from "next/headers";

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

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const storedState = cookieStore.get("google_oauth_state")?.value;

  // CSRF validation
  if (!state || state !== storedState) {
    return NextResponse.json(
      { error: "Verificación de estado fallida (Fallo de CSRF)." },
      { status: 400 }
    );
  }

  if (!code) {
    return NextResponse.json(
      { error: "Código de autorización no provisto por Google." },
      { status: 400 }
    );
  }

  const protocol = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost";
  const origin = `${protocol}://${host}`;
  const redirectUri = `${origin}/api/auth/google/callback`;

  try {
    // 1. Retrieve Client configs
    const googleId = await prisma.systemConfig.findUnique({
      where: { key: "GOOGLE_CLIENT_ID" }
    });
    const googleSecret = await prisma.systemConfig.findUnique({
      where: { key: "GOOGLE_CLIENT_SECRET" }
    });

    if (!googleId?.value || !googleSecret?.value) {
      return NextResponse.json(
        { error: "Google OAuth no está configurado en el sistema." },
        { status: 500 }
      );
    }

    // 2. Exchange code for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: googleId.value,
        client_secret: googleSecret.value,
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      throw new Error(tokenData.error_description || tokenData.error || "Fallo en intercambio de tokens.");
    }

    const { access_token } = tokenData;

    // 3. Fetch user information
    const userinfoResponse = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    const userinfo = await userinfoResponse.json();
    if (!userinfoResponse.ok) {
      throw new Error("No se pudo obtener la información de usuario de Google.");
    }

    const { email, email_verified } = userinfo;

    if (!email || !email_verified) {
      return NextResponse.json(
        { error: "Google no retornó un correo electrónico verificado." },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    // 4. Find or create user account
    let user = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!user) {
      // Register new user and set up their default individual album group
      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            passwordHash: null, // OAuth users have no password
            role: "USER"
          }
        });

        // Determine default group name (e.g. "Álbum de juan")
        const emailPrefix = normalizedEmail.split("@")[0];
        const groupName = `Álbum de ${emailPrefix}`;
        const inviteCode = await generateUniqueInviteCode();

        const group = await tx.familyGroup.create({
          data: {
            name: groupName,
            inviteCode
          }
        });

        // Link user as Principal
        await tx.familyGroupMember.create({
          data: {
            familyGroupId: group.id,
            userId: newUser.id,
            role: "PRINCIPAL"
          }
        });

        return newUser;
      });
    }

    // 5. Authenticate user session
    const sessionToken = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    await setSessionCookie(sessionToken);

    // Clean up CSRF state cookie
    cookieStore.delete("google_oauth_state");

    // Redirect to album
    return NextResponse.redirect(`${origin}/album`);
  } catch (error: any) {
    console.error("Google Callback Error:", error);
    // Redirect to login with error details
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message || "Fallo en autenticación con Google")}`);
  }
}
