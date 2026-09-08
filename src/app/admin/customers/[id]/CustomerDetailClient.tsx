"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  REFUNDED: "bg-red-100 text-red-600",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function CustomerDetailClient({ customer }: { customer: any }) {
  const router = useRouter();

  const [notes, setNotes] = useState<any[]>(customer.notes);
  const [noteBody, setNoteBody] = useState("");
  const [addingNote, setAddingNote] = useState(false);

  const [tags, setTags] = useState<string[]>(customer.tags);
  const [newTag, setNewTag] = useState("");
  const [addingTag, setAddingTag] = useState(false);

  const totalSpendEGP = customer.orders
    .filter((o: any) => !["CANCELLED", "REFUNDED"].includes(o.status))
    .reduce((s: number, o: any) => s + o.total, 0);

  async function handleAddNote() {
    if (!noteBody.trim()) return;
    setAddingNote(true);
    const res = await fetch(`/api/admin/customers/${customer.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteBody }),
    });
    setAddingNote(false);
    if (res.ok) {
      const note = await res.json();
      setNotes((prev) => [note, ...prev]);
      setNoteBody("");
    }
  }

  async function handleAddTag() {
    const tag = newTag.trim().toLowerCase().replace(/\s+/g, "-");
    if (!tag || tags.includes(tag)) return;
    setAddingTag(true);
    const res = await fetch(`/api/admin/customers/${customer.id}/tags`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    });
    setAddingTag(false);
    if (res.ok) {
      setTags((prev) => [...prev, tag]);
      setNewTag("");
    }
  }

  async function handleRemoveTag(tag: string) {
    const res = await fetch(`/api/admin/customers/${customer.id}/tags`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag }),
    });
    if (res.ok) setTags((prev) => prev.filter((t) => t !== tag));
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin/customers" className="text-[#64748b] hover:text-[#1e293b] text-[13px]">← Customers</Link>
        <span className="text-[#94a3b8]">/</span>
        <h1 className="text-[20px] font-black text-[#1e293b]">{customer.firstName} {customer.lastName}</h1>
        {customer.staffRole && (
          <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
            {customer.staffRole}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-5">
          {/* Orders */}
          <div className="bg-white border border-[#e2e8f0] rounded-sm p-5">
            <h2 className="text-[15px] font-black text-[#1e293b] mb-4">
              Orders ({customer.orders.length})
            </h2>
            {customer.orders.length === 0 ? (
              <p className="text-[13px] text-[#94a3b8]">No orders yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="text-[11px] uppercase text-[#64748b] border-b border-[#e2e8f0]">
                      <th className="text-left pb-2">Order</th>
                      <th className="text-left pb-2">Date</th>
                      <th className="text-left pb-2">Status</th>
                      <th className="text-right pb-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customer.orders.map((o: any) => (
                      <tr key={o.id} className="border-t border-[#f1f5f9]">
                        <td className="py-2.5">
                          <Link href={`/admin/orders/${o.id}`} className="font-bold text-[#3b82f6] hover:underline">
                            {o.orderNumber}
                          </Link>
                          <p className="text-[11px] text-[#94a3b8]">{o.items.slice(0, 2).map((i: any) => i.title).join(", ")}{o.items.length > 2 ? "…" : ""}</p>
                        </td>
                        <td className="py-2.5 text-[#64748b]">{formatDate(o.createdAt)}</td>
                        <td className="py-2.5">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${STATUS_COLORS[o.status] ?? "bg-gray-100 text-gray-600"}`}>
                            {o.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-right font-bold">{o.total} {o.currency}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="bg-white border border-[#e2e8f0] rounded-sm p-5">
            <h2 className="text-[15px] font-black text-[#1e293b] mb-4">Customer Notes</h2>
            <div className="mb-4 bg-[#f8fafc] border border-[#e2e8f0] rounded-sm p-4">
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={3}
                placeholder="Add a note about this customer..."
                className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] resize-none bg-white"
              />
              <div className="flex justify-end mt-2">
                <button onClick={handleAddNote} disabled={addingNote || !noteBody.trim()}
                  className="px-4 py-1.5 bg-[#1e293b] text-white text-[12px] font-bold rounded-sm hover:bg-[#334155] transition-colors disabled:opacity-50">
                  {addingNote ? "Adding..." : "Add Note"}
                </button>
              </div>
            </div>
            {notes.length === 0 ? (
              <p className="text-[13px] text-[#94a3b8]">No notes yet.</p>
            ) : (
              <div className="space-y-3">
                {notes.map((note: any) => (
                  <div key={note.id} className="border-l-2 border-[#3b82f6] pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[11px] text-[#94a3b8]">{formatDateTime(note.createdAt)}</span>
                      {note.authorEmail && <span className="text-[11px] text-[#64748b]">by {note.authorEmail}</span>}
                    </div>
                    <p className="text-[13px] text-[#1e293b] whitespace-pre-wrap">{note.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Info */}
          <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 text-[13px] space-y-2">
            <h2 className="text-[14px] font-black text-[#1e293b] mb-3">Contact Info</h2>
            <div><span className="text-[#64748b]">Email</span><p className="font-bold mt-0.5">{customer.email}</p></div>
            {customer.phone && <div><span className="text-[#64748b]">Phone</span><p className="font-bold mt-0.5">{customer.phone}</p></div>}
            {customer.country && <div><span className="text-[#64748b]">Country</span><p className="font-bold mt-0.5">{customer.country}</p></div>}
<div><span className="text-[#64748b]">Joined</span><p className="font-bold mt-0.5">{formatDate(customer.createdAt)}</p></div>
          </div>

          {/* Stats */}
          <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 text-[13px]">
            <h2 className="text-[14px] font-black text-[#1e293b] mb-3">Stats</h2>
            <div className="space-y-2">
              <div className="flex justify-between"><span className="text-[#64748b]">Total Orders</span><span className="font-bold">{customer.orders.length}</span></div>
              {totalSpendEGP > 0 && <div className="flex justify-between"><span className="text-[#64748b]">Spend</span><span className="font-bold">{totalSpendEGP.toLocaleString()}</span></div>}
              <div className="flex justify-between"><span className="text-[#64748b]">Wishlist</span><span className="font-bold">{customer.wishlistCount}</span></div>
            </div>
          </div>

          {/* Tags */}
          <div className="bg-white border border-[#e2e8f0] rounded-sm p-5">
            <h2 className="text-[14px] font-black text-[#1e293b] mb-3">Tags</h2>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 text-[11px] font-bold bg-[#f1f5f9] text-[#334155] px-2 py-0.5 rounded-full">
                  {tag}
                  <button onClick={() => handleRemoveTag(tag)} className="text-[#94a3b8] hover:text-red-500 leading-none">×</button>
                </span>
              ))}
              {tags.length === 0 && <p className="text-[12px] text-[#94a3b8]">No tags yet</p>}
            </div>
            <div className="flex gap-2">
              <input
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTag())}
                placeholder="Add tag..."
                className="flex-1 px-2 py-1.5 border border-[#e2e8f0] text-[12px] rounded-sm outline-none focus:border-[#3b82f6]"
              />
              <button onClick={handleAddTag} disabled={addingTag || !newTag.trim()}
                className="px-3 py-1.5 bg-[#1e293b] text-white text-[12px] font-bold rounded-sm hover:bg-[#334155] transition-colors disabled:opacity-50">
                Add
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
