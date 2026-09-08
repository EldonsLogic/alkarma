import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { fields } = await req.json() as { fields: Record<string, string> };
  if (!fields || typeof fields !== "object") {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  await Promise.all(
    Object.entries(fields).map(([key, value]) =>
      prisma.storeSetting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    )
  );

  const isCampaign = Object.keys(fields).some((k) => k.startsWith("campaign_"));
  await audit(
    (session as { user?: { email?: string } })?.user?.email,
    isCampaign ? "settings.campaign_banner_updated" : "settings.content_updated",
    "Settings",
    isCampaign ? "campaign-banner" : "site-content",
    { updated: Object.keys(fields).join(", ") },
  );

  // Revalidate every storefront path that might use these settings
  revalidatePath("/");
  revalidatePath("/contact");
  revalidatePath("/about");
  revalidatePath("/faq");
  revalidatePath("/shipping");

  return NextResponse.json({ ok: true });
}
