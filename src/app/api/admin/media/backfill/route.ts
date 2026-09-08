export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import path from "path";

export async function POST() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Collect all image URLs from the DB
  const [books, authors, banners, blogPosts] = await Promise.all([
    prisma.book.findMany({ select: { coverUrl: true } }),
    prisma.author.findMany({ select: { photoUrl: true } }),
    prisma.banner.findMany({ select: { imageUrl: true, imageMobileUrl: true } }),
    prisma.blogPost.findMany({ select: { coverUrl: true } }),
  ]);

  const urls = new Set<string>();
  books.forEach((b) => b.coverUrl && urls.add(b.coverUrl));
  authors.forEach((a) => a.photoUrl && urls.add(a.photoUrl));
  banners.forEach((b) => {
    if (b.imageUrl) urls.add(b.imageUrl);
    if (b.imageMobileUrl) urls.add(b.imageMobileUrl);
  });
  blogPosts.forEach((p) => p.coverUrl && urls.add(p.coverUrl));

  // Existing tracked URLs
  const existing = await prisma.mediaFile.findMany({ select: { url: true } });
  const existingSet = new Set(existing.map((e) => e.url));

  const toInsert = Array.from(urls).filter((u) => !existingSet.has(u));

  let inserted = 0;
  for (const url of toInsert) {
    const filename = path.basename(url);
    await prisma.mediaFile.create({
      data: {
        url,
        filename,
        mimeType: url.endsWith(".webp") ? "image/webp" : url.endsWith(".png") ? "image/png" : "image/jpeg",
        size: 0,
      },
    }).catch(() => {}); // skip duplicates
    inserted++;
  }

  return NextResponse.json({ inserted, total: urls.size });
}
