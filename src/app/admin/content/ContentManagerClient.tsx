"use client";

import { useState, useEffect, useCallback } from "react";
import { ImageUpload } from "@/components/admin/ImageUpload";

// ─── Types ────────────────────────────────────────────────────────────────────

type FieldType = "text" | "textarea" | "url" | "color" | "image";

interface Field {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  defaultValue?: string;        // shown when DB has no saved value yet
  imageShape?: "cover" | "square" | "banner";
  imageDimensions?: string;
  imageDimensionsNote?: string;
  hint?: string;
}

interface Section {
  id: string;
  label: string;
  fields: Field[];
}

interface ContentPage {
  id: string;
  label: string;
  icon: string;
  previewPath: string;
  sections: Section[];
}

// ─── Content Config ───────────────────────────────────────────────────────────

const CONTENT_PAGES: ContentPage[] = [
  {
    id: "homepage",
    label: "Homepage",
    icon: "🏠",
    previewPath: "/",
    sections: [
      {
        id: "announcement_bar",
        label: "Announcement Bar (top strip)",
        fields: [
          { key: "promo_bar_text", label: "Custom Promo Text (EN)", type: "text", placeholder: "Leave blank to show the default delivery message", hint: "If blank, the bar shows a default message about delivery across Egypt." },
          { key: "promo_bar_text_ar", label: "Custom Promo Text (AR) عربي", type: "text", placeholder: "اتركه فارغًا لعرض رسالة التوصيل الافتراضية" },
        ],
      },
      {
        id: "newsletter",
        label: "Newsletter Strip",
        fields: [
          { key: "newsletter_heading", label: "Heading (EN)", type: "text", placeholder: "Stay in the know", defaultValue: "Stay in the know" },
          { key: "newsletter_heading_ar", label: "Heading (AR) عربي", type: "text", placeholder: "ابقَ على اطلاع", defaultValue: "ابقَ على اطلاع" },
          { key: "newsletter_subtext", label: "Subtext (EN)", type: "textarea", placeholder: "Subscribe for new releases and exclusive offers", defaultValue: "Subscribe for new releases and exclusive offers" },
          { key: "newsletter_subtext_ar", label: "Subtext (AR) عربي", type: "textarea", placeholder: "اشترك لتصلك الإصدارات الجديدة والعروض الحصرية", defaultValue: "اشترك لتصلك الإصدارات الجديدة والعروض الحصرية" },
        ],
      },
    ],
  },
  {
    id: "footer",
    label: "Navigation & Footer",
    icon: "🔗",
    previewPath: "/",
    sections: [
      {
        id: "store_info",
        label: "Store Information",
        fields: [
          { key: "store_name", label: "Store Name", type: "text", placeholder: "دار الكرمة" },
          { key: "store_tagline", label: "Footer Tagline (EN)", type: "textarea", placeholder: "Egypt's favourite online bookstore. Discover thousands of titles in English and Arabic." },
          { key: "store_tagline_ar", label: "Footer Tagline (AR) عربي", type: "textarea", placeholder: "دار نشر عربية تأسست عام ٢٠١٣ بالقاهرة. كتب عربية ومترجمة تُوصَّل إلى باب بيتك." },
          { key: "store_email", label: "Contact Email", type: "text", placeholder: "info@alkarmabooks.com" },
          { key: "store_phone", label: "Phone Number", type: "text", placeholder: "+20 xxx xxx xxxx" },
          { key: "store_address", label: "Address", type: "text", placeholder: "Cairo, Egypt" },
        ],
      },
      {
        id: "social_links",
        label: "Social Links",
        fields: [
          { key: "facebook_url",  label: "Facebook URL",  type: "url", placeholder: "https://facebook.com/AlKarmaBooks" },
          { key: "x_url",         label: "X (Twitter) URL", type: "url", placeholder: "https://x.com/AlKarmaBooks" },
          { key: "instagram_url", label: "Instagram URL", type: "url", placeholder: "https://instagram.com/alkarma_books" },
          { key: "whatsapp_url",  label: "WhatsApp URL",  type: "url", placeholder: "https://wa.me/201030165702" },
          { key: "tiktok_url",    label: "TikTok URL",    type: "url", placeholder: "https://tiktok.com/@alkarma_books" },
          { key: "youtube_url",   label: "YouTube URL",   type: "url", placeholder: "https://youtube.com/@AlKarmaBooks" },
        ],
      },
    ],
  },
  {
    id: "contact",
    label: "Contact Page",
    icon: "📞",
    previewPath: "/contact",
    sections: [
      {
        id: "contact_details",
        label: "Contact Details",
        fields: [
          { key: "contact_email_primary", label: "Primary Email", type: "text", placeholder: "info@alkarmabooks.com" },
          { key: "contact_email_returns", label: "Returns Email", type: "text", placeholder: "info@alkarmabooks.com" },
          { key: "contact_hours", label: "Support Hours", type: "text", placeholder: "Sunday – Thursday, 9 AM – 6 PM (Cairo time)" },
          { key: "store_phone", label: "Phone Number", type: "text", placeholder: "+20 xxx xxx xxxx" },
        ],
      },
    ],
  },
  {
    id: "seo",
    label: "SEO & Meta",
    icon: "🌐",
    previewPath: "/",
    sections: [
      {
        id: "meta",
        label: "Meta & Open Graph",
        fields: [
          { key: "meta_title", label: "Default Page Title", type: "text", placeholder: "دار الكرمة — تسوّق الكتب أونلاين في مصر", hint: "Shown in browser tab and Google results" },
          { key: "meta_description", label: "Meta Description", type: "textarea", placeholder: "Egypt's favourite online bookstore. Thousands of titles in English and Arabic, delivered to your door.", hint: "Keep under 160 characters for best SEO" },
          { key: "og_image", label: "Social Share Image (OG)", type: "image", imageShape: "banner", imageDimensions: "1200 × 630 px", imageDimensionsNote: "(shown when sharing links)" },
        ],
      },
    ],
  },
  {
    id: "payments",
    label: "Payments",
    icon: "💳",
    previewPath: "/",
    sections: [
      {
        id: "checkout",
        label: "Checkout Options",
        fields: [
          { key: "cod_enabled", label: "Cash on Delivery (true / false)", type: "text", placeholder: "true", hint: "Set to true to offer COD at checkout" },
        ],
      },
      {
        id: "paymob",
        label: "Paymob Integration",
        fields: [
          { key: "paymob_api_key", label: "Paymob API Key", type: "text", placeholder: "Leave blank to keep existing", hint: "Your Paymob secret API key" },
          { key: "paymob_integration_id", label: "Paymob Integration ID", type: "text", placeholder: "", hint: "Card payment integration ID from Paymob dashboard" },
        ],
      },
    ],
  },
];

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  initialSettings: Record<string, string>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ContentManagerClient({ initialSettings }: Props) {
  const [stored, setStored] = useState<Record<string, string>>(initialSettings);
  const [activePage, setActivePage] = useState<ContentPage>(CONTENT_PAGES[0]);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [savedBadge, setSavedBadge] = useState(false);
  const [previewVersion, setPreviewVersion] = useState(0);
  const [previewLoading, setPreviewLoading] = useState(true);

  const activeSection = activePage.sections[activeSectionIdx];

  // Populate field values when section changes — use DB value, then defaultValue, then ""
  useEffect(() => {
    const vals: Record<string, string> = {};
    activeSection.fields.forEach((f) => {
      vals[f.key] = stored[f.key] ?? f.defaultValue ?? "";
    });
    setFieldValues(vals);
    setSavedBadge(false);
  }, [activePage.id, activeSectionIdx]);

  // Preview URL
  const previewUrl = `${activePage.previewPath}?_cv=${previewVersion}`;

  function setField(key: string, value: string) {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
    setSavedBadge(false);
  }

  async function saveSection() {
    setSaving(true);
    try {
      await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: fieldValues }),
      });
      setStored((prev) => ({ ...prev, ...fieldValues }));
      setSavedBadge(true);
      setPreviewVersion((v) => v + 1);
    } catch {}
    setSaving(false);
  }

  function selectPage(page: ContentPage) {
    setActivePage(page);
    setActiveSectionIdx(0);
    setPreviewVersion((v) => v + 1);
  }

  const totalSections = activePage.sections.length;

  return (
    <div className="-m-8 flex flex-col overflow-hidden bg-[#f8fafc]" style={{ height: "calc(100vh - 49px)" }}>

      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <header className="flex-shrink-0 bg-white border-b border-[#e2e8f0] px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-[16px] font-bold text-[#0f172a]">Site Content & Settings</h1>
          <span className="flex items-center gap-1.5 text-[12px] text-[#64748b]">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            All fields pre-filled with current live values
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setPreviewVersion((v) => v + 1)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] border border-[#e2e8f0] text-[#64748b] hover:border-[#94a3b8] transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" />
              <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
            </svg>
            Refresh
          </button>
        </div>
      </header>

      {/* ── 3-column body ───────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left: Page nav ─────────────────────────────────────────────── */}
        <aside className="w-[200px] flex-shrink-0 bg-white border-r border-[#e2e8f0] overflow-y-auto">
          <div className="px-3 pt-4 pb-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#94a3b8] px-2 mb-2">Pages</p>
            {CONTENT_PAGES.map((page) => (
              <button
                key={page.id}
                onClick={() => selectPage(page)}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left text-[13px] rounded-md mb-0.5 transition-colors ${
                  activePage.id === page.id
                    ? "bg-[#1e293b] text-white font-semibold"
                    : "text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]"
                }`}
              >
                <span className="text-[16px] flex-shrink-0">{page.icon}</span>
                <span className="leading-snug">{page.label}</span>
              </button>
            ))}
          </div>
        </aside>

        {/* ── Center: Live preview ────────────────────────────────────────── */}
        <div className="flex-1 min-w-0 flex flex-col bg-[#e2e8f0] relative">
          <div className="flex-shrink-0 px-4 py-2 bg-white border-b border-[#e2e8f0] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400" />
            <span className="text-[12px] text-[#64748b] font-mono">
              Live Preview — {activePage.label}
            </span>
            {previewLoading && (
              <span className="text-[11px] text-[#94a3b8] ml-auto">Loading…</span>
            )}
          </div>
          <div className="flex-1 relative overflow-hidden">
            <iframe
              key={previewVersion}
              src={previewUrl}
              className="absolute inset-0 w-full h-full bg-white"
              style={{ border: "none" }}
              onLoad={() => setPreviewLoading(false)}
              onLoadStart={() => setPreviewLoading(true)}
              title="Site preview"
            />
          </div>
        </div>

        {/* ── Right: Section editor ───────────────────────────────────────── */}
        <aside className="w-[340px] flex-shrink-0 bg-white border-l border-[#e2e8f0] flex flex-col overflow-hidden">

          {/* Section header */}
          <div className="flex-shrink-0 border-b border-[#e2e8f0] px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#94a3b8]">
                  Section {activeSectionIdx + 1} of {totalSections}
                </span>
                {savedBadge && (
                  <span className="flex items-center gap-1 text-[11px] text-green-600 font-bold">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    All fields saved
                  </span>
                )}
              </div>
              {/* Section prev/next arrows */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setActiveSectionIdx((i) => Math.max(0, i - 1))}
                  disabled={activeSectionIdx === 0}
                  className="w-6 h-6 flex items-center justify-center text-[#94a3b8] hover:text-[#0f172a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ‹
                </button>
                <button
                  onClick={() => setActiveSectionIdx((i) => Math.min(totalSections - 1, i + 1))}
                  disabled={activeSectionIdx === totalSections - 1}
                  className="w-6 h-6 flex items-center justify-center text-[#94a3b8] hover:text-[#0f172a] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  ›
                </button>
              </div>
            </div>

            {/* Section selector dropdown */}
            <select
              value={activeSectionIdx}
              onChange={(e) => setActiveSectionIdx(Number(e.target.value))}
              className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] font-semibold text-[#0f172a] bg-[#f8fafc] outline-none focus:border-[#3b82f6] rounded-sm"
            >
              {activePage.sections.map((s, i) => (
                <option key={s.id} value={i}>
                  {i + 1}. {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Fields */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {activeSection.fields.map((field) => (
              <FieldEditor
                key={`${activePage.id}-${activeSection.id}-${field.key}`}
                field={field}
                value={fieldValues[field.key] ?? ""}
                onChange={(val) => setField(field.key, val)}
              />
            ))}
          </div>

          {/* Save button */}
          <div className="flex-shrink-0 border-t border-[#e2e8f0] px-4 py-3">
            <button
              onClick={saveSection}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#1e293b] hover:bg-[#0f172a] disabled:opacity-60 text-white text-[13px] font-bold transition-colors"
            >
              {saving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" />
                  </svg>
                  Save Section &amp; Refresh Preview
                </>
              )}
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}

// ─── Field Editor ─────────────────────────────────────────────────────────────

function FieldEditor({ field, value, onChange }: {
  field: Field;
  value: string;
  onChange: (val: string) => void;
}) {
  const baseInput = "w-full px-3 py-2 border border-[#e2e8f0] text-[13px] text-[#0f172a] bg-white outline-none focus:border-[#3b82f6] rounded-sm transition-colors placeholder:text-[#cbd5e1]";

  return (
    <div>
      <label className="block text-[11px] font-bold uppercase tracking-[0.1em] text-[#64748b] mb-1.5">
        {field.label}
      </label>

      {field.type === "image" ? (
        <ImageUpload
          name={field.key}
          defaultValue={value}
          label=""
          shape={field.imageShape ?? "banner"}
          dimensions={field.imageDimensions}
          dimensionsNote={field.imageDimensionsNote}
          onUrlChange={onChange}
        />
      ) : field.type === "textarea" ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          rows={3}
          className={`${baseInput} resize-y`}
        />
      ) : field.type === "color" ? (
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="w-9 h-9 border border-[#e2e8f0] rounded-sm cursor-pointer p-0.5 bg-white flex-shrink-0"
          />
          <input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className={`${baseInput} flex-1 font-mono`}
          />
        </div>
      ) : (
        <input
          type={field.type === "url" ? "url" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder}
          className={baseInput}
        />
      )}

      {field.hint && (
        <p className="text-[11px] text-[#94a3b8] mt-1">{field.hint}</p>
      )}
    </div>
  );
}
