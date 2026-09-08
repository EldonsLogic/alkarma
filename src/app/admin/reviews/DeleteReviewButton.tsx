"use client";

interface Props {
  id: string;
  action: (formData: FormData) => Promise<void>;
}

export function DeleteReviewButton({ id, action }: Props) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="px-3 py-1.5 border border-red-200 text-red-500 text-[12px] font-bold rounded-sm hover:bg-red-50 transition-colors"
        onClick={(e) => {
          if (!confirm("Delete this review permanently?")) e.preventDefault();
        }}
      >
        Delete
      </button>
    </form>
  );
}
