export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/addresses — the signed-in user's saved addresses, used by checkout
// to offer "use a saved address" instead of retyping everything (including
// governorate, which shipping-rate lookup depends on).
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ addresses: [] });

  const addresses = await prisma.address.findMany({
    where: { userId: session.user.id },
    orderBy: [{ isDefault: "desc" }, { id: "asc" }],
    select: {
      id: true, label: true, fullName: true, phone: true, line1: true, line2: true,
      city: true, state: true, governorate: true, postcode: true, country: true, isDefault: true,
    },
  });

  return NextResponse.json({ addresses });
}
