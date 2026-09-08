import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CmsPageView } from "@/components/storefront/CmsPageView";
import { LegalDocument } from "@/components/storefront/LegalDocument";
import { canonical } from "@/lib/seo";
import { PRIVACY_HTML } from "@/content/legal/privacy";

export const metadata: Metadata = {
  title: "سياسة الخصوصية",
  description: "سياسة الخصوصية الخاصة بدار الكرمة — كيف نجمع بياناتك الشخصية ونستخدمها ونحميها.",
  ...canonical("/privacy"),
};

export default async function PrivacyPage() {
  const dbPage = await prisma.page
    .findFirst({ where: { slug: "privacy", isPublished: true } })
    .catch(() => null);

  if (dbPage) {
    return <CmsPageView page={dbPage} heroLabel="الخصوصية" heroSubtitle="كيف نحمي بياناتك" />;
  }

  return (
    <LegalDocument
      label="الخصوصية"
      title="سياسة الخصوصية"
      subtitle="كيف نحمي بياناتك"
      html={PRIVACY_HTML}
    />
  );
}
