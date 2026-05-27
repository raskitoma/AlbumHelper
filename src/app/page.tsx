import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  // 1. If DB is uninitialized (no users), redirect to setup
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    redirect("/setup");
  }

  // 2. Check if user is authenticated
  const user = await getCurrentUser();
  if (user) {
    redirect("/album");
  } else {
    redirect("/login");
  }
}

