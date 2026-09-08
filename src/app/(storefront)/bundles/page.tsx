import { prisma } from "@/lib/prisma";
import { BundlesClient } from "./BundlesClient";
import type { Metadata } from "next";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "باقات الكتب",
  description: "Save more with our curated book bundles — hand-picked sets at great prices.",
  ...canonical("/bundles"),
};

export default async function BundlesPage() {
  const bundles = await prisma.bundle.findMany({
    where: { isActive: true },
    include: {
      items: {
        include: {
          book: {
            select: { id: true, title: true, author: true, coverUrl: true, slug: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <BundlesClient
      bundles={bundles.map((b) => ({
        id: b.id,
        slug: b.slug,
        name: b.name,
        nameAr: b.nameAr,
        description: b.description,
        coverUrl: b.coverUrl,
        priceEgp: Number(b.priceEgp),
        compareEgp: b.compareEgp ? Number(b.compareEgp) : null,
        stock: b.stock,
        items: b.items.map((i) => ({
          book: {
            id: i.book.id,
            title: i.book.title,
            author: i.book.author,
            coverUrl: i.book.coverUrl,
            slug: i.book.slug,
          },
          quantity: i.quantity,
        })),
      }))}
    />
  );
}
