
// Single-currency store — every GA4 event reports EGP.
const CURRENCY = "EGP";
/**
 * Google Tag Manager — GA4 Ecommerce Data Layer
 * All events follow the official GA4 ecommerce schema.
 * GTM container id comes from NEXT_PUBLIC_GTM_ID.
 */

/**
 * Google Tag Manager container for THIS store.
 *
 * Deliberately has no fallback value: an empty id disables GTM entirely rather
 * than silently sending this store's traffic and ecommerce events into another
 * store's analytics property. Set NEXT_PUBLIC_GTM_ID to Alkarma's own container.
 */
export const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID ?? "";

// ── Types ─────────────────────────────────────────────────────────────────

export interface GTMItem {
  item_id: string;       // book id or slug
  item_name: string;     // book title
  item_brand?: string;   // author name
  item_category?: string;
  price: number;
  quantity?: number;
  index?: number;        // position in list
  item_list_id?: string;
  item_list_name?: string;
  discount?: number;
}


// ── Core push ─────────────────────────────────────────────────────────────

function getSiteLanguage(): string {
  // Single-language store — the document is always Arabic.
  return "ar";
}

function push(event: string, data?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  // Clear previous ecommerce object before each push (GA4 best practice)
  window.dataLayer.push({ ecommerce: null });
  window.dataLayer.push({
    event,
    site_language: getSiteLanguage(), // "ar" or "en" — which version of the site
    ...data,
  });
}

// ── Page view (called manually for SPA navigation if needed) ──────────────

export function gtmPageView(url: string) {
  push("page_view", { page_location: url });
}

// ── Product / item events ─────────────────────────────────────────────────

export function gtmViewItem(item: GTMItem) {
  push("view_item", {
    ecommerce: {
      currency: CURRENCY,
      value: item.price,
      items: [item],
    },
  });
}

export function gtmViewItemList(
  items: GTMItem[],
  listId: string,
  listName: string
) {
  push("view_item_list", {
    ecommerce: {
      currency: CURRENCY,
      item_list_id: listId,
      item_list_name: listName,
      items: items.map((item, index) => ({ ...item, index, item_list_id: listId, item_list_name: listName })),
    },
  });
}

export function gtmSelectItem(item: GTMItem, listId: string, listName: string) {
  push("select_item", {
    ecommerce: {
      currency: CURRENCY,
      item_list_id: listId,
      item_list_name: listName,
      items: [{ ...item, item_list_id: listId, item_list_name: listName }],
    },
  });
}

// ── Cart events ───────────────────────────────────────────────────────────

export function gtmAddToCart(item: GTMItem) {
  push("add_to_cart", {
    ecommerce: {
      currency: CURRENCY,
      value: item.price * (item.quantity ?? 1),
      items: [item],
    },
  });
}

export function gtmRemoveFromCart(item: GTMItem) {
  push("remove_from_cart", {
    ecommerce: {
      currency: CURRENCY,
      value: item.price * (item.quantity ?? 1),
      items: [item],
    },
  });
}

export function gtmViewCart(items: GTMItem[], value: number) {
  push("view_cart", {
    ecommerce: {
      currency: CURRENCY,
      value,
      items,
    },
  });
}

// ── Checkout funnel ───────────────────────────────────────────────────────

export function gtmBeginCheckout(items: GTMItem[], value: number, coupon?: string) {
  push("begin_checkout", {
    ecommerce: {
      currency: CURRENCY,
      value,
      coupon,
      items,
    },
  });
}

export function gtmAddShippingInfo(
  items: GTMItem[],
  value: number,
  shippingTier: string
) {
  push("add_shipping_info", {
    ecommerce: {
      currency: CURRENCY,
      value,
      shipping_tier: shippingTier,
      items,
    },
  });
}

export function gtmAddPaymentInfo(
  items: GTMItem[],
  value: number,
  paymentType: string
) {
  push("add_payment_info", {
    ecommerce: {
      currency: CURRENCY,
      value,
      payment_type: paymentType,
      items,
    },
  });
}

export function gtmPurchase(
  transactionId: string,
  items: GTMItem[],
  value: number,
  shipping: number,
  coupon?: string
) {
  push("purchase", {
    ecommerce: {
      transaction_id: transactionId,
      currency: CURRENCY,
      value,
      shipping,
      coupon,
      items,
    },
  });
}

// ── Promotions ────────────────────────────────────────────────────────────

export function gtmViewPromotion(
  promotionId: string,
  promotionName: string,
  creativeName?: string
) {
  push("view_promotion", {
    ecommerce: {
      items: [{
        promotion_id: promotionId,
        promotion_name: promotionName,
        creative_name: creativeName,
      }],
    },
  });
}

export function gtmSelectPromotion(
  promotionId: string,
  promotionName: string
) {
  push("select_promotion", {
    ecommerce: {
      items: [{ promotion_id: promotionId, promotion_name: promotionName }],
    },
  });
}

// ── Search ────────────────────────────────────────────────────────────────

export function gtmSearch(searchTerm: string) {
  push("search", { search_term: searchTerm });
}

// ── Account ───────────────────────────────────────────────────────────────

export function gtmSignUp(method: "email" | "google") {
  push("sign_up", { method });
}

export function gtmLogin(method: "email" | "google") {
  push("login", { method });
}
