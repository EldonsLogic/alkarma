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

  const carts = await prisma.abandonedCart.findMany({
    orderBy: { updatedAt: "desc" },
    include: { user: { select: { firstName: true, lastName: true, email: true } } },
  });

  const headers = [
    "id", "customerName", "email", "type",
    "totalEgp", "currency",
    "step", "itemCount", "items",
    "isRecovered", "recoveredAt", "createdAt",
  ];

  const rows = carts.map((c) => {
    let items: Array<{ title?: string; quantity?: number }> = [];
    try { items = JSON.parse(c.items); } catch {}
    const name = c.user
      ? `${c.user.firstName} ${c.user.lastName}`
      : "";
    const email = c.user?.email ?? c.guestEmail ?? "";
    const type = c.user ? "Registered" : c.guestEmail ? "Guest" : "Anonymous";
    const itemCount = items.reduce((s, i) => s + (i.quantity ?? 1), 0);
    const itemTitles = items.map((i) => i.title).filter(Boolean).join(" | ");

    return [
      c.id, name, email, type,
      Number(c.totalEgp).toFixed(2),
      c.currency, c.step, itemCount, itemTitles,
      c.isRecovered,
      c.recoveredAt ? c.recoveredAt.toISOString().split("T")[0] : "",
      c.createdAt.toISOString().split("T")[0],
    ].map(esc).join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="cart-abandonment-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
