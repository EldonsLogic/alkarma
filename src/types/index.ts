

// ─── Auth ────────────────────────────────────────────────────────────────────

export interface SessionUser {
  id: string;
  email: string;
  name?: string | null;
  image?: string | null;
  role: "CUSTOMER" | "ADMIN";
}

// ─── Book ────────────────────────────────────────────────────────────────────

export interface BookSummary {
  id: string;
  slug: string;
  title: string;
  titleAr?: string | null;
  author: string;
  authorSlug?: string | null;
  authors?: { name: string; nameAr?: string | null; slug: string }[];
  /** Display strings; several names are joined with "، ". Linked per name on cards. */
  translator?: string | null;
  editor?: string | null;
  coverUrl: string;
  priceEgp: number;
  compareAtEgp?: number | null;
  isBestseller: boolean;
  isNewRelease: boolean;
  isFeatured: boolean;
  salesCount: number;
  stock: number;
  averageRating?: number;
  reviewCount?: number;
}

export interface BookDetail extends BookSummary {
  titleAr?: string | null;
  subtitle?: string | null;
  subtitleAr?: string | null;
  synopsis: string;
  synopsisAr?: string | null;
  isbn?: string | null;
  authorId?: string | null;
  authorSlug?: string | null;
  authors?: { name: string; nameAr?: string | null; slug: string }[];
  translator?: string | null;
  editor?: string | null;
  images?: string[];
  publisher?: string | null;
  publishDate?: string | null;
  pageCount?: number | null;
  /** Free-text physical specs shown on the product page (المقاس / نوع الغلاف). */
  dimensions?: string | null;
  coverType?: string | null;
  language: string;
  categories: CategorySummary[];
  tags: string[];
  reviews: ReviewItem[];
}

// ─── Author ──────────────────────────────────────────────────────────────────

export interface AuthorSummary {
  id: string;
  slug: string;
  name: string;
  photoUrl?: string | null;
}

export interface AuthorDetail extends AuthorSummary {
  nameAr?: string | null;
  bio?: string | null;
  bioAr?: string | null;
  books: BookSummary[];
}

// ─── Category ────────────────────────────────────────────────────────────────

export interface CategorySummary {
  id: string;
  slug: string;
  name: string;
  nameAr?: string | null;
  imageUrl?: string | null;
  sortOrder: number;
  bookCount?: number;
  children?: CategorySummary[];
}

// ─── Review ──────────────────────────────────────────────────────────────────

export interface ReviewItem {
  id: string;
  rating: number;
  title?: string | null;
  body: string;
  createdAt: string;
  user: { firstName: string; lastName: string };
}

export interface CommunityRating {
  source: string;
  label: string;
  rating: number;
  count: number;
  url: string | null;
}

export interface EditorialReview {
  source: string;
  label: string;
  summary: string;
  byline: string;
  date: string;
  url: string;
}

// ─── Cart ────────────────────────────────────────────────────────────────────

export interface CartLineItem {
  id: string;
  bookId?: string | null;
  bundleId?: string | null;
  title: string;
  author?: string;
  coverUrl?: string;
  slug?: string;
  quantity: number;
  priceEgp: number;
}

// ─── Order ───────────────────────────────────────────────────────────────────

export type OrderStatus =
  | "PENDING"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELLED"
  | "REFUNDED";

export type PaymentMethod = "ONLINE" | "COD";
export type PaymentStatus = "UNPAID" | "PAID" | "REFUNDED" | "FAILED";

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  currency: string;
  total: number;
  createdAt: string;
  itemCount: number;
}

// ─── Bundle ──────────────────────────────────────────────────────────────────

export interface BundleSummary {
  id: string;
  slug: string;
  name: string;
  nameAr?: string | null;
  coverUrl?: string | null;
  priceEgp: number;
  compareEgp?: number | null;
  stock: number;
  itemCount: number;
  covers?: { coverUrl: string | null; title: string }[];
}

// ─── Banner ──────────────────────────────────────────────────────────────────

export interface BannerItem {
  id: string;
  title: string;
  titleAr?: string | null;
  subtitle?: string | null;
  subtitleAr?: string | null;
  imageUrl: string;
  imageMobileUrl?: string | null;
  linkUrl?: string | null;
  sortOrder: number;
}

// ─── Shipping ────────────────────────────────────────────────────────────────

export interface ShippingAddress {
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state?: string;
  postcode?: string;
  country: string;
}

// ─── GTM / dataLayer ─────────────────────────────────────────────────────────
declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
  }
}
