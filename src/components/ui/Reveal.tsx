"use client";

import { useEffect, useRef, useState } from "react";

interface Props {
  children: React.ReactNode;
  className?: string;
  /** Extra delay before this element reveals, in ms (for light staggering). */
  delay?: number;
  /** When true, the element's direct children cascade in one after another. */
  stagger?: boolean;
}

/**
 * Reveals its children with a subtle fade + rise the first time they scroll
 * into view. Pure CSS transition driven by an IntersectionObserver — no
 * animation library. Degrades gracefully: without JS the content is visible
 * (the hiding styles are scoped to `html.js`), and it honours
 * prefers-reduced-motion via the stylesheet.
 */
export function Reveal({ children, className = "", delay = 0, stagger = false }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    // Anything already on screen when this mounts is shown outright rather
    // than waiting on the observer's first delivery — content that is visible
    // at first paint should never depend on a callback to appear.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setShown(true);
            io.disconnect();
            break;
          }
        }
      },
      // threshold 0 — any visible pixel counts. This used to be 0.1 with an 8%
      // bottom margin, which reads as "10% of the element is on screen". A
      // homepage rail is one Reveal ~1500px tall on desktop and ~3000px on a
      // phone; the strip of it visible under the hero on first paint was often
      // under 10%, so the observer never fired and the page stopped at the hero
      // until the user scrolled or touched the screen. A tall element must
      // reveal as soon as its top edge is in view.
      { threshold: 0, rootMargin: "0px 0px -40px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const base = stagger ? "reveal-stagger" : "reveal";
  return (
    <div
      ref={ref}
      className={`${base}${shown ? " reveal-in" : ""}${className ? " " + className : ""}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
