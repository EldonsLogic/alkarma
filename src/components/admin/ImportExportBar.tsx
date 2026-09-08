"use client";

import { useState, useRef } from "react";

interface ImportResult {
  message: string;
  created: number;
  updated: number;
  skipped: number;
  imagesMatched?: number;
  errors: string[];
}

interface Props {
  exportHref: string;
  exportLabel: string;
  importAction?: string;       // POST endpoint URL (undefined = export-only)
  templateHref?: string;       // GET endpoint that returns template CSV
  supportsImageZip?: boolean;  // Show optional images zip input alongside CSV
}

export function ImportExportBar({
  exportHref,
  exportLabel,
  importAction,
  templateHref,
  supportsImageZip = false,
}: Props) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  // Two separate refs: one for CSV, one for ZIP
  const csvRef   = useRef<HTMLInputElement>(null);
  const imagesRef = useRef<HTMLInputElement>(null);

  async function handleSimpleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !importAction) return;
    await runImport(file, null);
    if (csvRef.current) csvRef.current.value = "";
  }

  async function handlePanelImport() {
    const csvFile    = csvRef.current?.files?.[0];
    const imagesFile = imagesRef.current?.files?.[0] ?? null;
    if (!csvFile || !importAction) return;
    await runImport(csvFile, imagesFile);
    if (csvRef.current)    csvRef.current.value = "";
    if (imagesRef.current) imagesRef.current.value = "";
    setShowPanel(false);
  }

  async function runImport(csvFile: File, imagesFile: File | null) {
    setImporting(true);
    setResult(null);
    setError("");
    setShowErrors(false);
    try {
      const fd = new FormData();
      fd.append("file", csvFile);
      if (imagesFile) fd.append("images", imagesFile);
      const res  = await fetch(importAction!, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Import failed.");
      setResult(data);
      if (data.errors?.length) setShowErrors(true); // surface problems immediately
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* ── Button row ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {/* Export */}
        <a
          href={exportHref}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#e2e8f0] text-[#1e293b] text-[13px] font-bold rounded-sm hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {exportLabel}
        </a>

        {importAction && (
          <>
            {supportsImageZip ? (
              /* ── Products: open panel ──────────────────────────────── */
              <button
                type="button"
                onClick={() => setShowPanel((v) => !v)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#3b82f6] border border-[#3b82f6] text-white text-[13px] font-bold rounded-sm hover:bg-[#2563eb] transition-colors"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
                Import Products
              </button>
            ) : (
              /* ── Simple: single file input ─────────────────────────── */
              <>
                <input
                  ref={csvRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleSimpleImport}
                  className="hidden"
                  id="import-file-simple"
                />
                <label
                  htmlFor="import-file-simple"
                  className={`inline-flex items-center gap-1.5 px-4 py-2 border text-[13px] font-bold rounded-sm cursor-pointer select-none transition-colors ${
                    importing
                      ? "border-[#e2e8f0] text-[#94a3b8] pointer-events-none"
                      : "bg-[#3b82f6] border-[#3b82f6] text-white hover:bg-[#2563eb]"
                  }`}
                >
                  {importing ? (
                    <>
                      <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Importing…
                    </>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                      </svg>
                      Import CSV / XLS
                    </>
                  )}
                </label>
              </>
            )}

            {templateHref && (
              <a
                href={templateHref}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-white border border-[#e2e8f0] text-[#64748b] text-[13px] font-bold rounded-sm hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="8" y1="13" x2="16" y2="13"/>
                  <line x1="8" y1="17" x2="12" y2="17"/>
                </svg>
                Download Template
              </a>
            )}
          </>
        )}
      </div>

      {/* ── Image-zip import panel ───────────────────────────────────────── */}
      {supportsImageZip && showPanel && (
        <div className="bg-[#f8fafc] border border-[#e2e8f0] rounded-sm p-4 space-y-4">
          <p className="text-[13px] font-black text-[#1e293b]">Import Products</p>

          {/* CSV row */}
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1.5">
              Spreadsheet (CSV / XLS / XLSX) *
            </label>
            <input
              ref={csvRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="block text-[13px] text-[#475569] file:mr-3 file:py-1.5 file:px-3 file:border file:border-[#e2e8f0] file:rounded-sm file:text-[12px] file:font-bold file:text-[#3b82f6] file:bg-white hover:file:bg-blue-50 file:cursor-pointer"
            />
          </div>

          {/* ZIP row */}
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-[#64748b] mb-1">
              Product Images ZIP <span className="normal-case font-normal text-[#94a3b8]">(optional)</span>
            </label>
            <p className="text-[11px] text-[#94a3b8] mb-1.5 leading-relaxed">
              <strong className="text-[#64748b]">Covers already in your Media Library are matched automatically</strong> — by
              filename vs the product&apos;s <strong className="text-[#64748b]">slug</strong>, <strong className="text-[#64748b]">title</strong>, or{" "}
              <strong className="text-[#64748b]">ISBN</strong>. This ZIP is only needed for covers that aren&apos;t in the gallery yet.
              Name each image after the slug (first choice), title, or ISBN — e.g.{" "}
              <code className="bg-white border border-[#e2e8f0] px-1 rounded text-[10px]">the-alchemist.jpg</code>,{" "}
              <code className="bg-white border border-[#e2e8f0] px-1 rounded text-[10px]">The Alchemist.jpg</code>, or{" "}
              <code className="bg-white border border-[#e2e8f0] px-1 rounded text-[10px]">9780061120084.jpg</code>.
              Images are auto-matched and optimised to WebP.
            </p>
            <input
              ref={imagesRef}
              type="file"
              accept=".zip"
              className="block text-[13px] text-[#475569] file:mr-3 file:py-1.5 file:px-3 file:border file:border-[#e2e8f0] file:rounded-sm file:text-[12px] file:font-bold file:text-[#64748b] file:bg-white hover:file:bg-[#f1f5f9] file:cursor-pointer"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button
              type="button"
              onClick={handlePanelImport}
              disabled={importing}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm disabled:opacity-60 transition-colors"
            >
              {importing ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Importing…
                </>
              ) : "Run Import"}
            </button>
            <button
              type="button"
              onClick={() => setShowPanel(false)}
              className="text-[13px] text-[#64748b] hover:text-[#1e293b]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error && (
        <p className="text-[12px] text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-sm">
          {error}
        </p>
      )}

      {/* ── Result banner ───────────────────────────────────────────────── */}
      {result && (
        <div className="text-[12px] bg-green-50 border border-green-200 px-3 py-2 rounded-sm space-y-1">
          <p className="font-bold text-green-700">{result.message}</p>
          <div className="flex gap-4 flex-wrap text-green-600">
            <span>✓ {result.created} created</span>
            <span>✎ {result.updated} updated</span>
            {result.imagesMatched !== undefined && result.imagesMatched > 0 && (
              <span>🖼 {result.imagesMatched} images matched</span>
            )}
            {result.skipped > 0 && (
              <span className="text-brand-600">⚠ {result.skipped} skipped</span>
            )}
          </div>
          {result.errors.length > 0 && (
            <div>
              <button
                onClick={() => setShowErrors((v) => !v)}
                className="text-[11px] text-brand-600 underline"
              >
                {showErrors ? "Hide" : "Show"} {result.errors.length} row error{result.errors.length !== 1 ? "s" : ""}
              </button>
              {showErrors && (
                <ul className="mt-1 space-y-0.5 text-[11px] text-brand-700">
                  {result.errors.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
