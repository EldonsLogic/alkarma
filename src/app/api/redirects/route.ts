import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const redirects = await prisma.redirect.findMany({
    select: { fromPath: true, toPath: true, statusCode: true },
    orderBy: { createdAt: "asc" },
  });
  const mapped = redirects.map((r) => ({ from: r.fromPath, to: r.toPath, statusCode: r.statusCode }));
  return NextResponse.json(mapped, {
    headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" },
  });
}
