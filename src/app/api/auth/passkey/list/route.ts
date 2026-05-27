import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    const authenticators = await prisma.authenticator.findMany({
      where: { userId: currentUser.id },
      select: {
        id: true,
        credentialDeviceType: true,
        credentialBackedUp: true
      }
    });

    return NextResponse.json(authenticators);
  } catch (error) {
    console.error("Passkey list GET error:", error);
    return NextResponse.json({ error: "Fallo al recuperar dispositivos biométricos." }, { status: 500 });
  }
}
