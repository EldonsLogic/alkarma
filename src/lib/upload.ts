import crypto from "crypto";
import { COVER_CACHE_SECONDS } from "@/lib/coverKey";

// Largest file a user may SELECT. We compress server-side, so this only needs
// to be generous enough for publisher-supplied covers (usually 1–4 MB).
const MAX_SIZE = Number(process.env.MAX_FILE_SIZE ?? 10 * 1024 * 1024); // 10 MB

/** Every stored image must end up under this. Book covers land far below it. */
export const TARGET_MAX_BYTES = 300 * 1024; // 300 KB

/**
 * Compress an image to WebP under TARGET_MAX_BYTES.
 * Steps quality (and then dimensions) down until it fits.
 *
 * THROWS if sharp is unavailable — never silently returns the original, which
 * previously caused multi-MB JPEGs to be stored under a ".webp" name.
 */
export async function optimise(
  buffer: Buffer,
  maxW = 800,
  maxH = 1200
): Promise<Buffer> {
  let sharp: typeof import("sharp");
  try {
    sharp = (await import("sharp")).default as unknown as typeof import("sharp");
  } catch (err) {
    throw new Error(
      "Image compression is unavailable (sharp failed to load), so the upload was rejected " +
        "rather than storing an uncompressed file. " + (err as Error).message
    );
  }

  // Try progressively smaller quality, then smaller dimensions.
  for (const [w, h] of [[maxW, maxH], [600, 900], [400, 600]] as const) {
    for (const quality of [80, 70, 60, 50]) {
      const out = await sharp(buffer)
        .rotate() // honour EXIF orientation before stripping metadata
        .resize(w, h, { fit: "inside", withoutEnlargement: true })
        .webp({ quality })
        .toBuffer();
      if (out.byteLength <= TARGET_MAX_BYTES) return out;
    }
  }

  // Last resort — smallest sensible cover; return whatever we achieved.
  return sharp(buffer)
    .rotate()
    .resize(400, 600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 45 })
    .toBuffer();
}

/**
 * Persist a buffer as a public image and return its URL.
 * Used internally by saveUpload and saveUploadBuffer.
 *
 * With a `pathname` the file is written to exactly that key and overwrites
 * whatever is there — this is how a book's cover stays at covers/<isbn>.webp
 * across replacements (see lib/coverKey). Without one it gets a random name
 * under uploads/, as before.
 */
async function persist(buffer: Buffer, filename: string, pathname?: string): Promise<string> {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const { url } = await put(pathname ?? `uploads/${filename}`, buffer, {
      access: "public",
      contentType: "image/webp",
      ...(pathname
        ? { addRandomSuffix: false, allowOverwrite: true, cacheControlMaxAge: COVER_CACHE_SECONDS }
        : {}),
    });
    return url;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "Image uploads require Vercel Blob storage. " +
        "Go to vercel.com → your project → Storage → Create Blob store, " +
        "then add BLOB_READ_WRITE_TOKEN to your Environment Variables and redeploy."
    );
  }

  // Local dev — write to public/uploads/
  const { writeFile, mkdir } = await import("fs/promises");
  const { default: path } = await import("path");
  const dir = path.resolve(process.env.UPLOAD_DIR ?? "./public/uploads");
  await mkdir(dir, { recursive: true });
  const local = pathname ? pathname.replace(/\//g, "_") : filename;
  await writeFile(path.join(dir, local), buffer);
  return `/uploads/${local}`;
}

/**
 * Save an uploaded File (from a form/multipart request).
 * Optimises the image before persisting.
 */
export async function saveUpload(file: File, opts: { pathname?: string } = {}): Promise<{ url: string; size: number }> {
  if (!file.type.startsWith("image/")) {
    throw new Error("File type not allowed. Please upload an image file (JPG, PNG or WebP).");
  }
  if (file.size > MAX_SIZE) {
    throw new Error(
      `"${file.name}" is ${(file.size / 1024 / 1024).toFixed(1)} MB — the maximum upload size is ` +
        `${Math.round(MAX_SIZE / 1024 / 1024)} MB. Please use a smaller image.`
    );
  }

  const raw = Buffer.from(await file.arrayBuffer());
  const optimised = await optimise(raw);
  const name = `${crypto.randomBytes(16).toString("hex")}.webp`;
  const url = await persist(optimised, name, opts.pathname);
  return { url, size: optimised.byteLength };
}

/**
 * Save a raw image buffer (used during bulk zip import).
 * Optimises the image before persisting.
 */
export async function saveUploadBuffer(buffer: Buffer): Promise<string> {
  const optimised = await optimise(buffer);
  const name = `${crypto.randomBytes(16).toString("hex")}.webp`;
  return persist(optimised, name);
}
