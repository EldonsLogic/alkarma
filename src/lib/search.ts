import { prisma } from "./prisma";

/**
 * Arabic/Latin-tolerant product search.
 *
 * Plain `contains` fails for Arabic because stored titles carry diacritics the
 * user never types (e.g. "نظرية بِرما" is not matched by "برما"), and it is
 * case-sensitive for Latin text. We therefore normalise BOTH sides:
 *   - strip harakat (ً-ْ), tatweel (ـ) and superscript alef (ٰ)
 *   - fold alef variants (أ إ آ → ا), ى → ي, ة → ه
 *   - lowercase
 *
 * Returns the matching book ids, which the caller feeds into a normal Prisma
 * query so pagination and other filters keep working.
 */
export function normaliseArabic(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ْـٰ]/g, "") // harakat, tatweel, superscript alef
    .replace(/[أإآ]/g, "ا")  // أ إ آ  → ا
    .replace(/ى/g, "ي")                 // ى → ي
    .replace(/ة/g, "ه")                 // ة → ه
    .trim();
}

// Same transformation applied to a column, in SQL.
const norm = (col: string) =>
  `translate(regexp_replace(lower(COALESCE(${col},'')), '[ً-ْـٰ]', '', 'g'), 'أإآىة', 'ااايه')`;

/**
 * Ids of products matching `q` on title, author, ISBN, publisher, translator,
 * or tag name. `type` optionally restricts to BOOK / STATIONERY / ADOPT.
 */
export async function searchProductIds(q: string, type?: string): Promise<string[]> {
  const needle = `%${normaliseArabic(q)}%`;
  const sql =
    `SELECT DISTINCT b.id FROM "Book" b ` +
    `LEFT JOIN "BookTag" bt ON bt."bookId" = b.id ` +
    `LEFT JOIN "Tag" tg ON tg.id = bt."tagId" ` +
    `WHERE ` +
    (type ? `b.type = $2 AND ` : ``) +
    `(${norm("b.title")} LIKE $1 OR ${norm("b.author")} LIKE $1 OR COALESCE(b.isbn,'') LIKE $1 ` +
    `OR ${norm("b.publisher")} LIKE $1 OR ${norm("b.translator")} LIKE $1 OR ${norm("tg.name")} LIKE $1)`;

  const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
    sql,
    ...(type ? [needle, type] : [needle])
  );
  return rows.map((r) => r.id);
}
