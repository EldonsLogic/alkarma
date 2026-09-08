import { BookCard } from "./BookCard";
import type { BookSummary } from "@/types";

interface Props {
  books: BookSummary[];
}

const COPY = {
    title: "تبنَ كتابًا 📚",
    body: "قد تحتوي هذه الكتب على بعض العيوب البسيطة، لكن حكاياتها ما زالت كاملة وتستحق أن تُقرأ. امنح كتابًا به تلف بسيط بيتًا جديدًا، واستمتع به بسعر مميز.",
  };

export function AdoptSection({ books }: Props) {
  if (!books.length) return null;
  const t = COPY;

  return (
    <section className="py-10 sm:py-14 px-4 sm:px-10 bg-brand-pale" dir="rtl">
      <div className="max-w-[900px] mb-6">
        <h2
          className="font-bold text-ink leading-tight mb-3 font-sans-ar"
          style={{ fontSize: "clamp(24px, 3vw, 36px)" }}
        >
          {t.title}
        </h2>
        <p className="text-[14px] sm:text-[15px] text-ink-soft leading-relaxed">{t.body}</p>
        <div className="w-16 h-[3px] bg-brand mt-4" />
      </div>

      <div className="flex gap-5 overflow-x-auto pb-2 scrollbar-thin -mx-4 px-4 sm:mx-0 sm:px-0">
        {books.map((book, i) => (
          <BookCard key={book.id} book={book} priority={i < 3} />
        ))}
      </div>
    </section>
  );
}
