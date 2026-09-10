"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * Top-of-page loading bar for client-side navigation.
 *
 * The App Router handles <Link> clicks itself, so the browser never shows its
 * own loading indicator — no spinner in the tab, no progress in the address
 * bar. Without a Suspense boundary Next also keeps the current page on screen
 * until the whole server tree has rendered. The result is a click that appears
 * to do nothing, then a page that appears all at once.
 *
 * This gives the click immediate feedback: the bar starts on any same-origin
 * link click and finishes when the pathname actually changes.
 *
 * Uses only usePathname on purpose — useSearchParams would force every route
 * that renders this into dynamic rendering unless it were wrapped in its own
 * Suspense boundary, and query-only changes (sort, filters, paging) are
 * already handled by the listing UI's own pending state.
 */
export function NavProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const creep = useRef<ReturnType<typeof setInterval> | null>(null);
  const hide = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stop = useCallback(() => {
    if (creep.current) { clearInterval(creep.current); creep.current = null; }
  }, []);

  const start = useCallback(() => {
    if (hide.current) { clearTimeout(hide.current); hide.current = null; }
    stop();
    setVisible(true);
    setWidth(8);
    // Ease toward 90% and wait there — the real completion sets 100%.
    creep.current = setInterval(() => {
      setWidth((w) => (w >= 90 ? w : w + Math.max(0.5, (90 - w) * 0.12)));
    }, 120);
  }, [stop]);

  // Finish whenever the route settles on a new pathname.
  useEffect(() => {
    stop();
    setWidth((w) => (w > 0 ? 100 : 0));
    hide.current = setTimeout(() => { setVisible(false); setWidth(0); }, 260);
    return () => { if (hide.current) clearTimeout(hide.current); };
  }, [pathname, stop]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const anchor = (e.target as HTMLElement | null)?.closest?.("a");
      if (!anchor) return;
      if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const raw = anchor.getAttribute("href");
      if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:")) return;
      let url: URL;
      try { url = new URL(anchor.href, window.location.href); } catch { return; }
      if (url.origin !== window.location.origin) return;
      // Same page — nothing will load, so don't imply that something is.
      if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      start();
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  useEffect(() => () => stop(), [stop]);

  if (!visible) return null;

  return (
    <div
      aria-hidden
      className="fixed top-0 inset-x-0 z-[200] h-[3px] pointer-events-none"
    >
      <div
        className="h-full bg-brand transition-[width,opacity] duration-200 ease-out shadow-[0_0_8px_rgba(255,0,0,0.5)]"
        style={{ width: `${width}%`, opacity: width >= 100 ? 0 : 1 }}
      />
    </div>
  );
}
