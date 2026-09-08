"use client";

import { useEffect, useState } from "react";
import { COUNTRY_COOKIE, shipsToCountry } from "@/lib/shipping-region";

/**
 * Whether the current visitor is somewhere the store can deliver to, based on
 * the country the middleware detected from Vercel's edge header.
 *
 * Starts as `true` so the checkout CTA is never disabled during the first
 * client render (and stays enabled if the cookie is missing entirely) — the
 * warning only appears once we positively know the visitor is outside Egypt.
 */
export function useShipsToEgypt(): boolean {
  const [eligible, setEligible] = useState(true);

  useEffect(() => {
    const match = document.cookie
      .split("; ")
      .find((c) => c.startsWith(`${COUNTRY_COOKIE}=`));
    setEligible(shipsToCountry(match?.split("=")[1]));
  }, []);

  return eligible;
}
