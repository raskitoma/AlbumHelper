import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createSessionToken, setSessionCookie, getCurrentUser } from "@/lib/auth";
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
    const isAssociateMode = cookieStore.get("google_oauth_associate")?.value === "true";

    if (isAssociateMode) {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("No tienes una sesión activa para asociar con Google.")}`);
      }

      // Check if this Google email is already used by another user
      const existingUser = await prisma.user.findFirst({
        where: {
          OR: [
            { email: normalizedEmail },
            { googleEmail: normalizedEmail }
          ],
          NOT: {
            id: currentUser.id
          }
        }
      });

      if (existingUser) {
        return NextResponse.redirect(`${origin}/settings?error=google_email_taken`);
      }

      // Update current user's googleEmail
      await prisma.user.update({
        where: { id: currentUser.id },
        data: { googleEmail: normalizedEmail }
      });

      // Clean up cookies
      cookieStore.delete("google_oauth_state");
      cookieStore.delete("google_oauth_associate");

      return NextResponse.redirect(`${origin}/settings?success=google_associated`);
    }

    const cookieInviteCode = cookieStore.get("google_oauth_invite_code")?.value;
    const cookieGroupName = cookieStore.get("google_oauth_group_name")?.value;

    // 4. Find or create user account
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: normalizedEmail },
          { googleEmail: normalizedEmail }
        ]
      }
    });

    if (!user) {
      // Register new user and set up their default or requested group
      user = await prisma.$transaction(async (tx) => {
        const newUser = await tx.user.create({
          data: {
            email: normalizedEmail,
            googleEmail: normalizedEmail,
            passwordHash: null, // OAuth users have no password
            role: "USER"
          }
        });

        if (cookieInviteCode && cookieInviteCode.trim()) {
          const existingGroup = await tx.familyGroup.findUnique({
            where: { inviteCode: cookieInviteCode.trim().toUpperCase() }
          });

          if (existingGroup) {
            await tx.familyGroupMember.create({
              data: {
                familyGroupId: existingGroup.id,
                userId: newUser.id,
                role: "GUEST"
              }
            });
            return newUser;
          }
        }

        // Determine group name (requested name, or default e.g. "Álbum de juan")
        const emailPrefix = normalizedEmail.split("@")[0];
        const nameToUse = (cookieGroupName && cookieGroupName.trim())
          ? cookieGroupName.trim()
          : `Álbum de ${emailPrefix}`;
        const inviteCode = await generateUniqueInviteCode();

        const group = await tx.familyGroup.create({
          data: {
            name: nameToUse,
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

    // Clean up CSRF state cookie, associate cookie, and group registration context cookies
    cookieStore.delete("google_oauth_state");
    cookieStore.delete("google_oauth_associate");
    cookieStore.delete("google_oauth_invite_code");
    cookieStore.delete("google_oauth_group_name");

    // Redirect to album
    return NextResponse.redirect(`${origin}/album`);
  } catch (error: any) {
    console.error("Google Callback Error:", error);
    // Redirect to login with error details
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message || "Fallo en autenticación con Google")}`);
  }
}
