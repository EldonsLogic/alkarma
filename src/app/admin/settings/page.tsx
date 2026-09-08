import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata = { title: "Settings — Admin" };

export default function AdminSettingsPage() {
  // All settings have been consolidated into Site Content
  redirect("/admin/content");
}
