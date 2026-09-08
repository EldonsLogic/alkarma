import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

export async function POST(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const original = await prisma.book.findUnique({
    where: { id: params.id },
    include: { categories: true },
  });
  if (!original) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Build unique slug
  const baseSlug = slugify(`${original.title}-copy`);
  let slug = baseSlug;
  let attempt = 0;
  while (await prisma.book.findUnique({ where: { slug } })) {
    attempt++;
    slug = `${baseSlug}-${attempt}`;
  }

  const { id: _id, createdAt: _ca, updatedAt: _ua, slug: _slug, ...rest } = original as any;

  const dupe = await prisma.book.create({
    data: {
      ...rest,
      slug,
      title: `${original.title} (Copy)`,
      titleAr: original.titleAr ? `${original.titleAr} (نسخة)` : null,
      isbn: null,
      isActive: false,
      isFeatured: false,
      isBestseller: false,
      isNewRelease: false,
      stock: 0,
      categories: {
        create: original.categories.map((c) => ({ categoryId: c.categoryId })),
      },
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      userEmail: session.user?.email ?? null,
      action: "product.duplicated",
      entityType: "Book",
      entityId: dupe.id,
      before: JSON.stringify({ originalId: params.id }),
      after: JSON.stringify({ newId: dupe.id, slug }),
    },
  });

  return NextResponse.json({ id: dupe.id, slug });
}
