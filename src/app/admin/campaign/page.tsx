import { prisma } from "@/lib/prisma";
import { CampaignBannerClient } from "./CampaignBannerClient";

export const metadata = { title: "Campaign Banner — Admin" };

export default async function CampaignBannerPage() {
  const rows = await prisma.storeSetting.findMany({
    where: { key: { in: [
      "campaign_image_url", "campaign_image_mobile_url", "campaign_cta_href",
      "campaign_image_url_ar", "campaign_image_mobile_url_ar", "campaign_cta_href_ar",
    ] } },
  });
  const settings: Record<string, string> = {};
  rows.forEach((r) => { settings[r.key] = r.value; });

  return <CampaignBannerClient initialSettings={settings} />;
}
