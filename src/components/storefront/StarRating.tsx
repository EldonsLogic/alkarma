interface Props {
  rating: number;
  count?: number;
  size?: "sm" | "md";
}

export function StarRating({ rating, count, size = "sm" }: Props) {
  const stars = Array.from({ length: 5 }, (_, i) => {
    if (i + 1 <= Math.floor(rating)) return "full";
    if (i < rating) return "half";
    return "empty";
  });

  const sizePx = size === "sm" ? 14 : 16;

  return (
    <div className="flex items-center gap-1">
      <span
        className="flex"
        aria-label={`${rating.toFixed(1)} out of 5 stars`}
        style={{ fontSize: sizePx, color: "#F26522", letterSpacing: 1 }}
      >
        {stars.map((s, i) =>
          s === "full" ? "★" : s === "half" ? "⭑" : "☆"
        ).join("")}
      </span>
      {count !== undefined && (
        <span className="text-[12px] text-[#666]">({count})</span>
      )}
    </div>
  );
}
