"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { RichTextEditor } from "@/components/admin/RichTextEditor";

interface Page { slug: string; title: string; titleAr: string | null; body: string; bodyAr: string | null; metaTitle: string | null; metaDesc: string | null; isPublished: boolean; }

export function PageEditorClient({ page, defaultSlug }: { page: Page | null; defaultSlug: string }) {
  const router = useRouter();
  const [slug, setSlug] = useState(page?.slug ?? defaultSlug);
  const [title, setTitle] = useState(page?.title ?? "");
  const [titleAr, setTitleAr] = useState(page?.titleAr ?? "");
  const [body, setBody] = useState(page?.body ?? "");
  const [bodyAr, setBodyAr] = useState(page?.bodyAr ?? "");
  const [metaTitle, setMetaTitle] = useState(page?.metaTitle ?? "");
  const [metaDesc, setMetaDesc] = useState(page?.metaDesc ?? "");
  const [isPublished, setIsPublished] = useState(page?.isPublished ?? true);
  const [tab, setTab] = useState<"en" | "ar">("en");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSave() {
    setError("");
    setSaving(true);
    const res = await fetch(`/api/admin/pages/${slug || "new"}`, {
      method: page ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, title, titleAr, body, bodyAr, metaTitle, metaDesc, isPublished }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) { setError(data.error ?? "Save failed"); return; }
    router.push("/admin/pages");
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/pages" className="text-[#64748b] hover:text-[#1e293b] text-[13px]">← Pages</Link>
        <span className="text-[#94a3b8]">/</span>
        <h1 className="text-[20px] font-black text-[#1e293b]">{page ? title : "New Page"}</h1>
      </div>

      {error && <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-[13px] rounded-sm">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-6">
        <div className="space-y-5">
          <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Title *</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Slug *</label>
                <input value={slug} onChange={(e) => setSlug(e.target.value)}
                  placeholder="about" className="w-full px-3 py-2 border border-[#e2e8f0] font-mono text-[12px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
            </div>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
            <div className="flex border-b border-[#e2e8f0]">
              {(["en", "ar"] as const).map((t) => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-5 py-3 text-[12px] font-bold uppercase tracking-wide transition-colors ${tab === t ? "bg-white border-b-2 border-[#3b82f6] text-[#3b82f6]" : "bg-[#f8fafc] text-[#64748b] hover:text-[#1e293b]"}`}>
                  {t === "en" ? "English" : "Arabic"}
                </button>
              ))}
            </div>
            <div className="p-5">
              {tab === "en" ? (
                <RichTextEditor value={body} onChange={setBody} placeholder="Page content…" minHeight={400} />
              ) : (
                <div dir="rtl">
                  <input value={titleAr} onChange={(e) => setTitleAr(e.target.value)} placeholder="العنوان بالعربي"
                    className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] mb-3" />
                  <RichTextEditor value={bodyAr} onChange={setBodyAr} placeholder="المحتوى بالعربي…" minHeight={350} />
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 space-y-3">
            <h3 className="text-[13px] font-black text-[#1e293b]">Publish</h3>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} className="accent-[#3b82f6] w-4 h-4" />
              <span className="text-[13px] text-[#64748b]">Published (visible on site)</span>
            </label>
            <button onClick={handleSave} disabled={saving}
              className="w-full py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm disabled:opacity-60">
              {saving ? "Saving…" : "Save Page"}
            </button>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 space-y-4">
            <h3 className="text-[13px] font-black text-[#1e293b]">SEO</h3>
            <div>
              <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Meta Title</label>
              <input value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
            </div>
            <div>
              <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Meta Description</label>
              <textarea value={metaDesc} onChange={(e) => setMetaDesc(e.target.value)} rows={3}
                className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] resize-none" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
