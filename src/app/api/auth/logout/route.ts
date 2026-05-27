import { NextResponse } from "next/server";
import { removeSessionCookie } from "@/lib/auth";

export async function POST() {
  try {
    await removeSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Logout error:", error);
    return NextResponse.json({ error: "Fallo al cerrar sesión." }, { status: 500 });
  }
}
export async function GET() {
  // Support both GET and POST for simplicity
  try {
    await removeSessionCookie();
    // Redirect to login on GET request
    const response = NextResponse.redirect(new URL("/login", "http://localhost:3000")); // will resolve to current origin dynamically if we use redirection headers
    return response;
  } catch (error) {
    return NextResponse.json({ error: "Fallo al cerrar sesión." });
  }
}
