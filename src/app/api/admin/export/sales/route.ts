import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = req.nextUrl;
  const days = parseInt(searchParams.get("days") ?? "30", 10);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const orders = await prisma.order.findMany({
    where: {
      createdAt: { gte: since },
      status: { notIn: ["CANCELLED", "REFUNDED"] },
    },
    include: {
      items: { include: { book: { select: { title: true, author: true, isbn: true } } } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const rows: string[] = [
    ["Order #", "Date", "Customer", "Email", "Status", "Payment", "Book Title", "Author", "ISBN", "Qty", "Unit Price", "Line Total", "Currency"].join(","),
  ];

  for (const order of orders) {
    for (const item of order.items) {
      rows.push([
        order.orderNumber,
        order.createdAt.toISOString().slice(0, 10),
        order.user ? `${order.user.firstName} ${order.user.lastName}` : (order.guestName || "Guest"),
        order.user?.email ?? order.guestEmail ?? "",
        order.status,
        order.paymentStatus,
        `"${item.book?.title ?? item.title}"`,
        `"${item.book?.author ?? ""}"`,
        item.book?.isbn ?? "",
        item.quantity,
        Number(item.unitPrice).toFixed(2),
        (Number(item.unitPrice) * item.quantity).toFixed(2),
        order.currency,
      ].join(","));
    }
  }

  const csv = rows.join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="sales-${days}d-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
