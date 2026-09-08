"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { governorateName } from "@/lib/governorates";

const STATUSES = ["PENDING","CONFIRMED","PROCESSING","SHIPPED","DELIVERED","RETURNED","CANCELLED","REFUNDED"];
const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  CONFIRMED: "bg-blue-100 text-blue-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-green-100 text-green-700",
  RETURNED: "bg-brand-100 text-brand-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  REFUNDED: "bg-red-100 text-red-600",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function OrderManageClient({ order }: { order: any }) {
  const router = useRouter();

  // Core fields
  const [status, setStatus] = useState(order.status);
  const [tracking, setTracking] = useState(order.trackingNumber ?? "");
  const [carrier, setCarrier] = useState(order.carrierName ?? "");
  const [adminNotes, setAdminNotes] = useState(order.adminNotes ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Order notes
  const [notes, setNotes] = useState<any[]>(order.orderNotes ?? []);
  const [noteBody, setNoteBody] = useState("");
  const [notePrivate, setNotePrivate] = useState(true);
  const [addingNote, setAddingNote] = useState(false);

  // Refund
  const [showRefund, setShowRefund] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refunding, setRefunding] = useState(false);

  async function handleSave() {
    setSaving(true);
    const res = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, trackingNumber: tracking, carrierName: carrier, adminNotes }),
    });
    setSaving(false);
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); router.refresh(); }
  }

  async function handleAddNote() {
    if (!noteBody.trim()) return;
    setAddingNote(true);
    const res = await fetch(`/api/admin/orders/${order.id}/notes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: noteBody, isPrivate: notePrivate }),
    });
    setAddingNote(false);
    if (res.ok) {
      const note = await res.json();
      setNotes((prev) => [note, ...prev]);
      setNoteBody("");
    }
  }

  async function handleRefund() {
    if (!refundAmount || Number(refundAmount) <= 0) return;
    setRefunding(true);
    const res = await fetch(`/api/admin/orders/${order.id}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Number(refundAmount), reason: refundReason }),
    });
    setRefunding(false);
    if (res.ok) { setShowRefund(false); router.refresh(); }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 print:hidden">
        <Link href="/admin/orders" className="text-[#64748b] hover:text-[#1e293b] text-[13px]">← Orders</Link>
        <span className="text-[#94a3b8]">/</span>
        <h1 className="text-[20px] font-black text-[#1e293b]">{order.orderNumber}</h1>
        <span className={`text-[12px] font-bold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[order.status]}`}>
          {order.status}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <button onClick={handlePrint}
            className="px-3 py-1.5 border border-[#e2e8f0] text-[12px] font-bold rounded-sm hover:bg-[#f8fafc] transition-colors">
            🖨 Print Invoice
          </button>
          {order.status !== "REFUNDED" && order.paymentStatus === "PAID" && (
            <button onClick={() => setShowRefund(true)}
              className="px-3 py-1.5 bg-red-50 border border-red-200 text-[12px] font-bold text-red-600 rounded-sm hover:bg-red-100 transition-colors">
              Issue Refund
            </button>
          )}
        </div>
      </div>

      {/* Refund Modal */}
      {showRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 print:hidden">
          <div className="bg-white rounded-sm border border-[#e2e8f0] p-6 w-full max-w-md shadow-xl">
            <h2 className="text-[16px] font-black text-[#1e293b] mb-4">Issue Refund</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1.5">
                  Refund Amount ({order.currency})
                </label>
                <input
                  type="number"
                  value={refundAmount}
                  onChange={(e) => setRefundAmount(e.target.value)}
                  placeholder={`Max ${order.total}`}
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]"
                />
                <p className="text-[11px] text-[#94a3b8] mt-1">Order total: {order.total} {order.currency}</p>
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1.5">Reason (optional)</label>
                <textarea
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  rows={3}
                  placeholder="Customer request, damaged item, etc."
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] resize-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={handleRefund} disabled={refunding}
                  className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-[13px] rounded-sm transition-colors disabled:opacity-60">
                  {refunding ? "Processing..." : "Confirm Refund"}
                </button>
                <button onClick={() => setShowRefund(false)}
                  className="flex-1 py-2.5 border border-[#e2e8f0] font-bold text-[13px] rounded-sm hover:bg-[#f8fafc] transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print invoice header (only visible when printing) */}
      <div className="hidden print:block mb-8">
        <h1 className="text-2xl font-black">Invoice — {order.orderNumber}</h1>
        <p className="text-sm text-gray-500">{formatDate(order.createdAt)}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        <div className="space-y-5">
          {/* Items */}
          <div className="bg-white border border-[#e2e8f0] rounded-sm p-5">
            <h2 className="text-[15px] font-black text-[#1e293b] mb-4">Order Items</h2>
            <ul className="space-y-3">
              {order.items.map((item: any) => (
                <li key={item.id} className="flex items-center gap-3 py-2 border-b border-[#f1f5f9] last:border-0">
                  {item.book?.coverUrl ? (
                    <img src={item.book.coverUrl} alt={item.title} className="w-10 h-14 object-cover flex-shrink-0 bg-[#f1f5f9]" />
                  ) : (
                    <div className="w-10 h-14 bg-[#f1f5f9] flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <p className="text-[13px] font-bold">{item.title}</p>
                    <p className="text-[12px] text-[#94a3b8]">Qty: {item.quantity} × {item.unitPrice} {order.currency}</p>
                  </div>
                  <p className="text-[13px] font-bold">{(item.unitPrice * item.quantity).toFixed(2)} {order.currency}</p>
                </li>
              ))}
            </ul>
            <div className="mt-4 pt-4 border-t border-[#e2e8f0] space-y-2 text-[13px]">
              <div className="flex justify-between"><span className="text-[#64748b]">Subtotal</span><span className="font-bold">{order.subtotal} {order.currency}</span></div>
              <div className="flex justify-between"><span className="text-[#64748b]">Shipping</span><span className="font-bold">{order.shippingFee} {order.currency}</span></div>
              {order.discount > 0 && <div className="flex justify-between text-[#2e7d52]"><span>Discount</span><span className="font-bold">−{order.discount}</span></div>}
              <div className="flex justify-between font-black text-[15px] border-t pt-2"><span>Total</span><span>{order.total} {order.currency}</span></div>
              {order.refundAmount && (
                <div className="flex justify-between text-red-600 font-bold">
                  <span>Refunded</span>
                  <span>−{order.refundAmount} {order.currency}</span>
                </div>
              )}
            </div>
          </div>

          {/* Update */}
          <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 print:hidden">
            <h2 className="text-[15px] font-black text-[#1e293b] mb-4">Update Order</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1.5">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value)}
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm bg-white outline-none focus:border-[#3b82f6]">
                  {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1.5">Tracking Number</label>
                  <input value={tracking} onChange={(e) => setTracking(e.target.value)}
                    className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
                </div>
                <div>
                  <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1.5">Carrier</label>
                  <input value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="e.g. Aramex"
                    className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6]" />
                </div>
              </div>
              <div>
                <label className="block text-[12px] font-bold uppercase text-[#64748b] mb-1.5">Admin Notes</label>
                <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3}
                  className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] resize-none" />
              </div>
              <button onClick={handleSave} disabled={saving}
                className={`px-6 py-2.5 font-bold text-[13px] rounded-sm transition-colors ${saved ? "bg-[#2e7d52] text-white" : "bg-[#3b82f6] hover:bg-[#2563eb] text-white disabled:opacity-60"}`}>
                {saved ? "Saved ✓" : saving ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>

          {/* Order Notes Timeline */}
          <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 print:hidden">
            <h2 className="text-[15px] font-black text-[#1e293b] mb-4">Order Notes</h2>

            {/* Add note */}
            <div className="mb-5 bg-[#f8fafc] border border-[#e2e8f0] rounded-sm p-4">
              <textarea
                value={noteBody}
                onChange={(e) => setNoteBody(e.target.value)}
                rows={3}
                placeholder="Add an internal note..."
                className="w-full px-3 py-2 border border-[#e2e8f0] text-[13px] rounded-sm outline-none focus:border-[#3b82f6] resize-none bg-white"
              />
              <div className="flex items-center justify-between mt-2">
                <label className="flex items-center gap-2 text-[12px] text-[#64748b] cursor-pointer">
                  <input type="checkbox" checked={notePrivate} onChange={(e) => setNotePrivate(e.target.checked)}
                    className="rounded" />
                  Private (not visible to customer)
                </label>
                <button onClick={handleAddNote} disabled={addingNote || !noteBody.trim()}
                  className="px-4 py-1.5 bg-[#1e293b] text-white text-[12px] font-bold rounded-sm hover:bg-[#334155] transition-colors disabled:opacity-50">
                  {addingNote ? "Adding..." : "Add Note"}
                </button>
              </div>
            </div>

            {/* Timeline */}
            {notes.length === 0 ? (
              <p className="text-[13px] text-[#94a3b8] text-center py-4">No notes yet</p>
            ) : (
              <div className="space-y-3">
                {notes.map((note: any) => (
                  <div key={note.id} className={`relative pl-5 border-l-2 ${note.isPrivate ? "border-amber-300" : "border-[#3b82f6]"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {note.isPrivate ? (
                        <span className="text-[10px] font-bold uppercase text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Private</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">Customer visible</span>
                      )}
                      <span className="text-[11px] text-[#94a3b8]">{formatDate(note.createdAt)}</span>
                      {note.authorEmail && (
                        <span className="text-[11px] text-[#64748b]">by {note.authorEmail}</span>
                      )}
                    </div>
                    <p className="text-[13px] text-[#1e293b] whitespace-pre-wrap">{note.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Returns */}
          {order.returns && order.returns.length > 0 && (
            <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 print:hidden">
              <h2 className="text-[15px] font-black text-[#1e293b] mb-4">Returns / RMA</h2>
              <div className="space-y-3">
                {order.returns.map((ret: any) => (
                  <div key={ret.id} className="border border-[#e2e8f0] rounded-sm p-3 text-[13px]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold">#{ret.rmaNumber}</span>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        ret.status === "APPROVED" ? "bg-green-100 text-green-700" :
                        ret.status === "REJECTED" ? "bg-red-100 text-red-600" :
                        "bg-yellow-100 text-yellow-700"
                      }`}>{ret.status}</span>
                    </div>
                    <p className="text-[#64748b]">Reason: {ret.reason}</p>
                    <p className="text-[11px] text-[#94a3b8] mt-1">{formatDate(ret.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <div className="bg-white border border-[#e2e8f0] rounded-sm p-5">
            <h2 className="text-[14px] font-black text-[#1e293b] mb-3">
              Customer
              {!order.user && <span className="ml-2 text-[10px] font-bold uppercase text-[#94a3b8] bg-[#f1f5f9] px-1.5 py-0.5 rounded align-middle">Guest</span>}
            </h2>
            {order.user ? (
              <>
                <p className="text-[14px] font-bold">{order.user.firstName} {order.user.lastName}</p>
                <p className="text-[13px] text-[#64748b]">{order.user.email}</p>
                {order.user.phone && <p className="text-[13px] text-[#64748b]">{order.user.phone}</p>}
                <Link href={`/admin/customers/${order.user.id}`}
                  className="inline-block mt-3 text-[12px] text-[#3b82f6] hover:underline">
                  View customer →
                </Link>
              </>
            ) : (
              <>
                <p className="text-[14px] font-bold">{order.guestName || "Guest"}</p>
                <p className="text-[13px] text-[#64748b]">{order.guestEmail || "—"}</p>
                <p className="text-[12px] text-[#94a3b8] mt-2">Checked out as a guest (no account).</p>
              </>
            )}
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-sm p-5">
            <h2 className="text-[14px] font-black text-[#1e293b] mb-3">Shipping Address</h2>
            <div className="text-[13px] text-[#64748b] space-y-0.5">
              <p className="font-bold text-[#1e293b]">{order.shippingAddress?.fullName}</p>
              <p>{order.shippingAddress?.line1}</p>
              {order.shippingAddress?.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>
                {order.shippingAddress?.city}
                {order.shippingAddress?.governorate
                  ? `, ${governorateName(order.shippingAddress.governorate)}`
                  : order.shippingAddress?.state ? `, ${order.shippingAddress.state}` : ""}
              </p>
              <p>{order.shippingAddress?.country}</p>
              <p>{order.shippingAddress?.phone}</p>
            </div>
          </div>

          <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 text-[13px] space-y-2">
            <h2 className="text-[14px] font-black text-[#1e293b] mb-3">Payment</h2>
            <div className="flex justify-between"><span className="text-[#64748b]">Method</span><span className="font-bold">{order.paymentMethod}</span></div>
            <div className="flex justify-between"><span className="text-[#64748b]">Status</span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${order.paymentStatus === "PAID" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
                {order.paymentStatus}
              </span>
            </div>
            {order.paidAt && <div className="flex justify-between"><span className="text-[#64748b]">Paid at</span><span>{formatDate(order.paidAt)}</span></div>}
          </div>

          {/* Refund summary */}
          {order.refundAmount && (
            <div className="bg-red-50 border border-red-200 rounded-sm p-5 text-[13px] space-y-2">
              <h2 className="text-[14px] font-black text-red-700 mb-3">Refund Issued</h2>
              <div className="flex justify-between"><span className="text-red-600">Amount</span><span className="font-bold text-red-700">{order.refundAmount} {order.currency}</span></div>
              {order.refundReason && <p className="text-red-600 text-[12px]">{order.refundReason}</p>}
              {order.refundedAt && <p className="text-[11px] text-red-400">{formatDate(order.refundedAt)}</p>}
            </div>
          )}

          <div className="bg-white border border-[#e2e8f0] rounded-sm p-5 text-[13px] space-y-2">
            <h2 className="text-[14px] font-black text-[#1e293b] mb-3">Timeline</h2>
            <div className="space-y-2">
              {[
                { label: "Order placed", date: order.createdAt },
                { label: "Paid", date: order.paidAt },
                { label: "Shipped", date: order.shippedAt },
                { label: "Delivered", date: order.deliveredAt },
                { label: "Cancelled", date: order.cancelledAt },
                { label: "Refunded", date: order.refundedAt },
              ].filter(e => e.date).map((event) => (
                <div key={event.label} className="flex gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3b82f6] mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold text-[#1e293b]">{event.label}</p>
                    <p className="text-[11px] text-[#94a3b8]">{formatDate(event.date)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
