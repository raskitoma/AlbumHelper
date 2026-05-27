import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function POST(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    if (!currentUser.familyGroupId) {
      return NextResponse.json({ error: "Debes pertenecer a un grupo familiar para marcar cromos." }, { status: 400 });
    }

    const body = await req.json();
    const { codes } = body; // Array of strings e.g. ["MEX 1", "ARG 10"]

    if (!codes || !Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json({ error: "Una lista de códigos de cromos es requerida." }, { status: 400 });
    }

    const familyGroupId = currentUser.familyGroupId;
    const userEmailPrefix = currentUser.email.split("@")[0];

    // Clean and validate codes against catalog
    const cleanedCodes = codes
      .map((c) => c.trim().toUpperCase())
      .filter((c) => c.length > 0);

    // Verify valid codes in catalog
    const validCatalogStickers = await prisma.stickerCatalog.findMany({
      where: { code: { in: cleanedCodes } },
      select: { code: true }
    });

    const validCodesSet = new Set(validCatalogStickers.map((s) => s.code));
    const codesToUpdate = cleanedCodes.filter((c) => validCodesSet.has(c));

    if (codesToUpdate.length === 0) {
      return NextResponse.json({ error: "Ninguno de los códigos ingresados es válido." }, { status: 400 });
    }

    // Perform bulk updates in transaction
    await prisma.$transaction(async (tx) => {
      for (const code of codesToUpdate) {
        // Fetch current quantity
        const state = await tx.stickerState.findUnique({
          where: {
            familyGroupId_stickerCode: { familyGroupId, stickerCode: code }
          }
        });

        const newQuantity = (state ? state.quantity : 0) + 1;

        // Upsert state
        await tx.stickerState.upsert({
          where: {
            familyGroupId_stickerCode: { familyGroupId, stickerCode: code }
          },
          update: { quantity: newQuantity },
          create: { familyGroupId, stickerCode: code, quantity: newQuantity }
        });

        // Write activity log
        await tx.activityLog.create({
          data: {
            familyGroupId,
            userEmail: userEmailPrefix,
            stickerCode: code,
            action: "ADD",
            quantity: 1
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      updatedCount: codesToUpdate.length,
      codes: codesToUpdate
    });
  } catch (error: any) {
    console.error("Bulk stickers update error:", error);
    return NextResponse.json({ error: "Fallo al procesar carga en bloque de cromos." }, { status: 500 });
  }
}
