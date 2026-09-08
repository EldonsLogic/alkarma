import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { getStaffRole } from "@/lib/permissions";

export const metadata = { title: "Gift Cards — Admin" };

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 16; i++) {
    if (i > 0 && i % 4 === 0) code += "-";
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function createGiftCard(formData: FormData) {
  "use server";
  // Only super admins may issue gift cards (they create real monetary value).
  const session = await auth();
  if (getStaffRole(session) !== "SUPER_ADMIN") return;

  const value = Number(formData.get("value"));
  if (!value || value <= 0) return;

  const code = generateCode();
  const created = await prisma.giftCard.create({
    data: {
      code,
      initialValue: value,
      balance: value,
      currency: (formData.get("currency") as string) || "EGP",
      recipientEmail: (formData.get("recipientEmail") as string)?.trim() || null,
      recipientName: (formData.get("recipientName") as string)?.trim() || null,
      message: (formData.get("message") as string)?.trim() || null,
      expiresAt: formData.get("expiresAt") ? new Date(formData.get("expiresAt") as string) : null,
    },
  });
  await audit(session?.user?.email, "giftcard.created", "GiftCard", created.id, { code, value });
  revalidatePath("/admin/gift-cards");
  redirect("/admin/gift-cards");
}

async function toggleGiftCard(formData: FormData) {
  "use server";
  const id = formData.get("id") as string;
  const current = formData.get("current") === "true";
  const gc = await prisma.giftCard.update({ where: { id }, data: { isActive: !current } });
  const session = await auth();
  await audit(session?.user?.email, current ? "giftcard.deactivated" : "giftcard.activated", "GiftCard", id, { code: gc.code });
  revalidatePath("/admin/gift-cards");
}

export default async function GiftCardsPage({ searchParams }: { searchParams: { add?: string } }) {
  const [cards, session] = await Promise.all([
    prisma.giftCard.findMany({ orderBy: { createdAt: "desc" }, include: { redemptions: true } }),
    auth(),
  ]);
  const isSuperAdmin = getStaffRole(session) === "SUPER_ADMIN";

  const totalIssued = cards.reduce((s, c) => s + c.initialValue, 0);
  const totalBalance = cards.reduce((s, c) => s + c.balance, 0);
  const totalRedeemed = totalIssued - totalBalance;

  return (
    <div>
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-[22px] font-black text-[#1e293b]">Gift Cards ({cards.length})</h1>
        {isSuperAdmin ? (
          !searchParams.add && (
            <a href="?add=1" className="px-4 py-2 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm transition-colors">
              + Issue Gift Card
            </a>
          )
        ) : (
          <span className="text-[12px] text-[#94a3b8] bg-[#f8fafc] border border-[#e2e8f0] rounded-sm px-3 py-2">
            🔒 Only super admins can issue gift cards
          </span>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: "Total Issued", value: `${totalIssued.toFixed(0)} EGP` },
          { label: "Redeemed", value: `${totalRedeemed.toFixed(0)} EGP` },
          { label: "Remaining Balance", value: `${totalBalance.toFixed(0)} EGP` },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-[#e2e8f0] rounded-sm p-4">
            <p className="text-[11px] font-bold uppercase text-[#94a3b8] mb-1">{s.label}</p>
            <p className="text-[22px] font-black text-[#1e293b]">{s.value}</p>
          </div>
        ))}
      </div>

      {isSuperAdmin && searchParams.add && (
        <div className="bg-white border border-[#e2e8f0] rounded-sm p-6 mb-6">
          <h2 className="text-[15px] font-black text-[#1e293b] mb-4">Issue New Gift Card</h2>
          <form action={createGiftCard} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Value *</label>
                <input type="number" name="value" required min="1" placeholder="500"
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Expires At</label>
                <input type="date" name="expiresAt"
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Recipient Name</label>
                <input name="recipientName" placeholder="Optional"
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Recipient Email</label>
                <input type="email" name="recipientEmail" placeholder="Optional"
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
              </div>
            </div>
            <div>
              <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1">Gift Message</label>
              <textarea name="message" rows={2} placeholder="Optional personal message..."
                className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] resize-none" />
            </div>
            <div className="flex gap-3">
              <button type="submit" className="px-5 py-2.5 bg-[#3b82f6] hover:bg-[#2563eb] text-white text-[13px] font-bold rounded-sm">Issue Card</button>
              <a href="/admin/gift-cards" className="px-5 py-2.5 border border-[#e2e8f0] text-[#64748b] text-[13px] font-bold rounded-sm hover:border-[#3b82f6]">Cancel</a>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
        <table className="w-full text-[13px]">
          <thead className="bg-[#f8fafc] border-b border-[#e2e8f0]">
            <tr>
              {["Code", "Value", "Balance", "Recipient", "Expires", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-[11px] font-bold uppercase text-[#64748b] tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#f1f5f9]">
            {cards.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-12 text-center text-[#94a3b8]">No gift cards yet</td></tr>
            ) : cards.map((card) => (
              <tr key={card.id} className="hover:bg-[#f8fafc]">
                <td className="px-4 py-3 font-mono font-bold text-[#1e293b] tracking-wider">{card.code}</td>
                <td className="px-4 py-3 font-bold">{card.initialValue} {card.currency}</td>
                <td className="px-4 py-3">
                  <span className={card.balance <= 0 ? "text-[#94a3b8]" : "text-[#2e7d52] font-bold"}>
                    {card.balance} {card.currency}
                  </span>
                </td>
                <td className="px-4 py-3 text-[#64748b]">
                  {card.recipientName || card.recipientEmail || <span className="text-[#94a3b8]">—</span>}
                </td>
                <td className="px-4 py-3 text-[#64748b]">
                  {card.expiresAt ? new Date(card.expiresAt).toLocaleDateString() : <span className="text-[#94a3b8]">Never</span>}
                </td>
                <td className="px-4 py-3">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${card.isActive && card.balance > 0 ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                    {!card.isActive ? "Disabled" : card.balance <= 0 ? "Spent" : "Active"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <form action={toggleGiftCard} className="inline">
                    <input type="hidden" name="id" value={card.id} />
                    <input type="hidden" name="current" value={String(card.isActive)} />
                    <button type="submit" className={`text-[12px] font-bold hover:underline ${card.isActive ? "text-red-500" : "text-[#3b82f6]"}`}>
                      {card.isActive ? "Disable" : "Enable"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
