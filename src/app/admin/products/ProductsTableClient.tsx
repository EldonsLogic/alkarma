"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { displayPrice } from "@/lib/currency";

// Windowed page list: 1 … 4 5 [6] 7 8 … 21
function pageWindow(current: number, total: number): (number | "…")[] {
  const out: (number | "…")[] = [];
  const push = (p: number) => { if (!out.includes(p)) out.push(p); };
  push(1);
  for (let p = current - 1; p <= current + 1; p++) if (p > 1 && p < total) push(p);
  if (total > 1) push(total);
  // Insert ellipses where there are gaps
  const withGaps: (number | "…")[] = [];
  (out as number[]).sort((a, b) => a - b).forEach((p, i, arr) => {
    if (i > 0 && p - (arr[i - 1] as number) > 1) withGaps.push("…");
    withGaps.push(p);
  });
  return withGaps;
}

interface BookRow {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  priceEgp: number;
  stock: number;
  isActive: boolean;
  category: string | null;
}

interface Props {
  books: BookRow[];
  categories?: { id: string; name: string }[];
  page: number;
  totalPages: number;
  q?: string;
  stock?: string;
}

export function ProductsTableClient({ books, categories = [], page, totalPages, q, stock }: Props) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isPending, startTransition] = useTransition();
  const [bulkAction, setBulkAction] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [bulkCategory, setBulkCategory] = useState("");
  const [duplicating, setDuplicating] = useState<string | null>(null);

  const needsNumber = ["price-egp", "price-pct", "stock"].includes(bulkAction);
  const needsCategory = ["cat-add", "cat-remove"].includes(bulkAction);
  const needsText = ["tag-add", "tag-remove"].includes(bulkAction);

  const allSelected = books.length > 0 && selected.size === books.length;

  function toggleAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(books.map((b) => b.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function buildPayload(): { action: string; value?: unknown } | null {
    switch (bulkAction) {
      case "publish": case "unpublish": case "delete":
        return { action: bulkAction };
      case "price-egp":
        return { action: "price-set", value: { amount: Number(bulkValue) } };
      case "price-pct":
        return { action: "price-adjust", value: { percent: Number(bulkValue) } };
      case "stock":
        return { action: "stock-set", value: { stock: Number(bulkValue) } };
      case "cat-add":
        return bulkCategory ? { action: "category-add", value: { categoryId: bulkCategory } } : null;
      case "cat-remove":
        return bulkCategory ? { action: "category-remove", value: { categoryId: bulkCategory } } : null;
      case "tag-add":
        return bulkValue.trim() ? { action: "tag-add", value: { tag: bulkValue.trim() } } : null;
      case "tag-remove":
        return bulkValue.trim() ? { action: "tag-remove", value: { tag: bulkValue.trim() } } : null;
      case "bestseller-on":   return { action: "flag", value: { field: "isBestseller", on: true } };
      case "bestseller-off":  return { action: "flag", value: { field: "isBestseller", on: false } };
      case "newrelease-on":   return { action: "flag", value: { field: "isNewRelease", on: true } };
      case "newrelease-off":  return { action: "flag", value: { field: "isNewRelease", on: false } };
      case "featured-on":     return { action: "flag", value: { field: "isFeatured", on: true } };
      case "featured-off":    return { action: "flag", value: { field: "isFeatured", on: false } };
      default: return null;
    }
  }

  async function handleBulkAction() {
    if (!bulkAction || selected.size === 0) return;
    if ((needsNumber || needsText) && !bulkValue.trim()) return;
    if (needsCategory && !bulkCategory) return;
    const ids = Array.from(selected);
    const payload = buildPayload();
    if (!payload) return;

    if (bulkAction === "delete" && !confirm(`Delete ${ids.length} product(s)? This cannot be undone.`)) return;

    startTransition(async () => {
      const res = await fetch("/api/admin/products/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, ids }),
      });
      if (res.ok) {
        setSelected(new Set());
        setBulkAction(""); setBulkValue(""); setBulkCategory("");
        router.refresh();
      } else {
        const d = await res.json().catch(() => ({}));
        alert(d.error ?? "Bulk action failed.");
      }
    });
  }

  async function handleDuplicate(id: string) {
    setDuplicating(id);
    const res = await fetch(`/api/admin/products/${id}/duplicate`, { method: "POST" });
    setDuplicating(null);
    if (res.ok) {
      const { id: newId } = await res.json();
      router.push(`/admin/products/${newId}`);
    }
  }

  const paginationHref = (p: number) =>
    `/admin/products?page=${p}${q ? `&q=${encodeURIComponent(q)}` : ""}${stock ? `&stock=${stock}` : ""}`;

  function goToPage(p: number) {
    if (p < 1 || p > totalPages || p === page) return;
    // Full browser navigation — bulletproof: the server always renders the
    // requested page fresh, with no Next router cache in the way.
    window.location.href = paginationHref(p);
  }

  return (
    <>
      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-2.5 flex-wrap mb-3 p-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-sm">
          <span className="text-[13px] font-bold text-[#1e40af]">{selected.size} selected</span>
          <select
            value={bulkAction}
            onChange={(e) => { setBulkAction(e.target.value); setBulkValue(""); setBulkCategory(""); }}
            className="px-3 py-1.5 border border-[#bfdbfe] bg-white text-[13px] rounded-sm outline-none">
            <option value="">Choose action…</option>
            <optgroup label="Visibility">
              <option value="publish">Set Active</option>
              <option value="unpublish">Set Inactive (draft)</option>
              <option value="delete">Delete</option>
            </optgroup>
            <optgroup label="Pricing">
              <option value="price-egp">Set price</option>
              <option value="price-pct">Adjust price by %…</option>
            </optgroup>
            <optgroup label="Inventory">
              <option value="stock">Set stock quantity</option>
            </optgroup>
            <optgroup label="Categories">
              <option value="cat-add">Add to category…</option>
              <option value="cat-remove">Remove from category…</option>
            </optgroup>
            <optgroup label="Tags">
              <option value="tag-add">Add tag…</option>
              <option value="tag-remove">Remove tag…</option>
            </optgroup>
            <optgroup label="Homepage flags">
              <option value="bestseller-on">Mark Bestseller</option>
              <option value="bestseller-off">Unmark Bestseller</option>
              <option value="newrelease-on">Mark New Release</option>
              <option value="newrelease-off">Unmark New Release</option>
              <option value="featured-on">Mark Featured</option>
              <option value="featured-off">Unmark Featured</option>
            </optgroup>
          </select>

          {/* Contextual input */}
          {needsNumber && (
            <input
              type="number"
              step={bulkAction === "price-pct" ? "1" : "0.01"}
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              placeholder={bulkAction === "price-pct" ? "e.g. -10 or 15" : bulkAction === "stock" ? "e.g. 100" : "amount"}
              className="w-[130px] px-3 py-1.5 border border-[#bfdbfe] bg-white text-[13px] rounded-sm outline-none" />
          )}
          {needsCategory && (
            <select
              value={bulkCategory}
              onChange={(e) => setBulkCategory(e.target.value)}
              className="px-3 py-1.5 border border-[#bfdbfe] bg-white text-[13px] rounded-sm outline-none max-w-[220px]">
              <option value="">Choose category…</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          )}
          {needsText && (
            <input
              type="text"
              value={bulkValue}
              onChange={(e) => setBulkValue(e.target.value)}
              placeholder="tag name"
              className="w-[180px] px-3 py-1.5 border border-[#bfdbfe] bg-white text-[13px] rounded-sm outline-none" />
          )}
          
          <button
            onClick={handleBulkAction}
            disabled={!bulkAction || isPending}
            className="px-4 py-1.5 bg-[#3b82f6] text-white text-[13px] font-bold rounded-sm hover:bg-[#2563eb] disabled:opacity-50 transition-colors">
            {isPending ? "Processing…" : "Apply"}
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="px-3 py-1.5 text-[13px] text-[#64748b] hover:text-[#1e293b]">
            Clear
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white border border-[#e2e8f0] rounded-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="bg-[#f8fafc] text-[#64748b] text-[11px] uppercase tracking-wide border-b border-[#e2e8f0]">
                <th className="px-4 py-3 w-8">
                  <input type="checkbox" checked={allSelected} onChange={toggleAll} className="cursor-pointer" />
                </th>
                {["Title", "Author", "Category", "Price EGP", "Stock", "Status", "Actions"].map((h) => (
                  <th key={h} className="text-left px-4 py-3 font-bold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {books.map((book) => (
                <tr key={book.id} className={`border-t border-[#f1f5f9] hover:bg-[#f8fafc] ${selected.has(book.id) ? "bg-[#eff6ff]" : ""}`}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(book.id)}
                      onChange={() => toggleOne(book.id)}
                      className="cursor-pointer"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-bold text-[#1e293b] line-clamp-1">{book.title}</p>
                    {book.isbn && <p className="text-[11px] text-[#94a3b8]">ISBN: {book.isbn}</p>}
                  </td>
                  <td className="px-4 py-3 text-[#64748b]">{book.author}</td>
                  <td className="px-4 py-3 text-[#64748b]">{book.category ?? "—"}</td>
                  <td className="px-4 py-3 font-bold">{displayPrice(book.priceEgp)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-bold ${book.stock === 0 ? "text-red-500" : book.stock <= 5 ? "text-brand-500" : "text-[#2e7d52]"}`}>
                      {book.stock}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${book.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      {book.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Link href={`/admin/products/${book.id}`}
                        className="text-[#3b82f6] hover:underline font-bold">Edit</Link>
                      <button
                        onClick={() => handleDuplicate(book.id)}
                        disabled={duplicating === book.id}
                        className="text-[#64748b] hover:text-[#1e293b] font-bold disabled:opacity-50">
                        {duplicating === book.id ? "..." : "Duplicate"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {books.length === 0 && (
          <div className="py-12 text-center text-[#94a3b8]">No products found</div>
        )}
      </div>

      {/* Pagination — navigate via router.push + router.refresh() so a change to
          only ?page always re-renders. Plain <Link> reused the same-pathname
          client Router Cache entry, so the list appeared not to change. */}
      {totalPages > 1 && (
        <div className="flex gap-1 justify-center items-center mt-6 flex-wrap">
          <button
            type="button"
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            className={`h-8 px-3 flex items-center justify-center text-[13px] rounded-sm border bg-white border-[#e2e8f0] ${
              page === 1 ? "text-[#cbd5e1] cursor-not-allowed" : "text-[#64748b] hover:border-[#3b82f6]"
            }`}>
            ‹ Prev
          </button>

          {pageWindow(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`gap-${i}`} className="w-8 h-8 flex items-center justify-center text-[13px] text-[#94a3b8]">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => goToPage(p)}
                className={`w-8 h-8 flex items-center justify-center text-[13px] rounded-sm border transition-colors ${
                  p === page ? "bg-[#3b82f6] text-white border-[#3b82f6]" : "bg-white border-[#e2e8f0] text-[#64748b] hover:border-[#3b82f6]"
                }`}>
                {p}
              </button>
            )
          )}

          <button
            type="button"
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages}
            className={`h-8 px-3 flex items-center justify-center text-[13px] rounded-sm border bg-white border-[#e2e8f0] ${
              page === totalPages ? "text-[#cbd5e1] cursor-not-allowed" : "text-[#64748b] hover:border-[#3b82f6]"
            }`}>
            Next ›
          </button>
        </div>
      )}
    </>
  );
}
