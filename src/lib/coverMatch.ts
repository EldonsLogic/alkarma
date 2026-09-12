import { prisma } from "@/lib/prisma";
import { toSlug } from "@/lib/slug";

/**
 * Matching a Media Library file to the book it is the cover of.
 *
 * The rule is the one the importer and the "Match Covers to Products" button
 * already use — the file's name stem against the book's ISBN, then its slug,
 * then its title, each compared loosely (case, spaces, dots and dashes
 * ignored). This module is what lets that happen the moment a file is
 * uploaded or renamed, instead of only when somebody remembers to press the
 * bulk button afterwards.
 */

/** Same normalisation the importer uses for filename matching. */
export const normForMatch = (s: string) => String(s).toLowerCase().replace(/[-\s.]/g, "");

const stemOf = (filename: string) => filename.replace(/\.[^.]+$/, "");

type Candidate = { id: string; title: string; isbn: string | null; slug: string; coverUrl: string };

/** The book a file of this name is the cover of, or null. */
export async function findBookForFilename(filename: string): Promise<Candidate | null> {
  const stem = stemOf(filename).trim();
  if (!stem) return null;
  const key = normForMatch(stem);

  // ISBN is unique and indexed — the cheap, exact route first.
  const byIsbn = await prisma.book.findFirst({
    where: { OR: [{ isbn: stem }, { isbn: stem.replace(/[-\s]/g, "") }] },
    select: { id: true, title: true, isbn: true, slug: true, coverUrl: true },
  });
  if (byIsbn) return byIsbn;

  const bySlug = await prisma.book.findFirst({
    where: { slug: { in: [stem, stem.toLowerCase(), toSlug(stem)] } },
    select: { id: true, title: true, isbn: true, slug: true, coverUrl: true },
  });
  if (bySlug) return bySlug;

  // Title and loose-ISBN matching need the normalised form, which SQL can't
  // produce — scan the catalogue's titles (a few thousand short rows).
  const books = await prisma.book.findMany({ select: { id: true, title: true, isbn: true, slug: true, coverUrl: true } });
  return (
    books.find((b) => b.isbn && normForMatch(b.isbn) === key) ??
    books.find((b) => normForMatch(b.slug) === key) ??
    books.find((b) => normForMatch(b.title) === key) ??
    null
  );
}

/**
 * Attach a just-uploaded (or just-renamed) file to its book. Unlike the bulk
 * button, this DOES replace an existing cover: uploading a file named after a
 * book is an explicit "this is its cover now", and replacing a cover was
 * exactly the case that used to need delete → upload → button.
 */
export async function attachCoverByFilename(filename: string, url: string): Promise<{ id: string; title: string; replaced: boolean } | null> {
  const book = await findBookForFilename(filename);
  if (!book) return null;
  if (book.coverUrl === url) return { id: book.id, title: book.title, replaced: false };
  await prisma.book.update({ where: { id: book.id }, data: { coverUrl: url } });
  return { id: book.id, title: book.title, replaced: !!book.coverUrl && !book.coverUrl.includes("placeholder") };
}
