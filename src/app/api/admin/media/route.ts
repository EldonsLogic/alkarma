export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { attachCoverByFilename } from "@/lib/coverMatch";

// DELETE /api/admin/media?id=xxx
export async function DELETE(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const file = await prisma.mediaFile.findUnique({ where: { id }, select: { url: true } });
  await prisma.mediaFile.delete({ where: { id } }).catch(() => {});

  // Books that used this file lose the reference now, rather than keeping a
  // URL to a file the library no longer knows about. A cleared cover is what
  // lets the next upload (or the bulk match) fill it. The blob itself is left
  // in place: the store is shared with Jee, and its rows may still point here.
  const detached = file
    ? (await prisma.book.updateMany({ where: { coverUrl: file.url }, data: { coverUrl: "" } })).count
    : 0;

  return NextResponse.json({ ok: true, detached });
}

// GET /api/admin/media?page=1&q=filename
export async function GET(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1"));
  const q = req.nextUrl.searchParams.get("q")?.trim();
  const limit = 48;

  const where = q ? { filename: { contains: q, mode: "insensitive" as const } } : {};

  const [files, total] = await Promise.all([
    prisma.mediaFile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.mediaFile.count({ where }),
  ]);

  return NextResponse.json({ files, total, pages: Math.ceil(total / limit) });
}

// PATCH /api/admin/media  { id, filename }
export async function PATCH(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id, filename } = await req.json();
  if (!id || !filename?.trim()) return NextResponse.json({ error: "id and filename required" }, { status: 400 });

  const updated = await prisma.mediaFile.update({
    where: { id },
    data: { filename: filename.trim() },
  });

  // Renaming a file to a book's ISBN / slug / title is how a mis-named upload
  // gets attached — so do that here instead of asking for the bulk button.
  let book: { id: string; title: string; replaced: boolean } | null = null;
  try { book = await attachCoverByFilename(updated.filename, updated.url); } catch { /* non-fatal */ }

  return NextResponse.json({ ...updated, book });
}
