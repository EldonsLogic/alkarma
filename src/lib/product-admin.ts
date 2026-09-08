import { prisma } from "./prisma";
import { toSlug } from "./slug";

/**
 * Produce a slug that is unique across the Book table.
 * `base` is the title, `fallback` an ISBN (for Arabic-only titles).
 */
export async function uniqueBookSlug(base: string, fallback = "", excludeId?: string): Promise<string> {
  const root = toSlug(base, fallback);
  let slug = root;
  let n = 1;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.book.findUnique({ where: { slug }, select: { id: true } });
    if (!existing || existing.id === excludeId) break;
    slug = `${root}-${n++}`;
  }
  return slug;
}

/**
 * Replace a product's tags from a free-text field.
 * Accepts comma- or pipe-separated names (e.g. publishers, labels).
 * Upserts each Tag by name and rewires the BookTag links.
 *
 * `autoTags` (publisher, translator) are always merged in on top of whatever
 * the tags field contains — publishers and translators are tagged by default
 * so their books stay discoverable/clickable via the tag even if the tags
 * field itself was left blank or edited.
 */
export async function syncTags(
  bookId: string,
  tagsInput: string | null | undefined,
  autoTags: { publisher?: string | null; translator?: string | null } = {}
): Promise<void> {
  const names = [
    ...(tagsInput ?? "").split(/[|,]/),
    autoTags.publisher ?? "",
    autoTags.translator ?? "",
  ]
    .map((t) => t.trim())
    .filter(Boolean)
    // de-dupe (case-insensitive)
    .filter((t, i, arr) => arr.findIndex((x) => x.toLowerCase() === t.toLowerCase()) === i);

  await prisma.bookTag.deleteMany({ where: { bookId } });
  for (const name of names) {
    const tag = await prisma.tag.upsert({
      where: { name },
      update: {},
      create: { name },
    });
    await prisma.bookTag.create({ data: { bookId, tagId: tag.id } }).catch(() => {});
  }
}

/** Comma-joined tag names for pre-filling the edit form. */
export function tagsToString(tags: { tag: { name: string } }[]): string {
  return tags.map((t) => t.tag.name).join(", ");
}
