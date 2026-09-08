import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OrderManageClient } from "./OrderManageClient";

export default async function AdminOrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: {
      items: { include: { book: { select: { coverUrl: true, slug: true } } } },
      user: true,
      orderNotes: { orderBy: { createdAt: "desc" } },
      returns: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!order) notFound();

  return (
    <OrderManageClient
      order={{
        ...order,
        subtotal: Number(order.subtotal),
        shippingFee: Number(order.shippingFee),
        discount: Number(order.discount),
        total: Number(order.total),
        items: order.items.map((i) => ({
          ...i,
          unitPrice: Number(i.unitPrice),
          book: i.book ?? null,
        })),
        user: order.user
          ? {
              id: order.user.id,
              firstName: order.user.firstName,
              lastName: order.user.lastName,
              email: order.user.email,
              phone: order.user.phone ?? null,
            }
          : null,
        guestEmail: order.guestEmail ?? null,
        guestName: order.guestName ?? null,
        shippingAddress: (() => { try { return JSON.parse(order.shippingAddress); } catch { return {}; } })(),
        createdAt: order.createdAt.toISOString(),
        updatedAt: order.updatedAt.toISOString(),
        paidAt: order.paidAt?.toISOString() ?? null,
        shippedAt: order.shippedAt?.toISOString() ?? null,
        deliveredAt: order.deliveredAt?.toISOString() ?? null,
        cancelledAt: order.cancelledAt?.toISOString() ?? null,
        refundedAt: order.refundedAt?.toISOString() ?? null,
        refundAmount: order.refundAmount ? Number(order.refundAmount) : null,
        refundReason: order.refundReason ?? null,
        orderNotes: order.orderNotes.map((n) => ({ ...n, createdAt: n.createdAt.toISOString() })),
        returns: order.returns.map((r) => ({ ...r, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString() })),
      }}
    />
  );
}
