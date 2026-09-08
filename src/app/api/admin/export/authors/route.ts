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

  const authors = await prisma.author.findMany({
    orderBy: { name: "asc" },
    // bookLinks (the BookAuthor join) counts every co-author correctly;
    // "books" only counts via Book.authorId (the single primary-author FK),
    // so a 2nd/3rd co-author would always export as 0 books.
    include: { _count: { select: { bookLinks: true } } },
  });

  const headers = ["slug", "name", "nameAr", "bio", "bioAr", "photoUrl", "bookCount"];

  const rows = authors.map((a) => [
    a.slug, a.name, a.nameAr, a.bio, a.bioAr, a.photoUrl, a._count.bookLinks,
  ].map(esc).join(","));

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="authors-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
