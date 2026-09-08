import { prisma } from "@/lib/prisma";
import { ContentManagerClient } from "./ContentManagerClient";

export const metadata = { title: "Site Content — Admin" };

export default async function ContentPage() {
  // Load every StoreSetting so the client has pre-filled values
  const rows = await prisma.storeSetting.findMany();
  const settings: Record<string, string> = {};
  rows.forEach((r) => { settings[r.key] = r.value; });

  return <ContentManagerClient initialSettings={settings} />;
}
