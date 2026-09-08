"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartLineItem } from "@/types";
import { getPrice } from "@/lib/currency";
import { gtmRemoveFromCart } from "@/lib/gtm";

interface CartState {
  items: CartLineItem[];
  couponCode: string | null;
  couponDiscount: number;
  giftCardCode: string | null;
  giftCardBalance: number;
  isOpen: boolean;

  addItem: (item: Omit<CartLineItem, "quantity"> & { quantity?: number }) => void;
  removeItem: (id: string) => void;
  updateQty: (id: string, qty: number) => void;
  clearCart: () => void;
  applyCoupon: (code: string, discount: number) => void;
  removeCoupon: () => void;
  applyGiftCard: (code: string, balance: number) => void;
  removeGiftCard: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;

  subtotal: () => number;
  totalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      couponCode: null,
      couponDiscount: 0,
      giftCardCode: null,
      giftCardBalance: 0,
      isOpen: false,

      addItem(item) {
        set((state) => {
          const existing = state.items.find((i) => i.id === item.id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.id === item.id
                  ? { ...i, quantity: i.quantity + (item.quantity ?? 1) }
                  : i
              ),
            };
          }
          return {
            items: [...state.items, { ...item, quantity: item.quantity ?? 1 }],
          };
        });
      },

      removeItem(id) {
        const item = get().items.find((i) => i.id === id);
        if (item) {
          gtmRemoveFromCart({
            item_id: item.slug ?? item.id,
            item_name: item.title,
            item_brand: item.author,
            price: getPrice(item),
            quantity: item.quantity,
          });
        }
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
      },

      updateQty(id, qty) {
        if (qty < 1) {
          get().removeItem(id);
          return;
        }
        set((state) => ({
          items: state.items.map((i) =>
            i.id === id ? { ...i, quantity: qty } : i
          ),
        }));
      },

      clearCart() {
        set({ items: [], couponCode: null, couponDiscount: 0, giftCardCode: null, giftCardBalance: 0 });
      },

      applyCoupon(code, discount) {
        set({ couponCode: code, couponDiscount: discount });
      },

      removeCoupon() {
        set({ couponCode: null, couponDiscount: 0 });
      },

      applyGiftCard(code, balance) {
        set({ giftCardCode: code, giftCardBalance: balance });
      },

      removeGiftCard() {
        set({ giftCardCode: null, giftCardBalance: 0 });
      },

      openDrawer() {
        set({ isOpen: true });
      },

      closeDrawer() {
        set({ isOpen: false });
      },

      subtotal() {
        return get().items.reduce(
          (sum, item) => sum + getPrice(item) * item.quantity,
          0
        );
      },

      totalItems() {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: "alkarma-cart",
      partialize: (state) => ({
        items: state.items,
        couponCode: state.couponCode,
        couponDiscount: state.couponDiscount,
        giftCardCode: state.giftCardCode,
        giftCardBalance: state.giftCardBalance,
      }),
    }
  )
);
