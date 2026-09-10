/**
 * Route a cover through /api/cover, which trims the white padding a third of
 * the catalogue was uploaded with. See that route for why this is done at
 * render time rather than by rewriting the files.
 *
 * Anything that is not one of our blob URLs (a local placeholder, an empty
 * value) is passed straight through.
 */
export function coverSrc(url: string | null | undefined): string {
  if (!url) return "";
  if (!url.startsWith("https://") || !url.includes(".public.blob.vercel-storage.com")) return url;
  return `/api/cover?src=${encodeURIComponent(url)}`;
}
