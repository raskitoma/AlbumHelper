import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { cookies } from "next/headers";

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const protocol = req.headers.get("x-forwarded-proto") || "http";
  const host = req.headers.get("host") || "localhost";
  const origin = `${protocol}://${host}`;

  try {
    // 1. Fetch Client ID from SQLite configuration
    const googleClientIdConfig = await prisma.systemConfig.findUnique({
      where: { key: "GOOGLE_CLIENT_ID" }
    });

    if (!googleClientIdConfig || !googleClientIdConfig.value) {
      return NextResponse.json(
        { error: "Google OAuth no está configurado en el sistema." },
        { status: 500 }
      );
    }

    const clientId = googleClientIdConfig.value;
    const redirectUri = `${origin}/api/auth/google/callback`;

    // 2. Generate random state to prevent CSRF attacks
    const state = crypto.randomBytes(32).toString("hex");

    // Save state in a cookie (valid for 10 minutes)
    cookieStore.set("google_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 10
    });

    // 3. Construct Google authorization URL and redirect
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_type=code` +
      `&scope=openid%20email%20profile` +
      `&state=${state}` +
      `&prompt=select_account`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("Google Login Initiation Error:", error);
    return NextResponse.json(
      { error: "Fallo al iniciar el flujo de Google OAuth." },
      { status: 500 }
    );
  }
}
