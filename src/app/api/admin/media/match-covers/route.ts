export const dynamic = "force-dynamic";
export const maxDuration = 120;

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";
import { normForMatch as norm } from "@/lib/coverMatch";

/**
 * POST /api/admin/media/match-covers
 *
 * Assigns covers from the Media Library to products that have none. Uploads
 * and renames attach themselves as they happen (see lib/coverMatch), so this
 * is the catch-all for files that arrived before their books did — e.g. a
 * product import after the covers were already in the library.
 *
 * Matches by ISBN, then by title (both normalised) — the same priority the
 * importer uses. Only ever fills in a missing cover; never overwrites one.
 */
export async function POST() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [books, media] = await Promise.all([
    prisma.book.findMany({ select: { id: true, title: true, isbn: true, coverUrl: true } }),
    prisma.mediaFile.findMany({ select: { filename: true, url: true } }),
  ]);

  // filename stem -> url (raw + normalised keys)
  const map = new Map<string, string>();
  for (const m of media) {
    const stem = m.filename.replace(/\.[^.]+$/, "");
    map.set(stem.toLowerCase(), m.url);
    map.set(norm(stem), m.url);
  }

  const needsCover = books.filter((b) => !b.coverUrl || b.coverUrl.includes("placeholder"));

  let matched = 0;
  const unmatched: string[] = [];

  for (const b of needsCover) {
    const url =
      (b.isbn && (map.get(b.isbn.toLowerCase()) ?? map.get(norm(b.isbn)))) ||
      map.get(toSlug(b.title).toLowerCase()) ||
      map.get(norm(b.title));

    if (url) {
      await prisma.book.update({ where: { id: b.id }, data: { coverUrl: url } });
      matched++;
    } else {
      unmatched.push(b.isbn ? `${b.title} (${b.isbn})` : b.title);
    }
  }

  return NextResponse.json({
    ok: true,
    checked: needsCover.length,
    matched,
    stillMissing: unmatched.length,
    unmatched: unmatched.slice(0, 50),
    message:
      `${needsCover.length} product(s) had no cover · matched ${matched} from the Media Library · ` +
      `${unmatched.length} still need an image uploaded.`,
  });
}
