/**
 * Slug generator that keeps Latin alphanumerics AND Arabic letters, so Arabic
 * titles produce readable Arabic slugs like "الشمندورة". Whitespace becomes
 * hyphens. Never returns an empty string — falls back to the provided fallback
 * (e.g. an ISBN) or a short random id.
 *
 * Arabic Unicode blocks covered: Arabic (0600–06FF), Supplement (0750–077F),
 * Extended-A (08A0–08FF), Presentation Forms-A (FB50–FDFF) & B (FE70–FEFF).
 */
const KEEP = "a-z0-9؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿";
const DROP_RE = new RegExp(`[^${KEEP}\\s-]`, "g");
const DROP_FALLBACK_RE = new RegExp(`[^${KEEP}-]`, "g");

/**
 * Decode a dynamic-route slug param. Next.js passes non-Latin slugs
 * percent-encoded (e.g. "%D8%B1..."), so an Arabic slug must be decoded
 * before it matches the value stored in the DB. Safe on already-decoded input.
 */
export function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

export function toSlug(input: string, fallback = ""): string {
  const s = (input ?? "")
    .trim()
    .toLowerCase()
    .replace(DROP_RE, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);

  if (s) return s;

  const fb = (fallback ?? "").toLowerCase().replace(DROP_FALLBACK_RE, "");
  return fb || `item-${Math.random().toString(36).slice(2, 8)}`;
}
