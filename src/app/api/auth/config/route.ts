import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    const googleId = await prisma.systemConfig.findUnique({
      where: { key: "GOOGLE_CLIENT_ID" }
    });
    const googleSecret = await prisma.systemConfig.findUnique({
      where: { key: "GOOGLE_CLIENT_SECRET" }
    });

    const googleEnabled = !!(googleId?.value && googleSecret?.value);

    return NextResponse.json({ googleEnabled });
  } catch (error) {
    console.error("Failed to read system auth configs:", error);
    return NextResponse.json({ googleEnabled: false });
  }
}
