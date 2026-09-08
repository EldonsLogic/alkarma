import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { EmailTemplateEditorClient } from "./EmailTemplateEditorClient";

export const metadata = { title: "Email Templates — Admin" };

const DEFAULT_TEMPLATES = [
  { key: "order_confirmed", name: "Order Confirmed", subject: "Your order {{orderNumber}} is confirmed!", body: "<p>Hi {{firstName}},</p><p>Thank you for your order <strong>{{orderNumber}}</strong>. We've received it and it's being processed.</p><p>Total: <strong>{{total}} {{currency}}</strong></p><p>We'll notify you when it ships.</p><p>فريق دار الكرمة</p>" },
  { key: "order_shipped", name: "Order Shipped", subject: "Your order {{orderNumber}} is on its way!", body: "<p>Hi {{firstName}},</p><p>Great news! Your order <strong>{{orderNumber}}</strong> has been shipped.</p>{{#if trackingNumber}}<p>Tracking: <strong>{{trackingNumber}}</strong> via {{carrierName}}</p>{{/if}}<p>فريق دار الكرمة</p>" },
  { key: "order_delivered", name: "Order Delivered", subject: "Your order has been delivered!", body: "<p>Hi {{firstName}},</p><p>Your order <strong>{{orderNumber}}</strong> has been delivered. Enjoy your books!</p><p>Please leave a review if you liked your purchase.</p><p>فريق دار الكرمة</p>" },
  { key: "welcome", name: "Welcome Email", subject: "أهلًا بك في دار الكرمة!", body: "<p>Hi {{firstName}},</p><p>أهلًا بك في دار الكرمة! We're excited to have you.</p><p>Browse our collection at <a href='https://alkarmabooks.com'>alkarmabooks.com</a></p><p>فريق دار الكرمة</p>" },
  { key: "abandoned_cart", name: "Abandoned Cart Recovery", subject: "You left something behind…", body: "<p>Hi {{firstName}},</p><p>You left <strong>{{itemCount}} item(s)</strong> in your cart. Come back and complete your order!</p><p><a href='https://alkarmabooks.com/cart'>Return to Cart →</a></p><p>فريق دار الكرمة</p>" },
  { key: "password_reset", name: "Password Reset", subject: "إعادة تعيين كلمة مرور حسابك في دار الكرمة", body: "<p>Hi {{firstName}},</p><p>Click the link below to reset your password. This link expires in 1 hour.</p><p><a href='{{resetLink}}'>Reset Password →</a></p><p>If you didn't request this, ignore this email.</p>" },
];

async function saveTemplate(formData: FormData) {
  "use server";
  const key = formData.get("key") as string;
  const subject = formData.get("subject") as string;
  const body = formData.get("body") as string;
  const isActive = formData.get("isActive") === "on";

  await prisma.emailTemplate.upsert({
    where: { key },
    update: { subject, body, isActive },
    create: { key, name: DEFAULT_TEMPLATES.find((t) => t.key === key)?.name ?? key, subject, body, isActive },
  });
  revalidatePath("/admin/email-templates");
}

export default async function EmailTemplatesPage({ searchParams }: { searchParams: { edit?: string } }) {
  const saved = await prisma.emailTemplate.findMany();
  const savedMap = Object.fromEntries(saved.map((t) => [t.key, t]));

  const templates = DEFAULT_TEMPLATES.map((t) => ({
    ...t,
    ...(savedMap[t.key] ?? {}),
    isCustomised: !!savedMap[t.key],
  }));

  const editing = searchParams.edit ? templates.find((t) => t.key === searchParams.edit) : null;

  return (
    <div>
      <h1 className="text-[22px] font-black text-[#1e293b] mb-2">Email Templates</h1>
      <p className="text-[13px] text-[#64748b] mb-6">Customise transactional emails. Use <code className="bg-[#f1f5f9] px-1 rounded text-[11px]">{"{{variable}}"}</code> for dynamic values.</p>

      {editing ? (
        <EmailTemplateEditorClient template={editing} onSave={saveTemplate} />
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div key={t.key} className="bg-white border border-[#e2e8f0] rounded-sm p-4 flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-[#1e293b] text-[14px]">{t.name}</h3>
                  {"isCustomised" in t && t.isCustomised ? (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">Customised</span>
                  ) : (
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Default</span>
                  )}
                </div>
                <p className="text-[12px] font-mono text-[#94a3b8]">{t.subject}</p>
              </div>
              <a href={`?edit=${t.key}`} className="px-3 py-1.5 text-[12px] font-bold border border-[#e2e8f0] rounded-sm text-[#3b82f6] hover:border-[#3b82f6] flex-shrink-0">Edit</a>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
