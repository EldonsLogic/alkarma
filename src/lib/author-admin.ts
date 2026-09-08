import { prisma } from "./prisma";
import { toSlug } from "./slug";

/**
 * Author resolution for admin create/edit + bulk import + backfill.
 *
 * Books store the author name as plain text (`Book.author`) for display, but a
 * clickable author page requires a linked `Author` record (`Book.authorId`).
 * Bulk-uploaded books historically set only the text, so their authors weren't
 * clickable. `resolveAuthorId` find-or-creates the matching Author so the link
 * works everywhere the storefront already maps `authorRef.slug`.
 */

/** Produce an Author slug unique across the Author table (Arabic-safe). */
export async function uniqueAuthorSlug(base: string): Promise<string> {
  const root = toSlug(base);
  let slug = root;
  let n = 2;
  // eslint-disable-next-line no-await-in-loop
  while (await prisma.author.findFirst({ where: { slug }, select: { id: true } })) {
    slug = `${root}-${n++}`;
  }
  return slug;
}

/**
 * Find (case-insensitively, by English or Arabic name) or create an Author for
 * the given name. Returns its id, or null for empty input.
 *
 * `language` seeds `nameAr` when the book is Arabic so Arabic authors render
 * their Arabic name on the author page.
 */
export async function resolveAuthorId(
  name: string | null | undefined,
  language = "en",
): Promise<string | null> {
  const clean = (name ?? "").trim().replace(/\s+/g, " ");
  if (!clean) return null;

  const existing = await prisma.author.findFirst({
    where: {
      OR: [
        { name: { equals: clean, mode: "insensitive" } },
        { nameAr: { equals: clean, mode: "insensitive" } },
      ],
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const slug = await uniqueAuthorSlug(clean);
  const created = await prisma.author.create({
    data: {
      slug,
      name: clean,
      nameAr: language === "ar" ? clean : null,
    },
    select: { id: true },
  });
  return created.id;
}

/**
 * Parse a raw author cell into its author name(s), translator, and editor.
 *
 * - Authors are separated with EITHER "|" or an Arabic comma "، "
 *   ("Author A | Author B" or "Author A، Author B") — "، " is also what this
 *   module itself joins multiple author names with when writing Book.author
 *   for display (see syncBookAuthors below), so a book exported and
 *   reimported must parse its own output the same way, or a two-author book
 *   collapses back into one combined "author" on reimport.
 * - A translator and/or editor may be appended with a "/", Egyptian-bookstore
 *   style:
 *       "لوك راسل / ترجمة: محمد هوجلا-كلفت"        (translator)
 *       "حسين أمين / تحرير: كمال صلاح"             (editor)
 *       "X | Y / ترجمة: Z / تحرير: W"            (both)
 *   Those role parts are split out so the author stays clean.
 */
export function parseAuthorField(raw: string | null | undefined): {
  authors: string[];
  translator: string | null;
  editor: string | null;
} {
  const text = (raw ?? "").trim();
  if (!text) return { authors: [], translator: null, editor: null };

  const segments = text.split("/").map((s) => s.trim()).filter(Boolean);
  let translator: string | null = null;
  let editor: string | null = null;
  const authorSegs: string[] = [];

  // Role markers are recognised in ANY segment position — not just after the
  // first "/" — because some cells have no author at all, only role-labelled
  // people, e.g. "تحرير: جاك حاسون" or "تحرير: X / تصوير: Y" as the ENTIRE
  // author cell. Requiring a preceding author segment silently turned
  // "تحرير: ..." itself into a bogus author name.
  segments.forEach((seg) => {
    const tr = seg.match(/^(?:ترجم[ةه]|translat(?:ion|ed by))\s*[:：]?\s*(.+)$/i);
    const ed = seg.match(/^(?:تحرير|edit(?:ed by|or))\s*[:：]?\s*(.+)$/i);
    // "تصوير:" (photography by) has no dedicated field on Book — drop the
    // segment rather than let it become a fake "author".
    const ph = seg.match(/^(?:تصوير|photo(?:graph(?:y|s|ed by))?)\s*[:：]?\s*(.+)$/i);
    if (tr) translator = tr[1].trim() || null;
    else if (ed) editor = ed[1].trim() || null;
    else if (ph) { /* photographer — no field to store it in; intentionally dropped */ }
    else authorSegs.push(seg);
  });

  const authors = authorSegs
    .join(" / ")
    .split(/\||،\s*/) // "|" or an Arabic comma (with or without trailing space)
    .map((s) => s.trim().replace(/\s+/g, " "))
    .filter(Boolean);

  return { authors, translator, editor };
}

/**
 * Sync a book's authors + translator from a raw author string. Rebuilds the
 * BookAuthor links, sets the primary `authorId` (first author), rewrites the
 * denormalized `author` display to the clean joined names, and stores the
 * parsed `translator`. Shared by backfill, single-form save, and bulk import.
 */
export async function syncBookAuthors(
  bookId: string,
  rawAuthor: string | null | undefined,
  language = "en",
  explicitTranslator?: string | null,
  explicitEditor?: string | null,
): Promise<{ authorIds: string[]; translator: string | null; editor: string | null }> {
  const parsed = parseAuthorField(rawAuthor);
  const authors = parsed.authors;
  // An explicit translator/editor field/column wins; otherwise use the one
  // parsed out of the author string ("… / ترجمة: …", "… / تحرير: …").
  const translator =
    explicitTranslator !== undefined
      ? explicitTranslator?.trim() || null
      : parsed.translator;
  const editor =
    explicitEditor !== undefined
      ? explicitEditor?.trim() || null
      : parsed.editor;

  const authorIds: string[] = [];
  for (const name of authors) {
    const id = await resolveAuthorId(name, language);
    if (id && !authorIds.includes(id)) authorIds.push(id);
  }

  await prisma.bookAuthor.deleteMany({ where: { bookId } });
  if (authorIds.length > 0) {
    await prisma.bookAuthor.createMany({
      data: authorIds.map((authorId, i) => ({ bookId, authorId, position: i })),
      skipDuplicates: true,
    });
  }

  const sep = language === "ar" ? "، " : ", ";
  await prisma.book.update({
    where: { id: bookId },
    data: {
      author: authors.join(sep),
      authorId: authorIds[0] ?? null,
      translator,
      editor,
    },
  });

  return { authorIds, translator, editor };
}
