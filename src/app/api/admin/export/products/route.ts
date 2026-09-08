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

  // type: "BOOK" only — Stationery and Adopt-a-Book items live in the same
  // table but have their own admin sections/import routes; including them
  // here would mislabel them as type BOOK on reimport.
  const books = await prisma.book.findMany({
    where: { type: "BOOK" },
    orderBy: { title: "asc" },
    include: {
      categories: { include: { category: true } },
      tags: { include: { tag: true } },
      images: { orderBy: { position: "asc" } },
    },
  });

  // Column-for-column match with the import template (GET on /api/admin/import/products)
  // — anything added here without a matching import column would appear on export but
  // silently vanish the moment the file is edited and reimported.
  //
  // Exception: "salesCount" is exported for reference only and is NEVER read back on
  // import — it's a system-tracked count of real purchases, so a reimported CSV must
  // never be able to reset it to whatever value it happened to hold at export time.
  const headers = [
    "slug", "title", "subtitle", "synopsis", "isbn",
    "author", "translator", "editor", "publisher", "publishDate", "pageCount", "language",
    "coverUrl", "images", "priceEgp", "compareAtEgp",
    "stock", "lowStockAt", "weight", "isActive", "isFeatured", "isBestseller",
    "isNewRelease", "salesCount", "ageRange", "categories", "tags",
  ];

  const rows = books.map((b) => [
    b.slug, b.title, b.subtitle, b.synopsis, b.isbn,
    b.author, b.translator, b.editor, b.publisher,
    b.publishDate ? b.publishDate.toISOString().split("T")[0] : "",
    b.pageCount, b.language, b.coverUrl,
    b.images.map((img) => img.url).join("|"),
    Number(b.priceEgp),
    b.compareAtEgp ? Number(b.compareAtEgp) : "",
    b.stock, b.lowStockAt, b.weight ?? "",
    b.isActive, b.isFeatured, b.isBestseller, b.isNewRelease, b.salesCount,
    b.ageRange ?? "",
    b.categories.map((bc) => bc.category.slug).join("|"),
    b.tags.map((bt) => bt.tag.name).join("|"),
  ].map(esc).join(","));

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="products-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
