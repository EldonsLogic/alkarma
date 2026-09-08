"use client";

import { useEffect } from "react";

// Fires once on mount to mark any abandoned cart as recovered
export function MarkRecovered() {
  useEffect(() => {
    fetch("/api/cart/abandon", { method: "PATCH" }).catch(() => {});
  }, []);
  return null;
}
