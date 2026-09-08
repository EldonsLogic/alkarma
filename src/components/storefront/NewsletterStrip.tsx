"use client";

import { useState } from "react";

interface NewsletterContent {
  heading?: string;
  headingAr?: string;
  subtext?: string;
  subtextAr?: string;
}

export function NewsletterStrip({ content }: { content?: NewsletterContent }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const t = {
    overline: "النشرة البريدية",
    title: (content?.headingAr || "ابقَ على اطلاع"),
    subtitle: (content?.subtextAr || "اشترك لتصلك الإصدارات الجديدة والعروض الحصرية"),
    placeholder: "بريدك الإلكتروني",
    button: "اشتراك",
    thanks: "🎉 شكرًا على اشتراكك!",
    error: "حدث خطأ. حاول مرة أخرى.",
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source: "homepage" }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? t.error);
      } else {
        setSubmitted(true);
      }
    } catch {
      setError(t.error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="bg-paper-mid border-t border-paper-dark py-6 sm:py-8 px-4 sm:px-10">
      <div className="max-w-xl mx-auto text-center">
        <span className="section-overline">{t.overline}</span>
        <p className="text-[14px] text-ink-muted mb-6 mt-2">{t.subtitle}</p>

        {submitted ? (
          <p className="text-[15px] font-bold text-[#2e7d52]">{t.thanks}</p>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-0 max-w-sm mx-auto">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.placeholder}
                required
                disabled={loading}
                className="flex-1 px-4 py-3 text-[14px] border border-paper-dark bg-paper sm:border-e-0 rounded-none outline-none focus:border-brand transition-colors disabled:opacity-60 placeholder:text-ink-muted"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-ink hover:bg-brand text-paper text-[13px] font-bold uppercase tracking-[0.06em] transition-colors disabled:opacity-60"
              >
                {loading ? "…" : t.button}
              </button>
            </form>
            {error && (
              <p className="text-red-600 text-[13px] mt-2">{error}</p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
