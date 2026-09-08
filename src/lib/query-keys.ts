export const queryKeys = {
  books: {
    all: ["books"] as const,
    list: (params?: object) => ["books", "list", params] as const,
    detail: (slug: string) => ["books", "detail", slug] as const,
    reviews: (slug: string) => ["books", "reviews", slug] as const,
  },
  categories: {
    all: ["categories"] as const,
    detail: (slug: string) => ["categories", "detail", slug] as const,
  },
  authors: {
    all: ["authors"] as const,
    detail: (slug: string) => ["authors", "detail", slug] as const,
  },
  cart: {
    all: ["cart"] as const,
  },
  wishlist: {
    all: ["wishlist"] as const,
  },
  orders: {
    all: ["orders"] as const,
    detail: (id: string) => ["orders", "detail", id] as const,
  },
  bundles: {
    all: ["bundles"] as const,
    detail: (slug: string) => ["bundles", "detail", slug] as const,
  },
  banners: {
    all: ["banners"] as const,
  },
  featured: {
    detail: (slug: string) => ["featured", "detail", slug] as const,
  },
  admin: {
    products: (params?: object) => ["admin", "products", params] as const,
    orders: (params?: object) => ["admin", "orders", params] as const,
    customers: (params?: object) => ["admin", "customers", params] as const,
    analytics: (type: string) => ["admin", "analytics", type] as const,
  },
};
