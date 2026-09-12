"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";

interface MediaFile {
  id: string;
  url: string;
  filename: string;
  size: number;
  createdAt: string;
}

function fmtSize(bytes: number) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function MediaLibraryClient() {
  const [files, setFiles] = useState<MediaFile[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ name: string; done: boolean; error?: string }[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameVal, setRenameVal] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [matching, setMatching] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async (p = page, search = q) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/media?page=${p}&q=${encodeURIComponent(search)}`);
      const data = await res.json();
      setFiles(data.files);
      setTotal(data.total);
      setPages(data.pages);
    } finally {
      setLoading(false);
    }
  }, [page, q]);

  useEffect(() => { load(page, q); }, [page]); // eslint-disable-line

  async function uploadFiles(fileList: FileList | File[]) {
    const arr = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (arr.length === 0) return;

    setUploading(true);
    setUploadProgress(arr.map((f) => ({ name: f.name, done: false })));

    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      try {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Upload failed");
        setUploadProgress((prev) =>
          prev.map((p, idx) => idx === i ? { ...p, done: true } : p)
        );
      } catch (err) {
        setUploadProgress((prev) =>
          prev.map((p, idx) => idx === i ? { ...p, done: true, error: (err as Error).message } : p)
        );
      }
    }

    setUploading(false);
    setPage(1);
    load(1, q);
    // Keep failures on screen so the reason (e.g. file too large) is readable;
    // only auto-clear when everything succeeded.
    setUploadProgress((prev) => {
      if (prev.every((p) => !p.error)) setTimeout(() => setUploadProgress([]), 3000);
      return prev;
    });
  }

  function handleFileInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) uploadFiles(e.target.files);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    if (!dropRef.current?.contains(e.relatedTarget as Node)) setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files);
  }

  async function copyUrl(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  }

  async function deleteFile(id: string) {
    if (!confirm("Delete this file? This cannot be undone.")) return;
    await fetch(`/api/admin/media?id=${id}`, { method: "DELETE" });
    setSelected(null);
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setTotal((t) => t - 1);
  }

  async function renameFile(id: string) {
    if (!renameVal.trim()) return;
    const res = await fetch("/api/admin/media", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, filename: renameVal.trim() }),
    });
    if (res.ok) {
      const updated = await res.json();
      setFiles((prev) => prev.map((f) => f.id === id ? { ...f, filename: updated.filename } : f));
      setRenaming(false);
    }
  }

  async function syncExisting() {
    setSyncing(true);
    try {
      const res = await fetch("/api/admin/media/backfill", { method: "POST" });
      const data = await res.json();
      alert(`Synced ${data.inserted} new image${data.inserted !== 1 ? "s" : ""} from existing content.`);
      load(1, q);
    } finally {
      setSyncing(false);
    }
  }

  // Assign Media Library images to products still on the placeholder cover
  // (e.g. images uploaded after the products were imported).
  async function matchCovers() {
    setMatching(true);
    try {
      const res = await fetch("/api/admin/media/match-covers", { method: "POST" });
      const data = await res.json();
      if (!res.ok) { alert(data.error ?? "Matching failed."); return; }
      alert(
        data.message +
        (data.unmatched?.length ? `\n\nStill need an image:\n• ${data.unmatched.slice(0, 15).join("\n• ")}` : "")
      );
    } finally {
      setMatching(false);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load(1, q);
  }

  const selectedFile = selected ? files.find((f) => f.id === selected) : null;

  // When opening rename, seed the current filename
  function openRename() {
    setRenameVal(selectedFile?.filename ?? "");
    setRenaming(true);
  }

  return (
    <div className="flex flex-col h-full">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div>
          <h1 className="text-[22px] font-black text-[#1e293b]">Media Library</h1>
          <p className="text-[13px] text-[#64748b] mt-0.5">{total} file{total !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={matchCovers}
            disabled={matching}
            title="Assign Media Library images to products still showing the placeholder cover"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e2e8f0] hover:border-[#3b82f6] text-[#475569] hover:text-[#1e293b] text-[13px] font-bold rounded-sm cursor-pointer transition-colors disabled:opacity-50"
          >
            {matching ? "Matching…" : "Match Covers to Products"}
          </button>
          <button
            onClick={syncExisting}
            disabled={syncing}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#e2e8f0] hover:border-[#3b82f6] text-[#475569] hover:text-[#1e293b] text-[13px] font-bold rounded-sm cursor-pointer transition-colors disabled:opacity-50"
          >
            {syncing ? "Syncing…" : "Sync Existing Images"}
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFileInput} className="hidden" id="media-upload" />
          <label htmlFor="media-upload"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm cursor-pointer transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload Images
          </label>
        </div>
      </div>

      {/* ── Upload progress ────────────────────────────────────────── */}
      {uploadProgress.length > 0 && (
        <div className="mb-4 bg-white border border-[#e2e8f0] rounded-sm p-4 space-y-1.5">
          <p className="text-[12px] font-bold text-[#1e293b] mb-2">
            Uploading {uploadProgress.filter((p) => p.done).length} / {uploadProgress.length}…
          </p>
          {uploadProgress.map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-[12px]">
              <span className={p.done ? (p.error ? "text-red-500" : "text-green-600") : "text-[#94a3b8]"}>
                {p.done ? (p.error ? "✕" : "✓") : "·"}
              </span>
              <span className="truncate text-[#64748b]">{p.name}</span>
              {p.error && <span className="text-red-500 text-[11px]">{p.error}</span>}
            </div>
          ))}
        </div>
      )}

      {/* ── Drop zone + search ─────────────────────────────────────── */}
      <div
        ref={dropRef}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative mb-4 border-2 border-dashed rounded-sm p-4 transition-colors ${
          isDragging ? "border-[#3b82f6] bg-blue-50" : "border-[#e2e8f0] bg-white"
        }`}
      >
        {isDragging ? (
          <p className="text-center text-[14px] font-bold text-[#3b82f6] py-4">Drop images here to upload</p>
        ) : (
          <div className="flex items-center gap-3 flex-wrap">
            <p className="text-[12px] text-[#94a3b8] flex items-center gap-1.5">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              </svg>
              Drag & drop images here, or use Upload button
            </p>
            <form onSubmit={handleSearch} className="ms-auto flex gap-2">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by filename…"
                className="px-3 py-1.5 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] w-[220px]"
              />
              <button type="submit" className="px-3 py-1.5 bg-[#1e293b] text-white text-[13px] font-bold rounded-sm">
                Search
              </button>
              {q && (
                <button type="button" onClick={() => { setQ(""); setPage(1); load(1, ""); }}
                  className="text-[13px] text-[#64748b] hover:text-[#1e293b]">
                  Clear
                </button>
              )}
            </form>
          </div>
        )}
      </div>

      {/* ── Main: grid + detail panel ─────────────────────────────── */}
      <div className="flex gap-5 min-h-0 flex-1">

        {/* Image grid */}
        <div className="flex-1 min-w-0">
          {loading ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
              {Array.from({ length: 24 }).map((_, i) => (
                <div key={i} className="aspect-square bg-[#f1f5f9] rounded-sm animate-pulse" />
              ))}
            </div>
          ) : files.length === 0 ? (
            <div className="bg-white border border-[#e2e8f0] rounded-sm p-16 text-center">
              <p className="text-[14px] text-[#94a3b8] mb-1">No images yet</p>
              <p className="text-[12px] text-[#cbd5e1]">Upload images using the button above, drag & drop, or click "Sync Existing Images"</p>
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
              {files.map((file) => (
                <button
                  key={file.id}
                  onClick={() => { setSelected(selected === file.id ? null : file.id); setRenaming(false); }}
                  className={`relative aspect-square rounded-sm overflow-hidden group border-2 transition-all ${
                    selected === file.id
                      ? "border-[#3b82f6] ring-2 ring-[#3b82f6]/30"
                      : "border-transparent hover:border-[#3b82f6]"
                  }`}
                >
                  <Image
                    src={file.url}
                    alt={file.filename}
                    fill
                    className="object-cover"
                    sizes="120px"
                    unoptimized
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  {/* Copy button on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); copyUrl(file.url); }}
                      className="bg-white/90 hover:bg-white text-[#1e293b] text-[10px] font-bold px-2 py-1 rounded shadow"
                    >
                      {copied === file.url ? "Copied!" : "Copy URL"}
                    </button>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-5">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-3 py-1.5 border border-[#e2e8f0] text-[13px] rounded-sm disabled:opacity-40 hover:border-[#3b82f6]">
                ←
              </button>
              <span className="text-[13px] text-[#64748b]">Page {page} of {pages}</span>
              <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                className="px-3 py-1.5 border border-[#e2e8f0] text-[13px] rounded-sm disabled:opacity-40 hover:border-[#3b82f6]">
                →
              </button>
            </div>
          )}
        </div>

        {/* ── Detail panel ─────────────────────────────────────────── */}
        {selectedFile && (
          <div className="w-[240px] flex-shrink-0 bg-white border border-[#e2e8f0] rounded-sm p-4 space-y-4 self-start sticky top-4">
            <div className="relative aspect-square w-full rounded-sm overflow-hidden bg-[#f1f5f9]">
              <Image src={selectedFile.url} alt={selectedFile.filename} fill className="object-contain" unoptimized />
            </div>
            <div className="space-y-1.5">
              {renaming ? (
                <div className="space-y-1.5">
                  <input
                    autoFocus
                    value={renameVal}
                    onChange={(e) => setRenameVal(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") renameFile(selectedFile.id); if (e.key === "Escape") setRenaming(false); }}
                    className="w-full px-2 py-1.5 border border-[#3b82f6] text-[12px] rounded-sm outline-none"
                  />
                  <div className="flex gap-1.5">
                    <button onClick={() => renameFile(selectedFile.id)}
                      className="flex-1 py-1.5 text-[11px] font-bold bg-[#3b82f6] text-white rounded-sm hover:bg-[#2563eb]">
                      Save
                    </button>
                    <button onClick={() => setRenaming(false)}
                      className="flex-1 py-1.5 text-[11px] font-bold border border-[#e2e8f0] text-[#64748b] rounded-sm hover:border-[#94a3b8]">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-1.5">
                  <p className="text-[12px] font-bold text-[#1e293b] break-all flex-1">{selectedFile.filename}</p>
                  <button onClick={openRename} title="Rename"
                    className="text-[#94a3b8] hover:text-[#3b82f6] flex-shrink-0 mt-0.5">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                </div>
              )}
              <p className="text-[11px] text-[#94a3b8]">{fmtSize(selectedFile.size)}</p>
              <p className="text-[11px] text-[#94a3b8]">
                {new Date(selectedFile.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => copyUrl(selectedFile.url)}
                className={`w-full py-2 text-[12px] font-bold rounded-sm border transition-colors ${
                  copied === selectedFile.url
                    ? "border-green-300 text-green-700 bg-green-50"
                    : "border-[#3b82f6] text-[#3b82f6] hover:bg-blue-50"
                }`}
              >
                {copied === selectedFile.url ? "✓ Copied!" : "Copy URL"}
              </button>
              <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-sm p-2">
                <p className="text-[10px] text-[#94a3b8] break-all select-all font-mono">{selectedFile.url}</p>
              </div>
              <button
                onClick={() => deleteFile(selectedFile.id)}
                className="w-full py-2 text-[12px] font-bold text-red-500 border border-red-200 hover:bg-red-50 rounded-sm transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
