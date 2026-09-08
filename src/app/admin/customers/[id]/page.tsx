import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { CustomerDetailClient } from "./CustomerDetailClient";

export default async function AdminCustomerDetailPage({ params }: { params: { id: string } }) {
  const customer = await prisma.user.findUnique({
    where: { id: params.id },
    include: {
      orders: {
        orderBy: { createdAt: "desc" },
        include: { items: { select: { title: true, quantity: true } } },
      },
      customerNotes: { orderBy: { createdAt: "desc" } },
      customerTags: { orderBy: { createdAt: "desc" } },
      addresses: true,
      _count: { select: { wishlistItems: true } },
    },
  });

  if (!customer) notFound();

  const serialized = {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone ?? null,
    country: customer.country ?? null,
    role: customer.role,
    staffRole: customer.staffRole ?? null,
    createdAt: customer.createdAt.toISOString(),
    wishlistCount: customer._count.wishlistItems,
    orders: customer.orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status,
      paymentStatus: o.paymentStatus,
      total: Number(o.total),
      currency: o.currency,
      createdAt: o.createdAt.toISOString(),
      items: o.items,
    })),
    notes: customer.customerNotes.map((n) => ({
      id: n.id,
      body: n.body,
      authorEmail: n.authorEmail ?? null,
      createdAt: n.createdAt.toISOString(),
    })),
    tags: customer.customerTags.map((t) => t.tag),
  };

  return <CustomerDetailClient customer={serialized} />;
}
