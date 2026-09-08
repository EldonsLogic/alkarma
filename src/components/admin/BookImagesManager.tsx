"use client";

import { useState, useRef } from "react";

/**
 * Manage a book's ADDITIONAL photos (beyond the main coverUrl). Add them one at
 * a time; each URL is emitted as a hidden `extraImages` input so the edit-page
 * server action can sync them. Edit page only — bulk/new keep the single cover.
 */
export function BookImagesManager({ defaultUrls = [] }: { defaultUrls?: string[] }) {
  const [urls, setUrls] = useState<string[]>(defaultUrls);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upload failed");
      setUrls((u) => [...u, data.url as string]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function remove(idx: number) {
    setUrls((u) => u.filter((_, i) => i !== idx));
  }

  return (
    <div>
      {/* Hidden inputs — read by the server action via formData.getAll("extraImages") */}
      {urls.map((u, i) => (
        <input key={i} type="hidden" name="extraImages" value={u} />
      ))}

      <div className="flex flex-wrap gap-2 mb-3">
        {urls.map((u, i) => (
          <div key={i} className="relative w-[64px] h-[96px] border border-[#e2e8f0] rounded-sm overflow-hidden group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(i)}
              aria-label="Remove photo"
              className="absolute top-0.5 end-0.5 w-5 h-5 flex items-center justify-center bg-white/90 border border-[#e2e8f0] rounded-sm text-[13px] leading-none text-[#94a3b8] hover:text-red-500 hover:border-red-300"
            >
              ×
            </button>
          </div>
        ))}
        {urls.length === 0 && (
          <p className="text-[12px] text-[#94a3b8] py-3">No extra photos yet.</p>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif"
        onChange={handleFile}
        className="hidden"
        id="extra-image-upload"
      />
      <label
        htmlFor="extra-image-upload"
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
          <>↑ Add Photo</>
        )}
      </label>

      {error && <p className="text-red-500 text-[12px] mt-1.5">{error}</p>}
      <p className="text-[11px] text-[#94a3b8] mt-2">
        Add extra product photos one at a time. The main cover above stays the primary image; these show as a gallery on the book page.
      </p>
    </div>
  );
}
