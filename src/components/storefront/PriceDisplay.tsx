"use client";

import { formatPrice, getPrice, getCompareAtPrice } from "@/lib/currency";
import type { PricedItem } from "@/lib/currency";

interface Props {
  item: PricedItem;
  className?: string;
  size?: "sm" | "md" | "lg";
  showCompare?: boolean;
}

export function PriceDisplay({ item, className = "", size = "md", showCompare = true }: Props) {
  const currentPrice = getPrice(item);
  const comparePrice = getCompareAtPrice(item);
  const onSale = showCompare && comparePrice != null && comparePrice > currentPrice;

  const sizeClasses: Record<string, string> = {
    sm: "text-[15px]",
    md: "text-[16px]",
    lg: "text-[28px]",
  };

  const strikeSizeClasses: Record<string, string> = {
    sm: "text-[12px]",
    md: "text-[13px]",
    lg: "text-[18px]",
  };

  // The store stacks a discounted price above the struck-through original,
  // rather than setting them side by side.
  return (
    <div className={`flex flex-col items-start gap-0.5 ${className}`}>
      <span className={`price-mono font-normal text-ink ${sizeClasses[size]}`}>
        {formatPrice(currentPrice)}
      </span>
      {onSale && comparePrice != null && (
        <span className={`price-mono line-through text-ink-muted ${strikeSizeClasses[size]}`}>
          {formatPrice(comparePrice)}
        </span>
      )}
    </div>
  );
}
