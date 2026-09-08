export const dynamic = "force-dynamic";
export const maxDuration = 300; // long-running batch job

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { optimise, TARGET_MAX_BYTES } from "@/lib/upload";

/**
 * GET /api/admin/media/recompress
 *
 * Enumerates every oversized blob ONE TIME. `list()` counts as a Vercel Blob
 * "Advanced Request" (a scarce free-tier quota — 2,000/month); the previous
 * version of this tool called list() again inside EVERY batch, so processing
 * ~330 oversized files in batches of 40 re-scanned the entire ~1,500+ file
 * store roughly a dozen extra times for no reason. Now the scan happens once
 * here, and POST below never calls list() at all.
 */
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN is not configured." }, { status: 400 });
  }

  const { list } = await import("@vercel/blob");
  const blobs: { url: string; pathname: string; size: number }[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ cursor, limit: 1000 });
    page.blobs.forEach((b) => blobs.push({ url: b.url, pathname: b.pathname, size: b.size }));
    cursor = page.cursor;
  } while (cursor);

  const oversized = blobs.filter((b) => b.size > TARGET_MAX_BYTES);
  return NextResponse.json({ scanned: blobs.length, oversized });
}

/**
 * POST /api/admin/media/recompress
 *
 * Re-compresses the given batch of already-enumerated blobs (from GET above).
 * Never calls list() — only the per-file fetch + put needed to compress it.
 *
 * SAFETY: each file is re-uploaded to its EXACT existing pathname with
 * allowOverwrite, so the public URL is unchanged — no book cover can break and
 * no database rows need updating. The oversized original is replaced in place
 * (not left behind). Anything that fails is skipped and reported, never deleted.
 *
 * Body: { blobs: { url, pathname, size }[] } — a slice of the GET response's
 * `oversized` array (keep batches modest — ~40 — to stay under maxDuration).
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "BLOB_READ_WRITE_TOKEN is not configured." }, { status: 400 });
  }

  const { blobs = [] } = await req.json().catch(() => ({ blobs: [] }));
  const { put } = await import("@vercel/blob");

  const results = { processed: 0, savedBytes: 0, failed: [] as string[] };

  for (const blob of blobs as { url: string; pathname: string; size: number }[]) {
    try {
      const res = await fetch(blob.url);
      if (!res.ok) throw new Error(`download failed (${res.status})`);
      const original = Buffer.from(await res.arrayBuffer());

      const compressed = await optimise(original);

      // Only replace if we genuinely made it smaller
      if (compressed.byteLength >= original.byteLength) {
        results.failed.push(`${blob.pathname}: already optimal`);
        continue;
      }

      // Overwrite IN PLACE — identical pathname keeps the identical public URL
      const { url: newUrl } = await put(blob.pathname, compressed, {
        access: "public",
        contentType: "image/webp",
        addRandomSuffix: false,
        allowOverwrite: true,
      });

      // Paranoia: if the URL somehow changed, repoint every reference to it
      if (newUrl !== blob.url) {
        await prisma.$transaction([
          prisma.book.updateMany({ where: { coverUrl: blob.url }, data: { coverUrl: newUrl } }),
          prisma.mediaFile.updateMany({ where: { url: blob.url }, data: { url: newUrl } }),
        ]);
      }

      await prisma.mediaFile.updateMany({
        where: { url: newUrl },
        data: { size: compressed.byteLength, mimeType: "image/webp" },
      }).catch(() => {});

      results.processed++;
      results.savedBytes += original.byteLength - compressed.byteLength;
    } catch (err) {
      results.failed.push(`${blob.pathname}: ${(err as Error).message}`);
    }
  }

  return NextResponse.json({
    ok: true,
    ...results,
    savedMb: +(results.savedBytes / 1048576).toFixed(2),
    message: `Compressed ${results.processed} of ${blobs.length} this batch (saved ${(results.savedBytes / 1048576).toFixed(1)} MB).`,
  });
}
