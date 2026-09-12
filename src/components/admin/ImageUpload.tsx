"use client";

import { useState, useRef } from "react";

interface Props {
  name: string;
  defaultValue?: string;
  label?: string;
  shape?: "cover" | "square" | "banner"; // cover = 2:3, square = circle, banner = wide
  dimensions?: string; // e.g. "400 × 600 px"
  dimensionsNote?: string; // extra context e.g. "(2 : 3 ratio — portrait)"
  onUrlChange?: (url: string) => void; // notify parent when URL changes
  maxSizeMB?: number; // upload limit in megabytes (default 1 MB)
  /** When set, the upload is stored as this book's cover at its fixed key. */
  bookId?: string;
}

const DEFAULT_MAX_MB = 1;

export function ImageUpload({
  name,
  defaultValue = "",
  label = "Image",
  shape = "cover",
  dimensions,
  dimensionsNote,
  onUrlChange,
  maxSizeMB = DEFAULT_MAX_MB,
  bookId,
}: Props) {
  const [url, setUrl] = useState(defaultValue);

  function setUrlAndNotify(newUrl: string) {
    setUrl(newUrl);
    onUrlChange?.(newUrl);
  }
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    // Reject oversized files before uploading, so we never hit the server's
    // body-size limit (which returns a non-JSON "Request Entity Too Large").
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setError(
        `This image is ${sizeMb} MB — the limit is ${maxSizeMB} MB. Please compress or resize it and try again (try tinypng.com or Squoosh).`
      );
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      if (bookId) fd.append("bookId", bookId);
      const res = await fetch("/api/upload", { method: "POST", body: fd });

      // Read the body defensively — an error response may be plain text/HTML
      // (e.g. a size-limit rejection), not JSON.
      const raw = await res.text();
      let data: { url?: string; error?: string } = {};
      try { data = raw ? JSON.parse(raw) : {}; } catch { /* non-JSON body */ }

      if (!res.ok || !data.url) {
        if (res.status === 413 || /request entity too large/i.test(raw)) {
          throw new Error(
            `The image is too large to upload. Please keep it under ${maxSizeMB} MB and try again.`
          );
        }
        throw new Error(data.error || "Upload failed. Please try a different image.");
      }
      setUrlAndNotify(data.url);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  // "No cover" is stored as "" everywhere this project writes it: the upstream
  // /covers/placeholder.jpg is not a real asset here, so persisting that path
  // renders a broken image rather than the storefront's title-tile fallback.
  // The /covers/placeholder check is kept only to recognise legacy rows.
  const isPlaceholder = !url || url.includes("/covers/placeholder");

  const previewClass =
    shape === "square"
      ? "w-16 h-16 rounded-full"
      : shape === "banner"
      ? "w-[128px] h-[46px] rounded-sm"
      : "w-[64px] h-[96px] rounded-sm";

  return (
    <div>
      <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-2">
        {label}
      </label>

      {/* Hidden input — picked up by parent server-action form on submit */}
      <input type="hidden" name={name} value={url} />

      <div className="flex gap-4 items-start">
        {/* Preview thumbnail */}
        <div
          className={`flex-shrink-0 bg-[#f1f5f9] border border-[#e2e8f0] overflow-hidden flex items-center justify-center ${previewClass}`}
        >
          {!isPlaceholder ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt="" className="w-full h-full object-cover" />
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#cbd5e1"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          )}
        </div>

        {/* Controls */}
        <div className="flex-1 min-w-0">
          {/* URL text input */}
          <input
            type="text"
            value={url}
            onChange={(e) => setUrlAndNotify(e.target.value)}
            placeholder="Paste image URL, or upload a file →"
            className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] mb-2"
          />

          {/* Upload row */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              ref={fileRef}
              type="file"
              accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif"
              onChange={handleFile}
              className="hidden"
              id={`upload-${name}`}
            />
            <label
              htmlFor={`upload-${name}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-bold border rounded-sm cursor-pointer select-none transition-colors ${
                uploading
                  ? "border-[#e2e8f0] text-[#94a3b8] cursor-not-allowed pointer-events-none"
                  : "border-[#3b82f6] text-[#3b82f6] hover:bg-blue-50"
              }`}
            >
              {uploading ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-[#3b82f6] border-t-transparent rounded-full animate-spin" />
                  Uploading…
                </>
              ) : (
                <>↑ Upload File</>
              )}
            </label>

            {!isPlaceholder && (
              <button
                type="button"
                onClick={() => setUrlAndNotify("")}
                className="text-[12px] text-[#94a3b8] hover:text-red-500 transition-colors"
              >
                Remove
              </button>
            )}
          </div>

          {error && (
            <p className="text-red-500 text-[12px] mt-1.5">{error}</p>
          )}

          {/* Dimension guideline */}
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            {dimensions && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#475569] bg-[#f1f5f9] border border-[#e2e8f0] px-1.5 py-0.5 rounded">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 3H3v18h18V3z"/><path d="M9 3v18M3 9h6M3 15h6"/>
                </svg>
                {dimensions}
              </span>
            )}
            {dimensionsNote && (
              <span className="text-[11px] text-[#94a3b8]">{dimensionsNote}</span>
            )}
            <span className="text-[11px] text-[#94a3b8]">
              {dimensions ? "·" : ""} JPEG, PNG or WebP · max {maxSizeMB} MB
              <span className="text-[#cbd5e1]"> · aim for ~300 KB for fast loading</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
