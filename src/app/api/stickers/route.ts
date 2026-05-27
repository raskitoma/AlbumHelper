import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    if (!currentUser.familyGroupId) {
      return NextResponse.json({});
    }

    // Fetch all non-zero sticker states for this family group
    const states = await prisma.stickerState.findMany({
      where: {
        familyGroupId: currentUser.familyGroupId,
        quantity: { gt: 0 }
      },
      select: {
        stickerCode: true,
        quantity: true
      }
    });

    // Convert array to key-value dictionary for efficient lookup
    const statesMap: Record<string, number> = {};
    states.forEach((s) => {
      statesMap[s.stickerCode] = s.quantity;
    });

    return NextResponse.json(statesMap);
  } catch (error) {
    console.error("Stickers GET Error:", error);
    return NextResponse.json({ error: "Error al recuperar el estado de los cromos." }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "No autorizado." }, { status: 401 });
    }

    if (!currentUser.familyGroupId) {
      return NextResponse.json({ error: "Debes pertenecer a un grupo familiar para marcar cromos." }, { status: 400 });
    }

    const body = await req.json();
    const { stickerCode, action } = body; // action is "add" or "remove"

    if (!stickerCode || !["add", "remove"].includes(action)) {
      return NextResponse.json({ error: "Código de cromo y acción válidos son requeridos." }, { status: 400 });
    }

    const familyGroupId = currentUser.familyGroupId;
    const userEmailPrefix = currentUser.email.split("@")[0]; // E.g., "Papá" or "Lucas"

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current sticker state
      const state = await tx.stickerState.findUnique({
        where: {
          familyGroupId_stickerCode: {
            familyGroupId,
            stickerCode
          }
        }
      });

      let newQuantity = state ? state.quantity : 0;

      if (action === "add") {
        newQuantity += 1;
        
        // Upsert state
        await tx.stickerState.upsert({
          where: {
            familyGroupId_stickerCode: { familyGroupId, stickerCode }
          },
          update: { quantity: newQuantity },
          create: { familyGroupId, stickerCode, quantity: newQuantity }
        });

        // Write to activity log
        await tx.activityLog.create({
          data: {
            familyGroupId,
            userEmail: userEmailPrefix,
            stickerCode,
            action: "ADD",
            quantity: 1
          }
        });
      } else if (action === "remove") {
        if (newQuantity <= 0) {
          throw new Error("No puedes tener menos de 0 unidades de un cromo.");
        }
        
        newQuantity -= 1;

        if (newQuantity === 0) {
          // Delete row to save database storage space
          await tx.stickerState.delete({
            where: {
              familyGroupId_stickerCode: { familyGroupId, stickerCode }
            }
          });
        } else {
          // Update row count
          await tx.stickerState.update({
            where: {
              familyGroupId_stickerCode: { familyGroupId, stickerCode }
            },
            data: { quantity: newQuantity }
          });
        }

        // Write to activity log
        await tx.activityLog.create({
          data: {
            familyGroupId,
            userEmail: userEmailPrefix,
            stickerCode,
            action: "REMOVE",
            quantity: 1
          }
        });
      }

      return newQuantity;
    });

    return NextResponse.json({ success: true, stickerCode, quantity: result });
  } catch (error: any) {
    console.error("Stickers PUT Error:", error);
    return NextResponse.json(
      { error: error.message || "Fallo al actualizar el cromo." },
      { status: 500 }
    );
  }
}
