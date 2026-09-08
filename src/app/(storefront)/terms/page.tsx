import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CmsPageView } from "@/components/storefront/CmsPageView";
import { LegalDocument } from "@/components/storefront/LegalDocument";
import { canonical } from "@/lib/seo";
import { TERMS_HTML } from "@/content/legal/terms";

export const metadata: Metadata = {
  title: "الشروط والأحكام",
  description: "اتفاقية وشروط استخدام موقع دار الكرمة.",
  ...canonical("/terms"),
};

export default async function TermsPage() {
  const dbPage = await prisma.page
    .findFirst({ where: { slug: "terms", isPublished: true } })
    .catch(() => null);

  if (dbPage) {
    return <CmsPageView page={dbPage} heroLabel="قانوني" heroSubtitle="اتفاقية وشروط الاستخدام" />;
  }

  return (
    <LegalDocument
      label="قانوني"
      title="الشروط والأحكام"
      subtitle="اتفاقية وشروط الاستخدام"
      html={TERMS_HTML}
    />
  );
}
