"use client";

/**
 * "آخر المشاهدات" — the visitor's recently viewed books.
 *
 * Stored per-browser in localStorage as a list of slugs, newest first. It is
 * deliberately NOT server-side state: it is a browsing convenience, not
 * account data, and keeping it local means it works for signed-out visitors
 * and never becomes something to migrate or purge.
 */
const KEY = "alkarma-recently-viewed";
const MAX = 12;

export function recordView(slug: string): void {
  if (typeof window === "undefined" || !slug) return;
  try {
    const list = readRecentlyViewed().filter((s) => s !== slug);
    list.unshift(slug);
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch {
    // Private mode / storage disabled — the strip simply won't appear.
  }
}

export function readRecentlyViewed(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === "string") : [];
  } catch {
    return [];
  }
}
