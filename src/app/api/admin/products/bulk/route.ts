import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { action, ids, value } = await req.json();
  if (!action || !Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "action and ids required" }, { status: 400 });
  }
  const where = { id: { in: ids as string[] } };

  try {
    switch (action) {
      // ── Visibility / lifecycle ──────────────────────────────────────────
      case "publish":
        await prisma.book.updateMany({ where, data: { isActive: true } });
        break;
      case "unpublish":
        await prisma.book.updateMany({ where, data: { isActive: false } });
        break;
      case "delete":
        await prisma.book.deleteMany({ where });
        break;

      // ── Flags (bestseller / new release / featured) ─────────────────────
      case "flag": {
        const field = value?.field as string;
        const on = !!value?.on;
        if (!["isBestseller", "isNewRelease", "isFeatured"].includes(field)) {
          return NextResponse.json({ error: "Invalid flag" }, { status: 400 });
        }
        await prisma.book.updateMany({ where, data: { [field]: on } });
        break;
      }

      // ── Stock ───────────────────────────────────────────────────────────
      case "stock-set": {
        const stock = Math.max(0, Math.floor(Number(value?.stock)));
        if (!Number.isFinite(stock)) return NextResponse.json({ error: "Invalid stock" }, { status: 400 });
        await prisma.book.updateMany({ where, data: { stock } });
        break;
      }

      // ── Price: set absolute ─────────────────────────────────────────────
      case "price-set": {
        const cur = "priceEgp";
        const amount = Number(value?.amount);
        if (!Number.isFinite(amount) || amount < 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
        await prisma.book.updateMany({ where, data: { [cur]: amount } });
        break;
      }

      // ── Price: adjust by percentage (both currencies) ───────────────────
      case "price-adjust": {
        const percent = Number(value?.percent);
        if (!Number.isFinite(percent)) return NextResponse.json({ error: "Invalid percent" }, { status: 400 });
        const factor = 1 + percent / 100;
        const books = await prisma.book.findMany({ where, select: { id: true, priceEgp: true } });
        await prisma.$transaction(
          books.map((b) =>
            prisma.book.update({
              where: { id: b.id },
              data: {
                // EGP prices in this store are always whole numbers — round to the
                // nearest integer (not just 2dp) so repeated % adjustments can't
                // accumulate binary floating-point noise (e.g. 440.0000000000001).
                priceEgp: Math.max(0, Math.round(Number(b.priceEgp) * factor)),
              },
            })
          )
        );
        break;
      }

      // ── Categories ──────────────────────────────────────────────────────
      case "category-add": {
        const categoryId = value?.categoryId as string;
        if (!categoryId) return NextResponse.json({ error: "categoryId required" }, { status: 400 });
        await prisma.bookCategory.createMany({
          data: (ids as string[]).map((bookId) => ({ bookId, categoryId })),
          skipDuplicates: true,
        });
        break;
      }
      case "category-remove": {
        const categoryId = value?.categoryId as string;
        if (!categoryId) return NextResponse.json({ error: "categoryId required" }, { status: 400 });
        await prisma.bookCategory.deleteMany({ where: { bookId: { in: ids as string[] }, categoryId } });
        break;
      }

      // ── Tags ────────────────────────────────────────────────────────────
      case "tag-add": {
        const name = String(value?.tag ?? "").trim();
        if (!name) return NextResponse.json({ error: "tag required" }, { status: 400 });
        const tag = await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
        await prisma.bookTag.createMany({
          data: (ids as string[]).map((bookId) => ({ bookId, tagId: tag.id })),
          skipDuplicates: true,
        });
        break;
      }
      case "tag-remove": {
        const name = String(value?.tag ?? "").trim();
        if (!name) return NextResponse.json({ error: "tag required" }, { status: 400 });
        const tag = await prisma.tag.findUnique({ where: { name } });
        if (tag) await prisma.bookTag.deleteMany({ where: { bookId: { in: ids as string[] }, tagId: tag.id } });
        break;
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (err) {
    console.error("[bulk]", err);
    return NextResponse.json({ error: "Bulk action failed. Please try again." }, { status: 500 });
  }

  await prisma.auditLog.create({
    data: {
      userEmail: session.user?.email ?? null,
      action: `products.bulk.${action}`,
      entityType: "Book",
      entityId: (ids as string[]).slice(0, 50).join(","),
      after: JSON.stringify({ action, value, count: ids.length }),
    },
  }).catch(() => {});

  revalidatePath("/admin/products");
  revalidatePath("/admin/stationery");
  return NextResponse.json({ ok: true, count: ids.length });
}
