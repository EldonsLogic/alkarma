"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Cloudflare Turnstile widget. Renders nothing (and reports a null token)
 * if NEXT_PUBLIC_TURNSTILE_SITE_KEY is not configured, so forms keep working
 * before keys are added.
 *
 * Calls onToken with the verification token (or null when reset/expired).
 */
declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";

export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  // Load the Turnstile script once
  useEffect(() => {
    if (!SITE_KEY) return;
    if (window.turnstile) { setReady(true); return; }
    if (document.querySelector(`script[src="${SCRIPT_SRC}"]`)) {
      const check = setInterval(() => {
        if (window.turnstile) { setReady(true); clearInterval(check); }
      }, 200);
      return () => clearInterval(check);
    }
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => setReady(true);
    document.head.appendChild(s);
  }, []);

  // Render the widget once the script is ready
  useEffect(() => {
    if (!SITE_KEY || !ready || !ref.current || !window.turnstile) return;
    if (widgetId.current) return;
    widgetId.current = window.turnstile.render(ref.current, {
      sitekey: SITE_KEY,
      callback: (token: string) => onToken(token),
      "expired-callback": () => onToken(null),
      "error-callback": () => onToken(null),
      theme: "light",
    });
    return () => {
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* noop */ }
        widgetId.current = null;
      }
    };
  }, [ready, onToken]);

  if (!SITE_KEY) return null;
  return <div ref={ref} className="my-2" />;
}
