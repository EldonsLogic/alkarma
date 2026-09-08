import { prisma } from "@/lib/prisma";
import { PageEditorClient } from "./PageEditorClient";

export default async function PageEditorPage({ params }: { params: { slug: string } }) {
  const isNew = params.slug === "new";
  const page = isNew ? null : await prisma.page.findUnique({ where: { slug: params.slug } });
  return <PageEditorClient page={page} defaultSlug={isNew ? "" : params.slug} />;
}
