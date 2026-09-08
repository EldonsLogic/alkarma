# Historical data import — column spec

Two CSV files, UTF-8, comma-separated, first row = headers exactly as below.
Match these headers and the import script needs no changes.

Put the files anywhere and run:

```bash
npx tsx --env-file .env.local scripts/import-history.ts \
  --customers ./import-templates/customers.csv \
  --orders ./import-templates/orders.csv \
  --dry
```

`--dry` validates and writes the report **without touching the database**.
Drop `--dry` to actually import. Re-running is safe (idempotent).

---

## 1. `customers.csv` — one row per customer

| column | required | notes |
|---|---|---|
| `legacy_customer_id` | no | ID in the old system. Stored on the account for traceability; also used to match on re-run. |
| `email` | **yes** | Unique key. A row without a valid email is reported and skipped — it cannot own an order history. |
| `first_name` | no | Arabic fine. |
| `last_name` | no | |
| `phone` | no | Any format; digits are kept as given. |
| `address_line1` | no | If present, a default address is created. |
| `address_line2` | no | |
| `city` | no | |
| `governorate` | no | **Code**, not display name — `cairo`, `giza`, `alexandria`… Full list in `src/lib/governorates.ts`. Arabic or English names are auto-matched where unambiguous; anything unrecognised is reported. |
| `postcode` | no | |
| `country` | no | Defaults to `EG`. |
| `created_at` | no | Account creation date. `YYYY-MM-DD` or ISO. Defaults to now. |

Every imported account is created with **no usable password** and
`isImported = true`. See "Password handling" below.

## 2. `orders.csv` — **one row per order LINE ITEM**

An order with three books = three rows sharing the same `order_number`. The
order-level columns must repeat identically on each of those rows; the importer
reads them from the first row it sees for that order.

| column | required | notes |
|---|---|---|
| `order_number` | **yes** | The customer's ORIGINAL order number — kept exactly as-is so they still recognise it. Groups the line items. |
| `customer_email` | **yes** | Links to the customer. If it isn't in `customers.csv`, the order is still imported as a guest order and flagged in the report. |
| `order_date` | **yes** | `YYYY-MM-DD` or ISO. Becomes the order's created date, so history sorts correctly. |
| `status` | no | One of `PENDING` `PAID` `PROCESSING` `SHIPPED` `DELIVERED` `CANCELLED` `REFUNDED`. Common variants are mapped; unknown values default to `DELIVERED` and are reported. |
| `payment_method` | no | `COD` or `ONLINE`. Defaults to `COD`. |
| `payment_status` | no | `PAID` / `UNPAID` / `REFUNDED`. Inferred from `status` when blank. |
| `item_title` | **yes** | Title as it appeared on the order. Stored on the line item verbatim, so history stays accurate even if the catalogue title later changes. |
| `item_isbn` | no | Used to link the line to a catalogue book. Falls back to exact title match. Unmatched lines still import (title + price preserved) and are reported. |
| `item_quantity` | **yes** | Integer ≥ 1. |
| `item_unit_price` | **yes** | EGP, price actually paid per unit. |
| `order_subtotal` | no | EGP. Computed from the line items when blank. |
| `order_shipping_fee` | no | EGP. Defaults to 0. |
| `order_discount` | no | EGP. Defaults to 0. |
| `order_total` | no | EGP. Computed as subtotal + shipping − discount when blank. If supplied and it disagrees with the computed value, **the supplied figure wins** (it is what the customer actually paid) and the mismatch is reported. |
| `shipping_full_name` | no | |
| `shipping_phone` | no | |
| `shipping_line1` | no | |
| `shipping_line2` | no | |
| `shipping_city` | no | |
| `shipping_governorate` | no | Governorate **code**, as above. |
| `shipping_postcode` | no | |
| `notes` | no | Free text, stored on the order. |

All money is EGP — the store has no second currency.

---

## Password handling for imported accounts

Imported customers get **no password hash at all**, so no password can work.
On sign-in the account is recognised as imported and the customer is sent
through the existing reset-password flow to set one. Once set, `isImported`
clears and it behaves as a normal account, with the full imported order history
already attached.

## The report

Every run writes `import-report.md` next to the CSVs listing anything that did
not map cleanly — missing emails, unknown governorates, unmatched products,
total mismatches, duplicate order numbers. **Nothing is silently dropped.**
