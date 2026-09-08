import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  // Refunds require orders:write (SUPER_ADMIN or FULFILLMENT)
  const session = await requirePermission("orders", "write");
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { amount, reason } = await req.json();
  if (!amount || amount <= 0) return NextResponse.json({ error: "Amount required" }, { status: 400 });

  const order = await prisma.order.update({
    where: { id: params.id },
    data: {
      status: "REFUNDED",
      paymentStatus: "REFUNDED",
      refundAmount: Number(amount),
      refundReason: reason || null,
      refundedAt: new Date(),
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userEmail: session.user?.email ?? null,
      action: "order.refunded",
      entityType: "Order",
      entityId: params.id,
      after: JSON.stringify({ amount, reason }),
    },
  });

  return NextResponse.json(order);
}
