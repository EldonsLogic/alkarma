import Link from "next/link";
import type { BookSummary } from "@/types";

/**
 * The contributor lines under a card title — تأليف / ترجمة / تحرير — with
 * every name its own link, comma-separated when there are several.
 *
 * Authors come from the relation and link by slug. Translator and editor are
 * display strings on the book ("، "-joined when there are several), so they
 * are split on the comma and each name links to its own listing, which
 * matches by substring so a name inside a joined string still resolves.
 *
 * The card that renders this must NOT be an <a> itself: an <a> inside an <a>
 * is invalid HTML, the parser un-nests it, and React then fails to hydrate the
 * whole card. See BookCard for how the card is put together around it.
 */

/** Live prefixes its tile bylines, e.g. "تأليف: ميرنا المهدي". */
const LABELS = { author: "تأليف: ", translator: "ترجمة: ", editor: "تحرير: " } as const;

type Person = { name: string; href: string };

function people(book: BookSummary): { key: keyof typeof LABELS; list: Person[] }[] {
  const seen = new Set<string>();
  const authors: Person[] = (book.authors ?? [])
    .filter((a) => a.name && !seen.has(a.name) && seen.add(a.name))
    .map((a) => ({ name: a.name, href: `/author/${encodeURIComponent(a.slug)}` }));
  // No relation rows — fall back to the denormalised display string, unlinked.
  if (authors.length === 0 && book.author) authors.push({ name: book.author, href: "" });

  const split = (s: string | null | undefined, base: string): Person[] =>
    (s ?? "")
      .split(/[،,]/)
      .map((n) => n.trim())
      .filter(Boolean)
      .map((n) => ({ name: n, href: `${base}/${encodeURIComponent(n)}` }));

  return [
    { key: "author", list: authors },
    { key: "translator", list: split(book.translator, "/translator") },
    { key: "editor", list: split(book.editor, "/editor") },
  ].filter((row) => row.list.length > 0) as { key: keyof typeof LABELS; list: Person[] }[];
}

interface Props {
  book: BookSummary;
  /** Class for each line's <p>. */
  lineClassName: string;
  /** Class for each linked name. */
  linkClassName?: string;
}

export function Byline({ book, lineClassName, linkClassName = "hover:text-brand hover:underline transition-colors" }: Props) {
  return (
    <>
      {people(book).map((row) => (
        <p key={row.key} dir="auto" className={lineClassName}>
          {LABELS[row.key]}
          {row.list.map((person, i) => (
            <span key={person.name}>
              {i > 0 && "، "}
              {person.href ? (
                <Link href={person.href} className={linkClassName}>{person.name}</Link>
              ) : (
                person.name
              )}
            </span>
          ))}
        </p>
      ))}
    </>
  );
}
