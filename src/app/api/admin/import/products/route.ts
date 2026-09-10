export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveUploadBuffer } from "@/lib/upload";
import { toSlug as makeSlug } from "@/lib/slug";
import { syncTags } from "@/lib/product-admin";
import { syncBookAuthors } from "@/lib/author-admin";
import { notifyBackInStock } from "@/lib/stock";
import * as XLSX from "xlsx";

// Returns a blank template CSV
export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Matches the Export CSV column-for-column (minus "slug" — the export's own
  // slug is only needed to preserve an existing book's URL, which happens
  // automatically via ISBN matching; a fresh upload doesn't need it) so a
  // round-trip of export → edit → reimport can carry every field without loss.
  const headers = [
    "title",
    "subtitle",
    "synopsis",
    "isbn", "author", "translator", "editor", "publisher", "publishDate", "pageCount", "language",
    "coverUrl", "images",
    "priceEgp", "compareAtEgp",
    "stock", "lowStockAt", "weight",
    "isActive", "isFeatured", "isBestseller", "isNewRelease",
    "ageRange", "categories", "tags",
  ];

  // Notes:
  //   title          — the book title in whatever language the book is (single language)
  //   synopsis       — the book description. (An older "description" column name is
  //                    also still accepted, for backward compatibility.)
  //   author         — multiple authors may be separated with either "|" or an
  //                    Arabic comma "، " (both are accepted — Author A|Author B or
  //                    Author A، Author B). A translator/editor may be appended, e.g.
  //                    "لوك راسل / ترجمة: محمد كلفت" or "حسين أمين / تحرير: كمال صلاح"
  //                    (or use the dedicated translator/editor columns below).
  //   translator     — optional; overrides any translator appended to the author cell
  //   editor         — optional (تحرير); overrides any editor appended to the author cell
  //   priceEgp       — regular price (EGP)
  //   compareAtEgp   — OPTIONAL discounted (sale) price, lower than the
  //                    regular price; the storefront shows it with the regular
  //                    price struck-through
  //   coverUrl       — leave blank to auto-match a cover from the Media Library
  //                    (or an uploaded images zip) by title or ISBN
  //   images         — OPTIONAL extra gallery photos beyond the cover, pipe-separated
  //                    URLs in display order. Leave blank to keep existing photos as-is
  //                    (blank never deletes them — only a non-blank value replaces them).
  //   weight         — optional shipping weight in grams
  //   categories     — pipe-separated; each may be a slug, English name, or Arabic
  //                    name, e.g. Fiction|روايات (a subcategory also adds its parent;
  //                    unknowns skipped with a warning)
  //   tags           — pipe- or comma-separated; use for publisher and any labels,
  //                    e.g. دار الكرمة|Award-winning. Leave blank on an EXISTING book to
  //                    keep its current tags untouched (blank never wipes tags) — only a
  //                    non-blank value replaces them. Publisher & translator are always
  //                    added as tags automatically whenever tags ARE set (or on a new book).
  const example = [
    "The Alchemist",
    "A fable about following your dream",
    "A young shepherd travels from Spain to Egypt seeking treasure...",
    "978-0-06-112008-4", "Paulo Coelho", "", "", "HarperCollins", "1988-01-01", "208", "en",
    "", "",
    "199.99", "6.99", "249.99", "8.99",
    "50", "5", "",
    "true", "false", "true", "false",
    "", "Fiction|Literature & Fiction", "HarperCollins|Award-winning",
  ];

  const csv = [headers.join(","), example.join(",")].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=\"books-import-template.csv\"",
    },
  });
}

// ─── Image map helpers ────────────────────────────────────────────────────────

/**
 * Normalise a string for image filename matching:
 * lowercase, strip hyphens/spaces/dots → pure alphanumeric
 */
function normalise(s: string): string {
  return s.toLowerCase().replace(/[-\s.]/g, "");
}

/**
 * Build title → slug the same way the import does, for fallback matching.
 */
function toSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 80);
}

/**
 * Clean an ISBN cell value. Excel stores long numeric ISBNs as numbers and
 * displays them in scientific notation (e.g. 9.78006E+12). Reading the RAW
 * numeric value preserves the exact 13 digits (they're within JS's safe
 * integer range), which we then render as a plain digit string.
 */
function cleanIsbn(raw: unknown): string {
  if (raw == null || raw === "") return "";
  if (typeof raw === "number" && Number.isFinite(raw)) {
    return Number.isInteger(raw) ? BigInt(raw).toString() : String(raw);
  }
  let s = String(raw).trim();
  // Best-effort: expand scientific notation if it slipped through as a string
  if (/^\d+(\.\d+)?[eE][+-]?\d+$/.test(s)) {
    const n = Number(s);
    if (Number.isFinite(n)) s = BigInt(Math.round(n)).toString();
  }
  return s.replace(/[^0-9Xx]/g, ""); // keep digits + the ISBN-10 check char
}

/**
 * Extract a zip file and upload every image inside it to storage.
 * Returns a Map of normalised key → public URL.
 * Keys stored:
 *   - raw filename stem (e.g. "the-alchemist")
 *   - normalised stem  (e.g. "thealchemist")
 */
async function buildImageMap(zipBuffer: Buffer): Promise<Map<string, string>> {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(zipBuffer);
  const imageMap = new Map<string, string>();
  const IMAGE_EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

  const uploads: Promise<void>[] = [];

  zip.forEach((relativePath, entry) => {
    if (entry.dir) return;
    const basename = relativePath.split("/").pop() ?? relativePath;
    if (!IMAGE_EXT.test(basename)) return;

    const stem = basename.replace(/\.[^.]+$/, ""); // strip extension

    uploads.push(
      entry.async("nodebuffer").then(async (buf) => {
        try {
          const url = await saveUploadBuffer(buf);
          imageMap.set(stem.toLowerCase(), url);
          imageMap.set(normalise(stem), url);
        } catch {
          // Skip files that fail (corrupt images, etc.)
        }
      })
    );
  });

  await Promise.all(uploads);
  return imageMap;
}

/**
 * Build a match-map from the Media Library (MediaFile table) keyed by each
 * file's name stem (raw + normalised), so imports can match covers already
 * uploaded to the gallery — no zip required.
 */
async function buildMediaLibraryMap(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    const files = await prisma.mediaFile.findMany({ select: { filename: true, url: true } });
    for (const f of files) {
      const stem = (f.filename ?? "").replace(/\.[^.]+$/, "").trim();
      if (!stem) continue;
      // First writer wins so the earliest upload is preferred on duplicate names
      if (!map.has(stem.toLowerCase())) map.set(stem.toLowerCase(), f.url);
      if (!map.has(normalise(stem))) map.set(normalise(stem), f.url);
    }
  } catch {
    // Media library unavailable — just return empty so import still works
  }
  return map;
}

/**
 * Given an image map and a CSV row, return the best matching image URL or null.
 * Match priority: explicit slug → title slug → ISBN (normalised)
 */
function findImage(
  map: Map<string, string>,
  slug: string,
  title: string,
  isbn: string
): string | null {
  // 1. Explicit slug column
  if (slug && map.has(slug.toLowerCase())) return map.get(slug.toLowerCase())!;
  if (slug && map.has(normalise(slug))) return map.get(normalise(slug))!;

  // 2. Auto-generated slug from title
  const titleSlug = toSlug(title);
  if (map.has(titleSlug)) return map.get(titleSlug)!;
  if (map.has(normalise(titleSlug))) return map.get(normalise(titleSlug))!;

  // 3. ISBN (with and without hyphens)
  if (isbn) {
    if (map.has(isbn.toLowerCase())) return map.get(isbn.toLowerCase())!;
    if (map.has(normalise(isbn))) return map.get(normalise(isbn))!;
  }

  return null;
}

// ─── Import POST ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const imagesZip = formData.get("images") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided." }, { status: 400 });

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (!["csv", "xlsx", "xls"].includes(ext ?? "")) {
    return NextResponse.json({ error: "Only CSV, XLS, and XLSX files are supported." }, { status: 400 });
  }

  // ── Build image map from zip (if provided) ────────────────────────────────
  let imageMap: Map<string, string> = new Map();
  let imagesUploaded = 0;

  if (imagesZip && imagesZip.size > 0) {
    try {
      const zipBuffer = Buffer.from(await imagesZip.arrayBuffer());
      imageMap = await buildImageMap(zipBuffer);
      imagesUploaded = imageMap.size / 2; // each image adds 2 keys (raw + normalised)
    } catch (err) {
      return NextResponse.json(
        { error: `Failed to process images zip: ${(err as Error).message}` },
        { status: 400 }
      );
    }
  }

  // ── Build match-map from the Media Library (always available) ─────────────
  // Covers already uploaded to the gallery are matched by slug / title / ISBN,
  // so a zip is optional.
  const mediaMap = await buildMediaLibraryMap();

  // ── Category resolver: match by slug, English name, OR Arabic name ────────
  const allCategories = await prisma.category.findMany({
    select: { id: true, slug: true, name: true, nameAr: true, parentId: true },
  });
  const categoryLookup = new Map<string, string>(); // normalised key → category id
  const categoryParent = new Map<string, string | null>(); // id → parentId
  for (const c of allCategories) {
    categoryLookup.set(normalise(c.slug), c.id);
    categoryLookup.set(normalise(c.name), c.id);
    if (c.nameAr) categoryLookup.set(normalise(c.nameAr), c.id);
    categoryParent.set(c.id, c.parentId);
  }
  const resolveCategoryId = (token: string): string | null =>
    categoryLookup.get(normalise(token)) ?? null;
  // Amend B: including a subcategory also includes its parent chain.
  const withParents = (ids: Set<string>): Set<string> => {
    const out = new Set<string>();
    Array.from(ids).forEach((id) => {
      out.add(id);
      let p = categoryParent.get(id) ?? null;
      while (p) {
        out.add(p);
        p = categoryParent.get(p) ?? null;
      }
    });
    return out;
  };

  // ── Parse CSV / XLSX ──────────────────────────────────────────────────────
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer", raw: false, dateNF: "yyyy-mm-dd" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows: Record<string, string>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  // Second pass with RAW values so numeric ISBNs keep their exact digits
  // (the formatted pass turns long numbers into "9.78006E+12").
  const rawValueRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: true });

  if (rawRows.length === 0) {
    return NextResponse.json({ error: "File is empty or has no data rows." }, { status: 400 });
  }

  const results = {
    created: 0,
    updated: 0,
    skipped: 0,
    imagesMatched: 0,
    errors: [] as string[],
  };

  for (let i = 0; i < rawRows.length; i++) {
    const row = rawRows[i];
    const rowNum = i + 2;

    const title  = String(row.title  ?? "").trim();
    const author = String(row.author ?? "").trim();
    const translatorCell = String(row.translator ?? "").trim();
    const editorCell = String(row.editor ?? "").trim();
    const publisher = String(row.publisher ?? "").trim() || null;
    const language = String(row.language ?? "en").trim() || "en";
    const priceEgp = parseFloat(String(row.priceEgp ?? ""));
    // Use the raw cell value for ISBN to dodge Excel's scientific-notation mangling
    const isbn     = cleanIsbn(rawValueRows[i]?.isbn ?? row.isbn);
    const rowSlug  = String(row.slug  ?? "").trim();

    // ── Per-cell validation: collect every problem in this row ──────────────
    const cellErrors: string[] = [];
    if (!title) cellErrors.push("title is required (empty)");
    const numCheck = (col: string, req: boolean) => {
      const raw = String(row[col] ?? "").trim();
      if (raw === "") { if (req) cellErrors.push(`${col} is required (empty)`); return; }
      if (isNaN(parseFloat(raw))) cellErrors.push(`${col} “${raw}” is not a number`);
    };
    numCheck("priceEgp", true);
    numCheck("compareAtEgp", false);
    numCheck("stock", false);
    numCheck("lowStockAt", false);
    numCheck("pageCount", false);
    const pd = String(row.publishDate ?? "").trim();
    if (pd && isNaN(Date.parse(pd))) cellErrors.push(`publishDate “${pd}” is not a valid date (use YYYY-MM-DD)`);
    const ar = String(row.ageRange ?? "").trim();
    if (ar && !["preschool", "5-8", "9-12", "teen"].includes(ar))
      cellErrors.push(`ageRange “${ar}” must be one of preschool, 5-8, 9-12, teen`);

    if (cellErrors.length > 0) {
      results.errors.push(`Row ${rowNum}${title ? ` (${title})` : ""}: ${cellErrors.join("; ")}`);
      results.skipped++;
      continue;
    }

    // Build slug — Arabic-safe (readable Arabic slugs; ISBN fallback)
    let slug = rowSlug;
    if (!slug) {
      slug = makeSlug(title, isbn);
    }

    // Resolve cover URL. Priority:
    //   1. explicit coverUrl column in the sheet
    //   2. image matched from the uploaded zip (by slug/title/ISBN)
    //   3. image matched from the Media Library (by slug/title/ISBN)
    //   4. placeholder
    const csvCoverUrl = String(row.coverUrl ?? "").trim() || null;
    const zippedImageUrl = imageMap.size > 0 ? findImage(imageMap, rowSlug, title, isbn) : null;
    const mediaImageUrl = !zippedImageUrl && mediaMap.size > 0 ? findImage(mediaMap, rowSlug, title, isbn) : null;

    if (zippedImageUrl || mediaImageUrl) results.imagesMatched++;

    const coverUrl = csvCoverUrl ?? zippedImageUrl ?? mediaImageUrl ?? "";

    const data = {
      type: "BOOK",
      title,
      subtitle:   String(row.subtitle    ?? "").trim() || null,
      // Accept both "description" (older custom sheets) and "synopsis" (the
      // admin's own Export CSV column name) — previously only "description"
      // was read, so exporting the catalog and reimporting it silently wiped
      // every synopsis to empty.
      synopsis:   String(row.synopsis ?? row.description ?? "").trim() || "",
      isbn:       isbn || null,
      author,
      publisher,
      publishDate: row.publishDate ? new Date(String(row.publishDate)) : null,
      pageCount:  row.pageCount ? parseInt(String(row.pageCount)) : null,
      language,
      coverUrl,
      priceEgp,
      compareAtEgp: row.compareAtEgp ? parseFloat(String(row.compareAtEgp)) : null,
      stock:      parseInt(String(row.stock     ?? "0")) || 0,
      lowStockAt: parseInt(String(row.lowStockAt ?? "5")) || 5,
      isActive:       String(row.isActive      ?? "true" ).toLowerCase() !== "false",
      isFeatured:     String(row.isFeatured    ?? "false").toLowerCase() === "true",
      isBestseller:   String(row.isBestseller  ?? "false").toLowerCase() === "true",
      isNewRelease:   String(row.isNewRelease  ?? "false").toLowerCase() === "true",
      ageRange: ["preschool", "5-8", "9-12", "teen"].includes(String(row.ageRange ?? "").trim())
        ? String(row.ageRange).trim()
        : null,
      weight: row.weight ? parseInt(String(row.weight)) : null,
    };

    try {
      // Duplicate detection: ISBN is the canonical identifier for a book, so
      // match on it FIRST — a retitled edition (e.g. "هاملت" vs "هاملت — ترجمات
      // الكرمة") is the same book and must update, not fail on the unique ISBN.
      // Fall back to slug for rows without an ISBN.
      const existing =
        (isbn ? await prisma.book.findUnique({ where: { isbn } }) : null) ??
        (await prisma.book.findUnique({ where: { slug } }));

      let bookId: string;
      if (existing) {
        // Update by id and keep the existing slug so live URLs/SEO don't break.
        await prisma.book.update({ where: { id: existing.id }, data });
        bookId = existing.id;
        results.updated++;
        // Restocked (was 0, now in stock) → email waiting customers
        if (existing.stock === 0 && data.stock > 0) {
          await notifyBackInStock(bookId);
        }
      } else {
        let finalSlug = slug;
        let suffix = 1;
        while (await prisma.book.findUnique({ where: { slug: finalSlug } })) {
          finalSlug = `${slug}-${suffix++}`;
        }
        const created = await prisma.book.create({ data: { ...data, slug: finalSlug } });
        bookId = created.id;
        results.created++;
      }

      // Authors (pipe-separated) + translator + editor → linked Author records.
      // Explicit translator/editor columns win; otherwise they're parsed from
      // the author cell ("… / ترجمة: …", "… / تحرير: …").
      await syncBookAuthors(bookId, author, language, translatorCell || undefined, editorCell || undefined);

      // Tags (publisher / labels) — comma or pipe separated. Only touched when
      // the cell has content, same as categories below: a BLANK tags column
      // leaves existing tags alone rather than wiping them, so re-exporting
      // and reimporting a catalogue for an unrelated edit (e.g. fixing a
      // release date) can never silently erase every tag. Publisher &
      // translator are added on top of whatever the cell has, whenever it runs.
      const tagsCell = String(row.tags ?? "").trim();
      if (tagsCell || !existing) {
        // Blank on an UPDATE preserves existing tags; blank on a brand-new
        // book still gets the publisher/translator auto-tags (nothing to lose).
        await syncTags(bookId, tagsCell, { publisher, translator: translatorCell || null });
      }

      // Additional gallery photos beyond the cover (pipe-separated URLs, in
      // order). Same non-destructive rule: blank leaves existing photos alone.
      const imageUrls = String(row.images ?? "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);
      if (imageUrls.length > 0) {
        await prisma.bookImage.deleteMany({ where: { bookId } });
        await prisma.bookImage.createMany({
          data: imageUrls.map((url, i) => ({ bookId, url, position: i })),
        });
      }

      // Handle categories (pipe-separated — slug, English name, or Arabic name)
      const categoryTokens = String(row.categories ?? "")
        .split("|")
        .map((s) => s.trim())
        .filter(Boolean);

      if (categoryTokens.length > 0) {
        const matchedIds = new Set<string>();
        const unmatched: string[] = [];
        for (const token of categoryTokens) {
          const id = resolveCategoryId(token);
          if (id) matchedIds.add(id);
          else unmatched.push(token);
        }
        // Amend B: a subcategory pulls in its parent chain too
        const finalIds = withParents(matchedIds);
        await prisma.bookCategory.deleteMany({ where: { bookId } });
        if (finalIds.size > 0) {
          await prisma.bookCategory.createMany({
            data: Array.from(finalIds).map((categoryId) => ({ bookId, categoryId })),
          });
        }
        // Warn (don't fail) when a category name/slug didn't match anything
        if (unmatched.length > 0) {
          results.errors.push(
            `Row ${rowNum} (${title}): imported, but unknown categor${unmatched.length === 1 ? "y" : "ies"} skipped — ${unmatched.join(", ")}. Create them under Admin → Categories, then re-import.`
          );
        }
      }
    } catch (err) {
      results.errors.push(`Row ${rowNum} (${title}): ${(err as Error).message}`);
      results.skipped++;
    }
  }

  const imageSummary = imagesZip
    ? ` ${results.imagesMatched} of ${Math.round(imagesUploaded)} images matched.`
    : "";

  return NextResponse.json({
    message: `Import complete. ${results.created} created, ${results.updated} updated, ${results.skipped} skipped.${imageSummary}`,
    ...results,
  });
}
