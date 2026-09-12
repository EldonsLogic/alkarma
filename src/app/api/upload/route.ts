export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { saveUpload } from "@/lib/upload";
import { prisma } from "@/lib/prisma";
import { findBookForFilename } from "@/lib/coverMatch";
import { stableCoverPathname } from "@/lib/coverKey";

/**
 * POST /api/upload  (multipart: file, optional bookId)
 *
 * Every image upload comes through here — the Media Library and the per-book
 * edit form alike. If the upload is a book's cover — the form said which book,
 * or the filename names one by ISBN / slug / title — it is written to that
 * book's fixed address, covers/<isbn>.webp, overwriting the previous cover in
 * place, and the book is pointed at it. Both stores hold that same URL, so the
 * new cover appears on both (see lib/coverKey). Anything else is a plain
 * library file under a random name.
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const bookId = (formData.get("bookId") as string | null)?.trim() || null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  try {
    const book = bookId
      ? await prisma.book.findUnique({ where: { id: bookId }, select: { id: true, title: true, isbn: true, coverUrl: true } })
      : await findBookForFilename(file.name);

    const pathname = book?.isbn ? stableCoverPathname(book.isbn) : undefined;
    const { url, size } = await saveUpload(file, { pathname });

    // Record in media library (best-effort — don't fail the upload if this errors).
    // A stable cover key already has a row after the first upload; keep it current.
    try {
      await prisma.mediaFile.upsert({
        where: { url },
        update: { filename: file.name, size, uploadedBy: (session as any).user?.email ?? null },
        create: {
          url,
          filename: file.name,
          mimeType: "image/webp", // saveUpload always outputs webp
          size,                   // ACTUAL stored (compressed) size
          uploadedBy: (session as any).user?.email ?? null,
        },
      });
    } catch { /* non-fatal */ }

    let attached: { id: string; title: string; replaced: boolean } | null = null;
    if (book) {
      const replaced = !!book.coverUrl && !book.coverUrl.includes("placeholder") && book.coverUrl !== url;
      if (book.coverUrl !== url) {
        try { await prisma.book.update({ where: { id: book.id }, data: { coverUrl: url } }); } catch { /* non-fatal */ }
      }
      attached = { id: book.id, title: book.title, replaced };
    }

    return NextResponse.json({ url, book: attached });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
