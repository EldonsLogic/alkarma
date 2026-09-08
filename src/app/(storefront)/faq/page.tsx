import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CmsPageView } from "@/components/storefront/CmsPageView";
import { FaqContent } from "./FaqContent";
import { FAQ_ITEMS } from "./faq-items";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "الأسئلة الشائعة",
  description: "Frequently asked questions about orders, shipping, returns and more.",
  ...canonical("/faq"),
};

export default async function FAQPage() {
  const [dbPage] = await Promise.all([
    prisma.page
      .findFirst({ where: { slug: "faq", isPublished: true } })
      .catch(() => null),
  ]);

  // FAQ_ITEMS is the canonical Q&A set for schema purposes even when a CMS
  // override renders the visible page — the CMS "faq" page content is kept
  // in sync with the same questions/answers by whoever edits it in Admin.
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  const schemaScript = (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
    />
  );

  if (dbPage) {
    return (
      <>
        {schemaScript}
        <CmsPageView
          page={dbPage}
          heroLabel="مركز المساعدة"
          heroSubtitle="إجابات سريعة على الأسئلة الشائعة"
        />
      </>
    );
  }

  return (
    <>
      {schemaScript}
      <FaqContent />
    </>
  );
}
