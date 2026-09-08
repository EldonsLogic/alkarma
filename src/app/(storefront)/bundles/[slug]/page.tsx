import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BundleDetailClient } from "./BundleDetailClient";
import { decodeSlug } from "@/lib/slug";
import { canonical } from "@/lib/seo";
import type { Metadata } from "next";

interface Props {
  params: { slug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const bundle = await prisma.bundle.findUnique({ where: { slug: decodeSlug(params.slug) } });
  if (!bundle) return {};
  return {
    title: `${bundle.name} | دار الكرمة`,
    description: bundle.description ?? `Get ${bundle.name} at a special bundle price.`,
    ...canonical(`/bundles/${encodeURIComponent(bundle.slug)}`),
  };
}

export default async function BundleDetailPage({ params }: Props) {
  const bundle = await prisma.bundle.findUnique({
    where: { slug: decodeSlug(params.slug), isActive: true },
    include: {
      items: {
        include: {
          book: true,
        },
      },
    },
  });

  if (!bundle) notFound();

  return (
    <BundleDetailClient
      bundle={{
        id: bundle.id,
        slug: bundle.slug,
        name: bundle.name,
        nameAr: bundle.nameAr,
        description: bundle.description,
        descAr: bundle.descAr,
        coverUrl: bundle.coverUrl,
        priceEgp: Number(bundle.priceEgp),
        compareEgp: bundle.compareEgp ? Number(bundle.compareEgp) : null,
        stock: bundle.stock,
        items: bundle.items.map((i) => ({
          quantity: i.quantity,
          book: {
            id: i.book.id,
            slug: i.book.slug,
            title: i.book.title,
            author: i.book.author,
            coverUrl: i.book.coverUrl,
            priceEgp: Number(i.book.priceEgp),
            synopsis: i.book.synopsis,
          },
        })),
      }}
    />
  );
}
