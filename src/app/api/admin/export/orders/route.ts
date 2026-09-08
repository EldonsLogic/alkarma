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

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      _count: { select: { items: true } },
    },
  });

  const headers = [
    "orderNumber", "customerName", "email",
    "status", "paymentMethod", "paymentStatus",
    "currency", "subtotal", "shippingFee", "discount", "total",
    "itemCount", "couponCode",
    "trackingNumber", "carrierName",
    "paidAt", "createdAt",
  ];

  const rows = orders.map((o) => [
    o.orderNumber,
    o.user ? `${o.user.firstName} ${o.user.lastName}` : (o.guestName || "Guest"),
    o.user?.email ?? o.guestEmail ?? "",
    o.status,
    o.paymentMethod,
    o.paymentStatus,
    o.currency,
    Number(o.subtotal).toFixed(2),
    Number(o.shippingFee).toFixed(2),
    Number(o.discount).toFixed(2),
    Number(o.total).toFixed(2),
    o._count.items,
    o.couponCode,
    o.trackingNumber,
    o.carrierName,
    o.paidAt ? o.paidAt.toISOString().split("T")[0] : "",
    o.createdAt.toISOString().split("T")[0],
  ].map(esc).join(","));

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
