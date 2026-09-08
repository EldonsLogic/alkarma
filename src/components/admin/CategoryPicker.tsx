"use client";

import { useMemo, useState } from "react";

interface Cat {
  id: string;
  name: string;
  parentId: string | null;
}

/**
 * Category checkbox tree for the product forms. Selecting a subcategory
 * automatically ticks its parent chain too (Amend B), so a book always "shows
 * under" its mother category. Uses controlled checkboxes named `categoryIds`
 * so the server action reads them via formData.getAll("categoryIds").
 */
export function CategoryPicker({
  categories,
  selectedIds = [],
}: {
  categories: Cat[];
  selectedIds?: string[];
}) {
  const [checked, setChecked] = useState<Set<string>>(new Set(selectedIds));
  const parentOf = useMemo(
    () => new Map(categories.map((c) => [c.id, c.parentId])),
    [categories],
  );

  function toggle(id: string, on: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) {
        next.add(id);
        // Auto-tick the whole parent chain
        let p = parentOf.get(id) ?? null;
        while (p) {
          next.add(p);
          p = parentOf.get(p) ?? null;
        }
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  return (
    <div className="space-y-0.5 max-h-[320px] overflow-y-auto pr-1">
      {categories.map((cat) =>
        !cat.parentId ? (
          <div key={cat.id} className="pt-2 pb-0.5">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                name="categoryIds"
                value={cat.id}
                checked={checked.has(cat.id)}
                onChange={(e) => toggle(cat.id, e.target.checked)}
                className="w-4 h-4 accent-[#3b82f6] flex-shrink-0"
              />
              <span className="text-[12px] font-black uppercase tracking-wide text-[#1e293b]">
                {cat.name}
              </span>
            </label>
          </div>
        ) : (
          <label key={cat.id} className="flex items-center gap-2.5 cursor-pointer py-0.5 pl-5">
            <input
              type="checkbox"
              name="categoryIds"
              value={cat.id}
              checked={checked.has(cat.id)}
              onChange={(e) => toggle(cat.id, e.target.checked)}
              className="w-4 h-4 accent-[#3b82f6] flex-shrink-0"
            />
            <span className="text-[13px] text-[#475569]">{cat.name}</span>
          </label>
        ),
      )}
      {categories.length === 0 && (
        <p className="text-[12px] text-[#94a3b8]">No categories yet.</p>
      )}
    </div>
  );
}
