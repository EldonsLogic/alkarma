/**
 * Re-compress every oversized image in Vercel Blob, IN PLACE.
 *
 * Safety: each file is re-uploaded to its EXACT existing pathname, so the
 * public URL never changes — no book cover can break and no DB row needs
 * updating. Anything that fails is skipped and reported, never deleted.
 *
 * Usage:
 *   BLOB_READ_WRITE_TOKEN=vercel_blob_rw_xxx node scripts/recompress-blobs.mjs
 *   # add --dry to preview without writing anything
 */
import { list, put } from "@vercel/blob";
import sharp from "sharp";

const TARGET = 300 * 1024; // 300 KB
const DRY = process.argv.includes("--dry");
const token = process.env.BLOB_READ_WRITE_TOKEN;

if (!token) {
  console.error("Missing BLOB_READ_WRITE_TOKEN. Get it from Vercel → Storage → your Blob store → .env.local tab.");
  process.exit(1);
}

async function compress(buf) {
  for (const [w, h] of [[800, 1200], [600, 900], [400, 600]]) {
    for (const quality of [80, 70, 60, 50]) {
      const out = await sharp(buf).rotate()
        .resize(w, h, { fit: "inside", withoutEnlargement: true })
        .webp({ quality }).toBuffer();
      if (out.byteLength <= TARGET) return out;
    }
  }
  return sharp(buf).rotate().resize(400, 600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 45 }).toBuffer();
}

const blobs = [];
let cursor;
do {
  const page = await list({ cursor, limit: 1000, token });
  page.blobs.forEach((b) => blobs.push(b));
  cursor = page.cursor;
} while (cursor);

const oversized = blobs.filter((b) => b.size > TARGET);
console.log(`Scanned ${blobs.length} files · ${oversized.length} oversized (>300 KB)${DRY ? " [DRY RUN]" : ""}\n`);

let done = 0, saved = 0, failed = 0;
for (const b of oversized) {
  try {
    const res = await fetch(b.url);
    if (!res.ok) throw new Error(`download ${res.status}`);
    const original = Buffer.from(await res.arrayBuffer());
    const out = await compress(original);

    if (out.byteLength >= original.byteLength) {
      console.log(`~ skip (already optimal): ${b.pathname}`);
      continue;
    }

    if (!DRY) {
      const { url } = await put(b.pathname, out, {
        access: "public", contentType: "image/webp",
        addRandomSuffix: false, allowOverwrite: true, token,
      });
      if (url !== b.url) throw new Error(`URL CHANGED! ${b.url} -> ${url}`);
    }

    done++; saved += original.byteLength - out.byteLength;
    console.log(`✓ ${(original.byteLength / 1024).toFixed(0).padStart(5)} KB → ${(out.byteLength / 1024).toFixed(0).padStart(4)} KB  ${b.pathname}`);
  } catch (err) {
    failed++;
    console.log(`✗ ${b.pathname}: ${err.message}`);
  }
}

console.log(`\nDone. Compressed ${done}, failed ${failed}. Saved ${(saved / 1048576).toFixed(1)} MB.`);
