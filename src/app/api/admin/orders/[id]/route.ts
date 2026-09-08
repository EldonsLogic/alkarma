export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendShippingNotification, sendAdminOrderStatus } from "@/lib/email";
import { audit } from "@/lib/audit";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { status, trackingNumber, carrierName, adminNotes } = await req.json();

  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { user: true, items: true },
  });
  if (!order) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updateData: Record<string, any> = {};
  if (status) updateData.status = status;
  if (trackingNumber !== undefined) updateData.trackingNumber = trackingNumber;
  if (carrierName !== undefined) updateData.carrierName = carrierName;
  if (adminNotes !== undefined) updateData.adminNotes = adminNotes;

  // Auto-set timestamps
  if (status === "SHIPPED" && !order.shippedAt) updateData.shippedAt = new Date();
  if (status === "DELIVERED" && !order.deliveredAt) updateData.deliveredAt = new Date();
  if (status === "CANCELLED" && !order.cancelledAt) updateData.cancelledAt = new Date();
  if (status === "REFUNDED" && !order.refundedAt) updateData.refundedAt = new Date();

  const updated = await prisma.order.update({ where: { id: params.id }, data: updateData });
  await audit((session as any).user?.email, "order.updated", "Order", params.id, updateData);

  // Send shipping notification to the account or guest email
  const customerEmail = order.user?.email ?? order.guestEmail ?? null;
  if (status === "SHIPPED" && trackingNumber && carrierName && customerEmail) {
    try {
      await sendShippingNotification(
        customerEmail,
        order.orderNumber,
        trackingNumber,
        carrierName
      );
    } catch { /* non-critical */ }
  }

  // Keep the Returns system in sync when an order is marked returned/refunded,
  // so admins never have to log a return by hand.
  if (status && status !== order.status && (status === "RETURNED" || status === "REFUNDED")) {
    const itemsJson = JSON.stringify(
      order.items.map((i) => ({ bookId: i.bookId, title: i.title, qty: i.quantity })),
    );
    const existing = await prisma.return.findFirst({
      where: { orderId: order.id },
      orderBy: { createdAt: "desc" },
    });
    if (status === "RETURNED") {
      if (existing) {
        if (existing.status !== "REFUNDED") {
          await prisma.return.update({ where: { id: existing.id }, data: { status: "RECEIVED" } });
        }
      } else {
        await prisma.return.create({
          data: { orderId: order.id, reason: "Marked returned by admin", items: itemsJson, status: "RECEIVED" },
        });
      }
    } else {
      // REFUNDED — default the refund to the order total; keep any existing amount.
      if (existing) {
        await prisma.return.update({
          where: { id: existing.id },
          data: { status: "REFUNDED", refundAmount: existing.refundAmount ?? Number(order.total) },
        });
      } else {
        await prisma.return.create({
          data: { orderId: order.id, reason: "Refunded by admin", items: itemsJson, status: "REFUNDED", refundAmount: Number(order.total) },
        });
      }
    }
  }

  // Notify the admin inbox when the order status actually changes
  if (status && status !== order.status) {
    try {
      await sendAdminOrderStatus({
        orderNumber: order.orderNumber,
        orderId: order.id,
        status,
        customerName: order.user ? `${order.user.firstName ?? ""} ${order.user.lastName ?? ""}`.trim() : (order.guestName ?? "Guest"),
      });
    } catch { /* non-critical */ }
  }

  return NextResponse.json(updated);
}
