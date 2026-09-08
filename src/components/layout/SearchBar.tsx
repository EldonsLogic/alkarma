"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (q) router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-1 max-w-[480px] mx-auto flex items-center border-2 border-[#ddd] rounded-sm overflow-hidden focus-within:border-brand transition-colors"
    >
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="ابحث عن كتب، مؤلفين، تصنيفات..."
        aria-label="بحث"
        className="flex-1 px-4 py-[10px] text-[14px] border-none outline-none bg-white"
      />
      <button
        type="submit"
        className="bg-brand text-white px-[18px] h-[42px] text-[13px] font-bold tracking-[0.03em] hover:bg-brand-dark transition-colors"
      >
        بحث
      </button>
    </form>
  );
}
