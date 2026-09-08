"use client";

import { useState } from "react";
import { FAQ_ITEMS, FAQ_SECTIONS } from "./faq-items";

const STRINGS = {
    heroLabel: "مركز المساعدة",
    heroTitle: "الأسئلة الشائعة",
    heroSubtitle: "إجابات سريعة على الأسئلة الشائعة",
    stillTitle: "إذا كانت لديك أسئلة أخرى",
    stillBody: "فريق الدعم يسعده مساعدتك في أي أمر غير موجود هنا.",
    ctaBtn: "تواصل معنا الآن",
  } as const;

interface FaqContentProps {
}

export function FaqContent({  }: FaqContentProps) {
  const [open, setOpen] = useState<number | null>(null);
  const t = STRINGS;

  return (
    <div className="min-h-screen bg-paper-mid" dir="rtl">
      <div className="bg-ink py-14 sm:py-20 px-4 sm:px-10 text-center">
        <span className="font-mono text-[11px] tracking-[0.18em] uppercase text-brand block mb-4">
          {t.heroLabel}
        </span>
        <h1
          className="font-display font-bold text-paper leading-tight mb-4"
          style={{ fontSize: "clamp(28px, 5vw, 52px)" }}
        >
          {t.heroTitle}
        </h1>
        <p className="text-[15px] text-paper/60 font-light">{t.heroSubtitle}</p>
      </div>

      <div className="max-w-[760px] mx-auto px-4 sm:px-10 py-12">
        {FAQ_SECTIONS.map((section) => (
          <section key={section} className="mb-8 last:mb-0">
            <h2 className="font-display text-[19px] font-bold text-ink mb-3 pb-2 border-b-2 border-brand inline-block">
              {section}
            </h2>
            <div className="space-y-2">
          {FAQ_ITEMS.map((item, i) => item.section !== section ? null : (
            <div key={i} className="bg-paper border border-paper-dark">
              <button
                onClick={() => setOpen(open === i ? null : i)}
                className="w-full flex items-center justify-between px-5 py-4 text-start gap-4 hover:bg-paper transition-colors"
              >
                <span className="font-display text-[16px] font-semibold text-ink">
                  {item.q}
                </span>
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className={`flex-shrink-0 text-brand transition-transform ${open === i ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>
              {open === i && (
                <div className="px-5 pb-4 border-t border-paper-dark">
                  {/* Answers may contain numbered steps separated by newlines. */}
                  <p className="text-[14px] text-ink-soft leading-relaxed pt-3 font-light whitespace-pre-line">
                    {item.a}
                  </p>
                </div>
              )}
            </div>
          ))}
            </div>
          </section>
        ))}

        <div className="mt-10 bg-paper border border-paper-dark p-8 text-center">
          <p className="font-display text-[18px] font-semibold text-ink mb-2">{t.stillTitle}</p>
          <p className="text-[14px] text-ink-soft mb-5">{t.stillBody}</p>
          <a
            href="/contact"
            className="inline-block px-8 py-3 bg-brand hover:bg-brand-dark text-paper font-bold uppercase tracking-wide text-[14px] transition-colors"
          >
            {t.ctaBtn}
          </a>
        </div>
      </div>
    </div>
  );
}
