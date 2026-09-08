import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { CmsPageView } from "@/components/storefront/CmsPageView";
import { ContactForm } from "./ContactForm";
import { canonical } from "@/lib/seo";

export const metadata: Metadata = {
  title: "تواصل معنا",
  description: "Get in touch with the دار الكرمة team.",
  ...canonical("/contact"),
};

export default async function ContactPage() {
  const [dbPage] = await Promise.all([
    prisma.page
      .findFirst({ where: { slug: "contact", isPublished: true } })
      .catch(() => null),
  ]);

  if (dbPage) {
    return (
      <CmsPageView
        page={dbPage}
        heroLabel="تواصل معنا"
        heroSubtitle="يسعدنا أن نسمع منك"
      />
    );
  }

  return <ContactForm />;
}
