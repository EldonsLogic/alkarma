"use client";

import { useState } from "react";
import Link from "next/link";

const VARIABLES: Record<string, string[]> = {
  order_confirmed: ["firstName", "orderNumber", "total", "currency", "items"],
  order_shipped: ["firstName", "orderNumber", "trackingNumber", "carrierName"],
  order_delivered: ["firstName", "orderNumber"],
  welcome: ["firstName", "email"],
  abandoned_cart: ["firstName", "itemCount", "cartUrl"],
  password_reset: ["firstName", "resetLink"],
};

export function EmailTemplateEditorClient({ template, onSave }: { template: any; onSave: (fd: FormData) => Promise<void> }) {
  const [subject, setSubject] = useState(template.subject ?? "");
  const [body, setBody] = useState(template.body ?? "");
  const [isActive, setIsActive] = useState(template.isActive ?? true);
  const [preview, setPreview] = useState(false);

  const vars = VARIABLES[template.key] ?? [];

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/email-templates" className="text-[#64748b] hover:text-[#1e293b] text-[13px]">← Email Templates</Link>
        <span className="text-[#94a3b8]">/</span>
        <h2 className="text-[18px] font-black text-[#1e293b]">{template.name}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-6">
        <div className="space-y-5">
          <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 space-y-4">
            <div>
              <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1.5">Subject Line</label>
              <input value={subject} onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 border border-[#e2e8f0] text-[14px] rounded-sm outline-none focus:border-[#3b82f6]" />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[12px] font-bold uppercase text-[#64748b]">Email Body (HTML)</label>
                <button type="button" onClick={() => setPreview(!preview)}
                  className="text-[12px] text-[#3b82f6] font-bold hover:underline">
                  {preview ? "← Edit" : "Preview →"}
                </button>
              </div>
              {preview ? (
                <div className="border border-[#e2e8f0] rounded-sm p-4 min-h-[300px] text-[13px] prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: body }} />
              ) : (
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={16}
                  className="w-full px-3 py-2.5 border border-[#e2e8f0] font-mono text-[12px] rounded-sm outline-none focus:border-[#3b82f6] resize-y" />
              )}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-[#3b82f6] w-4 h-4" />
              <span className="text-[13px] text-[#64748b]">Active (send this email)</span>
            </label>
            <form action={onSave}>
              <input type="hidden" name="key" value={template.key} />
              <input type="hidden" name="subject" value={subject} />
              <input type="hidden" name="body" value={body} />
              {isActive && <input type="hidden" name="isActive" value="on" />}
              <button type="submit" className="w-full py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">
                Save Template
              </button>
            </form>
          </div>

          {vars.length > 0 && (
            <div className="bg-white border border-[#e2e8f0] rounded-sm p-5">
              <h3 className="text-[12px] font-black text-[#1e293b] uppercase tracking-wide mb-3">Available Variables</h3>
              <div className="space-y-1.5">
                {vars.map((v) => (
                  <button key={v} type="button"
                    onClick={() => setBody((b: string) => b + `{{${v}}}`)}
                    className="block w-full text-left px-2 py-1 font-mono text-[12px] text-[#64748b] hover:bg-[#f1f5f9] rounded transition-colors">
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
