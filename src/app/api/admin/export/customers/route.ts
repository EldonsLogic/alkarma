export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function esc(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { orders: true } } },
  });

  const headers = [
    "id", "firstName", "lastName", "email", "phone",
    "country", "preferredLang", "emailVerified",
    "totalOrders", "createdAt",
  ];

  const rows = customers.map((u) => [
    u.id, u.firstName, u.lastName, u.email, u.phone,
    u.country, u.preferredLang, u.emailVerified,
    u._count.orders,
    u.createdAt.toISOString().split("T")[0],
  ].map(esc).join(","));

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="customers-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
