"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Item {
  id: string;
  bookId: string | null;
  title: string;
  quantity: number;
}

interface Props {
  orderId: string;
  items: Item[];
  /** An existing return's status, if one has already been requested. */
  existingStatus?: string | null;
}

const STATUS_LABEL: Record<string, { en: string; ar: string }> = {
  REQUESTED: { en: "Return requested", ar: "تم طلب الإرجاع" },
  APPROVED: { en: "Return approved", ar: "تمت الموافقة على الإرجاع" },
  RECEIVED: { en: "Return received", ar: "تم استلام الإرجاع" },
  REFUNDED: { en: "Refunded", ar: "تم استرداد المبلغ" },
  REJECTED: { en: "Return rejected", ar: "تم رفض الإرجاع" },
};

export function RequestReturn({ orderId, items, existingStatus }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(items.map((i) => [i.id, true])),
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const t = {
    title: "إرجاع أو استبدال",
    request: "طلب إرجاع",
    which: "اختر المنتجات المراد إرجاعها",
    reason: "سبب الإرجاع",
    reasonPh: "مثال: الكتاب وصل تالفًا",
    submit: "إرسال الطلب",
    cancel: "إلغاء",
    submitting: "جارٍ الإرسال…",
    done: "تم استلام طلب الإرجاع — سنراجعه ونتواصل معك.",
    needItem: "اختر منتجًا واحدًا على الأقل.",
    needReason: "يرجى كتابة سبب الإرجاع.",
  };

  if (existingStatus) {
    const s = STATUS_LABEL[existingStatus] ?? { en: existingStatus, ar: existingStatus };
    return (
      <div className="bg-white border border-[#ddd] rounded-sm p-5">
        <h2 className="text-[15px] font-black mb-2">{t.title}</h2>
        <p className="text-[13px] text-ink-soft">
          حالة الإرجاع:{" "}
          <span className="font-bold text-brand">{s.ar}</span>
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-sm p-5">
        <p className="text-[13px] text-green-700 font-semibold">{t.done}</p>
      </div>
    );
  }

  async function submit() {
    setError("");
    const chosen = items.filter((i) => selected[i.id]);
    if (!chosen.length) return setError(t.needItem);
    if (reason.trim().length < 3) return setError(t.needReason);
    setSubmitting(true);
    try {
      const res = await fetch("/api/returns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          reason: reason.trim(),
          items: chosen.map((i) => ({ bookId: i.bookId, title: i.title, qty: i.quantity })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to submit.");
      setDone(true);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white border border-[#ddd] rounded-sm p-5">
      <h2 className="text-[15px] font-black mb-1">{t.title}</h2>
      {!open ? (
        <>
          <p className="text-[12px] text-ink-muted mb-3">
            يمكنك طلب إرجاع خلال ١٤ يومًا من الاستلام.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="px-5 py-2.5 border-2 border-ink hover:bg-ink hover:text-paper text-ink font-bold uppercase tracking-wide text-[13px] transition-colors"
          >
            {t.request}
          </button>
        </>
      ) : (
        <div className="space-y-4 mt-2">
          <div>
            <p className="text-[12px] font-bold uppercase tracking-wide text-ink-muted mb-2">{t.which}</p>
            <div className="space-y-1.5">
              {items.map((i) => (
                <label key={i.id} className="flex items-center gap-2.5 text-[13px] text-ink-soft cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!selected[i.id]}
                    onChange={(e) => setSelected((p) => ({ ...p, [i.id]: e.target.checked }))}
                    className="accent-brand w-4 h-4"
                  />
                  <span dir="auto">{i.title} <span className="text-ink-muted">×{i.quantity}</span></span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-muted mb-1.5">{t.reason}</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={t.reasonPh}
              rows={3}
              dir="auto"
              className="w-full px-3 py-2 border border-[#ddd] text-[13px] rounded-sm outline-none focus:border-brand resize-y"
            />
          </div>
          {error && <p className="text-[12px] text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button
              onClick={submit}
              disabled={submitting}
              className="px-5 py-2.5 bg-brand hover:bg-brand-dark disabled:opacity-60 text-paper font-bold uppercase tracking-wide text-[13px] transition-colors"
            >
              {submitting ? t.submitting : t.submit}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-5 py-2.5 border border-[#ddd] text-ink-soft font-bold text-[13px] hover:border-ink transition-colors"
            >
              {t.cancel}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
