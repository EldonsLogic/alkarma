"use client";

import { useState } from "react";

const STRINGS = {
    heroLabel: "تواصل معنا",
    heroTitle: "اتصل بنا",
    heroSubtitle: "نسعد بالتواصل معك",
    formTitle: "أرسل لنا رسالة",
    labelName: "الاسم *",
    labelEmail: "البريد الإلكتروني *",
    labelSubject: "الموضوع *",
    labelMessage: "الرسالة *",
    selectPlaceholder: "اختر موضوعًا...",
    subjects: [
      { value: "order", label: "استفسار عن طلب" },
      { value: "return", label: "إرجاع / استرداد" },
      { value: "book", label: "توفر كتاب" },
      { value: "account", label: "مساعدة في الحساب" },
      { value: "other", label: "أخرى" },
    ],
    btnSend: "إرسال",
    btnSending: "جارٍ الإرسال...",
    sentTitle: "تم إرسال رسالتك!",
    sentBody: "شكرًا للتواصل معنا. بنسعى نرد خلال ١–٢ يوم عمل.",
    sideInfo: [
      {
        icon: "📧",
        title: "البريد الإلكتروني",
        lines: ["info@alkarmabooks.com", "info@alkarmabooks.com"],
      },
      {
        icon: "🕐",
        title: "ساعات الدعم",
        lines: ["الأحد – الخميس", "٩ ص – ٦ م (بتوقيت القاهرة)"],
      },
      {
        icon: "📦",
        title: "دعم الطلبات",
        lines: [
          "لمشاكل الطلبات، يرجى ذكر",
          "رقم الطلب في رسالتك.",
        ],
      },
    ],
  } as const;

interface ContactFormProps {
}

export function ContactForm({  }: ContactFormProps) {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const t = STRINGS;

  function set(key: string) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setSent(true);
    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-paper-mid" dir="rtl">
      <div className="bg-ink py-14 sm:py-20 px-4 sm:px-10 text-center">
        <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-brand block mb-4">
          {t.heroLabel}
        </span>
        <h1
          className="font-display font-bold text-paper leading-tight mb-4"
          style={{ fontSize: "clamp(32px, 5vw, 56px)" }}
        >
          {t.heroTitle}
        </h1>
        <p className="text-[15px] text-paper/60 font-light max-w-[400px] mx-auto">
          {t.heroSubtitle}
        </p>
      </div>

      <div className="max-w-[900px] mx-auto px-4 sm:px-10 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-10">
          {/* Form */}
          <div className="bg-paper border border-paper-dark p-8">
            {sent ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#16a34a"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h2 className="text-[20px] font-black mb-2">{t.sentTitle}</h2>
                <p className="text-[14px] text-ink-soft">{t.sentBody}</p>
              </div>
            ) : (
              <>
                <h2 className="text-[18px] font-black text-ink mb-6">{t.formTitle}</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-soft mb-1.5">
                        {t.labelName}
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={set("name")}
                        required
                        className="w-full px-4 py-3 border border-paper-dark text-[14px] outline-none focus:border-brand transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-soft mb-1.5">
                        {t.labelEmail}
                      </label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={set("email")}
                        required
                        className="w-full px-4 py-3 border border-paper-dark text-[14px] outline-none focus:border-brand transition-colors"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-soft mb-1.5">
                      {t.labelSubject}
                    </label>
                    <select
                      value={form.subject}
                      onChange={set("subject")}
                      required
                      className="w-full px-4 py-3 border border-paper-dark text-[14px] outline-none focus:border-brand bg-paper transition-colors"
                    >
                      <option value="">{t.selectPlaceholder}</option>
                      {t.subjects.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[12px] font-bold uppercase tracking-wide text-ink-soft mb-1.5">
                      {t.labelMessage}
                    </label>
                    <textarea
                      value={form.message}
                      onChange={set("message")}
                      required
                      rows={5}
                      className="w-full px-4 py-3 border border-paper-dark text-[14px] outline-none focus:border-brand resize-y transition-colors"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-[14px] bg-brand hover:bg-brand-dark text-paper font-bold uppercase tracking-wide text-[14px] transition-colors disabled:opacity-60"
                  >
                    {loading ? t.btnSending : t.btnSend}
                  </button>
                </form>
              </>
            )}
          </div>

          {/* Side info */}
          <div className="space-y-6">
            {t.sideInfo.map((item) => (
              <div key={item.title} className="bg-paper border border-paper-dark px-5 py-4 flex gap-4">
                <span className="text-[28px] flex-shrink-0">{item.icon}</span>
                <div>
                  <p className="text-[13px] font-black text-ink mb-1">{item.title}</p>
                  {item.lines.map((l) => (
                    <p key={l} className="text-[13px] text-ink-muted">{l}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
