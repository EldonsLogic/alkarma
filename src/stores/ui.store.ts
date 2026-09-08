"use client";

import { create } from "zustand";

interface UIState {
  mobileMenuOpen: boolean;
  searchOpen: boolean;
  promoVisible: boolean;
  toggleMobileMenu: () => void;
  closeMobileMenu: () => void;
  openSearch: () => void;
  closeSearch: () => void;
  dismissPromo: () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  mobileMenuOpen: false,
  searchOpen: false,
  promoVisible: true,

  toggleMobileMenu: () =>
    set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  closeMobileMenu: () => set({ mobileMenuOpen: false }),
  openSearch: () => set({ searchOpen: true }),
  closeSearch: () => set({ searchOpen: false }),
  dismissPromo: () => set({ promoVisible: false }),
}));
