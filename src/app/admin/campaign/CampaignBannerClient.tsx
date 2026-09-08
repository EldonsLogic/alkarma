"use client";

import { useState } from "react";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface Props {
  initialSettings: Record<string, string>;
}

/**
 * Dedicated editor for the homepage Campaign Banner (mid-homepage feature band).
 * Bilingual: an English set and an Arabic set of images + link. Neither is
 * mandatory — the storefront shows the visitor's language and falls back to the
 * other when a language is missing. Writes the StoreSetting keys the homepage
 * reads (campaign_image_url[_ar] · campaign_image_mobile_url[_ar] ·
 * campaign_cta_href[_ar]) via the shared /api/admin/content endpoint.
 */
export function CampaignBannerClient({ initialSettings }: Props) {
  const [v, setV] = useState({
    campaign_image_url: initialSettings.campaign_image_url ?? "",
    campaign_image_mobile_url: initialSettings.campaign_image_mobile_url ?? "",
    campaign_cta_href: initialSettings.campaign_cta_href ?? "/bestsellers",
    campaign_image_url_ar: initialSettings.campaign_image_url_ar ?? "",
    campaign_image_mobile_url_ar: initialSettings.campaign_image_mobile_url_ar ?? "",
    campaign_cta_href_ar: initialSettings.campaign_cta_href_ar ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function set(key: keyof typeof v, value: string) {
    setV((p) => ({ ...p, [key]: value }));
    setSaved(false);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/admin/content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: v }),
      });
      setSaved(true);
    } catch {}
    setSaving(false);
  }

  const inputCls =
    "w-full px-3 py-2 border border-[#e2e8f0] text-[13px] text-[#0f172a] bg-white outline-none focus:border-[#3b82f6] rounded-sm transition-colors placeholder:text-[#cbd5e1]";
  const legendCls = "px-2 text-[12px] font-black uppercase tracking-wide text-[#1e293b]";
  const fieldLabel = "block text-[11px] font-bold uppercase tracking-[0.1em] text-[#64748b] mb-1.5";

  return (
    <div className="max-w-[760px]">
      {/* Header */}
      <div className="mb-1 flex items-center gap-3">
        <h1 className="text-[22px] font-bold text-[#0f172a]">Campaign Banner</h1>
        <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-[#94a3b8]">Homepage</span>
      </div>
      <p className="text-[13px] text-[#64748b] mb-6">
        The image banner shown in the middle of the homepage. Provide an English and an Arabic version —
        neither is mandatory, but if one language is missing the site automatically shows the other. Each
        language has its own link so it routes to the matching part of the site.
      </p>

      <div className="space-y-5">
        {/* English */}
        <fieldset className="bg-white border border-[#e2e8f0] rounded-lg p-6">
          <legend className={legendCls}>🇬🇧 English version</legend>
          <div className="space-y-5">
            <div>
              <label className={fieldLabel}>Desktop Image</label>
              <ImageUpload name="campaign_image_url" defaultValue={v.campaign_image_url} label="" shape="banner" dimensions="1920 × 232 px" dimensionsNote="(full-width strip, 232px tall)" onUrlChange={(u) => set("campaign_image_url", u)} />
            </div>
            <div>
              <label className={fieldLabel}>Mobile Image</label>
              <ImageUpload name="campaign_image_mobile_url" defaultValue={v.campaign_image_mobile_url} label="" shape="cover" dimensions="1080 × 316 px" dimensionsNote="(158px tall on mobile; falls back to desktop)" onUrlChange={(u) => set("campaign_image_mobile_url", u)} />
            </div>
            <div>
              <label className={fieldLabel}>English Link</label>
              <input type="text" value={v.campaign_cta_href} onChange={(e) => set("campaign_cta_href", e.target.value)} placeholder="/bestsellers" className={inputCls} />
            </div>
          </div>
        </fieldset>

        {/* Arabic */}
        <fieldset className="bg-white border border-[#e2e8f0] rounded-lg p-6">
          <legend className={legendCls}>🇪🇬 Arabic version — النسخة العربية</legend>
          <div className="space-y-5">
            <div>
              <label className={fieldLabel}>Desktop Image (Arabic)</label>
              <ImageUpload name="campaign_image_url_ar" defaultValue={v.campaign_image_url_ar} label="" shape="banner" dimensions="1920 × 232 px" dimensionsNote="(full-width strip, 232px tall)" onUrlChange={(u) => set("campaign_image_url_ar", u)} />
            </div>
            <div>
              <label className={fieldLabel}>Mobile Image (Arabic)</label>
              <ImageUpload name="campaign_image_mobile_url_ar" defaultValue={v.campaign_image_mobile_url_ar} label="" shape="cover" dimensions="1080 × 316 px" dimensionsNote="(158px tall on mobile; falls back to desktop)" onUrlChange={(u) => set("campaign_image_mobile_url_ar", u)} />
            </div>
            <div>
              <label className={fieldLabel}>Arabic Link</label>
              <input type="text" value={v.campaign_cta_href_ar} onChange={(e) => set("campaign_cta_href_ar", e.target.value)} placeholder="/category/arabic-books" className={inputCls} />
            </div>
          </div>
        </fieldset>

        {/* Save */}
        <div className="flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-[#1e293b] hover:bg-[#0f172a] disabled:opacity-60 text-white text-[13px] font-bold rounded-sm transition-colors"
          >
            {saving ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Saving…
              </>
            ) : "Save Campaign Banner"}
          </button>
          {saved && (
            <span className="flex items-center gap-1 text-[12px] text-green-600 font-bold">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Saved
            </span>
          )}
          <a href="/" target="_blank" rel="noreferrer" className="ml-auto text-[12px] text-[#64748b] hover:text-[#0f172a] underline underline-offset-2">
            View homepage ↗
          </a>
        </div>
      </div>
    </div>
  );
}
