import { initPrisma } from "../src/lib/db";
import { generateStickerCatalog } from "../src/lib/albumData";

async function main() {
  const prisma = initPrisma();
  console.log("Iniciando la siembra del catálogo de cromos...");

  try {
    // Limpiar catálogo existente
    const deleteResult = await prisma.stickerCatalog.deleteMany();
    console.log(`Limpieza completada: ${deleteResult.count} registros eliminados.`);

    const stickers = generateStickerCatalog();

    // Insertar el catálogo completo
    await prisma.stickerCatalog.createMany({
      data: stickers,
    });

    console.log(`¡Siembra completada con éxito! Se registraron ${stickers.length} cromos en el catálogo.`);
  } catch (error) {
    console.error("Error durante la siembra:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
