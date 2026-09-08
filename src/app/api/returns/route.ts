export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendAdminReturnRequest } from "@/lib/email";
import { z } from "zod";

const RETURN_WINDOW_DAYS = 14;

const schema = z.object({
  orderId: z.string().min(1),
  reason: z.string().min(3).max(500),
  items: z
    .array(z.object({ bookId: z.string().nullable().optional(), title: z.string(), qty: z.number().int().positive() }))
    .min(1)
    .max(100),
});

/** Customer requests a return for one of their own delivered orders. */
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const { orderId, reason, items } = parsed.data;

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId: session.user.id },
    include: { returns: { select: { status: true } } },
  });
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });

  if (order.status !== "DELIVERED") {
    return NextResponse.json({ error: "Only delivered orders can be returned." }, { status: 400 });
  }

  // Within the returns window (from delivery, falling back to order date).
  const since = order.deliveredAt ?? order.createdAt;
  const daysSince = (Date.now() - new Date(since).getTime()) / 86_400_000;
  if (daysSince > RETURN_WINDOW_DAYS) {
    return NextResponse.json({ error: `The ${RETURN_WINDOW_DAYS}-day return window has passed.` }, { status: 400 });
  }

  // One active request at a time.
  if (order.returns.some((r) => r.status !== "REJECTED")) {
    return NextResponse.json({ error: "A return request already exists for this order." }, { status: 409 });
  }

  const created = await prisma.return.create({
    data: {
      orderId,
      reason,
      items: JSON.stringify(items),
      status: "REQUESTED",
    },
  });

  // Notify the admin inbox about the return request
  try {
    await sendAdminReturnRequest({
      orderNumber: order.orderNumber,
      orderId: order.id,
      customerEmail: session.user.email ?? "",
      reason,
      items: items.map((i) => ({ title: i.title, qty: i.qty })),
    });
  } catch { /* non-critical */ }

  return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
}
