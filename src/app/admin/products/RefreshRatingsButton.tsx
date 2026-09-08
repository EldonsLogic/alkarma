"use client";

import { useState } from "react";

export function RefreshRatingsButton() {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function handleClick() {
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/admin/external-reviews/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setState("done");
      setMsg(data.message ?? "Refresh queued.");
      setTimeout(() => setState("idle"), 6000);
    } catch (err) {
      setState("error");
      setMsg((err as Error).message);
      setTimeout(() => setState("idle"), 5000);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={state === "loading"}
        title="Fetch latest community ratings from Google Books, Open Library & NYT"
        className={`inline-flex items-center gap-1.5 px-4 py-2.5 border text-[13px] font-bold rounded-sm transition-colors ${
          state === "loading"
            ? "border-[#e2e8f0] text-[#94a3b8] cursor-not-allowed"
            : state === "done"
            ? "border-green-300 text-green-700 bg-green-50"
            : state === "error"
            ? "border-red-300 text-red-600 bg-red-50"
            : "border-[#e2e8f0] text-[#64748b] hover:border-[#3b82f6] hover:text-[#3b82f6] bg-white"
        }`}
      >
        {state === "loading" ? (
          <>
            <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
            Refreshing…
          </>
        ) : state === "done" ? (
          <>✓ Queued</>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M23 4v6h-6"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh Ratings
          </>
        )}
      </button>
      {msg && (
        <p className={`text-[11px] max-w-[280px] text-end ${state === "error" ? "text-red-500" : "text-[#64748b]"}`}>
          {msg}
        </p>
      )}
    </div>
  );
}
