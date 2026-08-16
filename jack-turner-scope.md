# Jack Turner Watches — Implementation Scope
**Store:** https://www.jackturnerwatches.com  
**Theme:** Custom Shopify theme (Liquid)  
**Date:** May 2026  

---

## Ground Rules

- Never break desktop when fixing mobile
- Never edit a file without reading it first
- All UI-facing text must be in English
- No external JS libraries — vanilla JS only
- Do not modify any file that is not directly related to the task at hand
- Test every change on both desktop and mobile before marking done

---

## Item 01 — PDP Layout Restructure

**File(s) to touch:** `sections/main-product.liquid` (and any related snippets called within it)

**Goal:** Reorder the product page elements to match the following sequence exactly:

1. Product title
2. Price
3. Star ratings / Loox review snippet
4. Scarcity statement — *"Limited remaining inventory from the current production run."*
5. Shipping date estimate
6. Quantity selector
7. Buy Now button
8. Add to Cart button
9. Trust badges (4 items):
   - ✓ Complimentary Worldwide Shipping
   - ✓ 30-Day Hassle-Free Returns
   - ✓ Secure Encrypted Checkout
   - ✓ International Warranty Coverage
10. Product description — **open by default, not truncated**

**Notes:**
- The "Read more" truncation on the description must be removed. Description stays fully visible.
- Trust badges should be styled inline, matching the premium aesthetic of the store.
- Do not remove or alter any existing functionality — only reorder and reveal.

---

## Item 02 — Star Rating Widget Near CTA

**File(s) to touch:** `sections/main-product.liquid`

**Goal:** Place the Loox star rating snippet directly below the product title, above the price — visible before any scroll.

**Notes:**
- Loox is already installed. Use the existing Loox snippet (`loox-rating` or equivalent — confirm exact snippet name by reading the theme files first).
- This is a placement change, not a new integration.
- On mobile, the widget must not break the layout or overflow.

---

## Item 03 — Sticky Add to Cart Bar — Mobile Only

**File(s) to touch:** New snippet `snippets/sticky-atc.liquid` + include in `sections/main-product.liquid` + styles in `assets/base.css` or equivalent

**Goal:** Build a fixed bottom bar visible on mobile when the user scrolls past the main ATC button. The bar should contain:
- Product title (truncated if too long)
- "Add to Cart" button

**Behavior:**
- Hidden by default
- Appears after user scrolls past the original ATC button
- Disappears if user scrolls back up to the button
- Only visible on mobile (max-width: 768px)
- Does not interfere with desktop layout

**Notes:**
- Vanilla JS only — no libraries
- Must connect to the existing cart logic (same form action as the main ATC button)
- Z-index must be high enough to sit above all other elements

---

## Item 04 — Blog Article Limit Removed

**File(s) to touch:** `sections/main-blog.liquid` or `templates/blog.liquid` (read first to confirm)

**Goal:** Remove the pagination cap that limits the blog to 21 visible articles. All published articles should display or paginate correctly beyond 21.

**Notes:**
- This is likely a `paginate` tag with a hardcoded limit — e.g. `{% paginate blog.articles by 21 %}`
- Change the limit to a high number (e.g. 48 or 100) or implement proper pagination that allows navigation beyond the first page
- Do not remove pagination entirely if the blog has many articles — just raise the cap and confirm navigation works

---

## Item 05 — "Explore" Button Homepage Fix

**File(s) to touch:** `sections/` — whichever section renders the featured product blocks on the homepage (read `templates/index.json` first to identify)

**Goal:** Each "Explore" button on the homepage currently links to the general collection page. It must link to the specific product page for the product shown in that block.

**Products affected:**
- Meridian → `/products/meridian` (confirm exact handle)
- Tsunami → `/products/tsunami` (confirm exact handle)
- Maverick → `/products/maverick` (confirm exact handle)

**Notes:**
- Read the section schema first to understand if links are hardcoded or set via theme settings
- If they are theme settings, update them in the customizer and document the change
- If hardcoded, update the Liquid directly

---

## Item 06 — Spanish Language Strings — Full Frontend Audit

**File(s) to touch:** `locales/en.default.json` (primary), plus any section or snippet files with hardcoded Spanish strings

**Known strings to fix:**
| Spanish | English |
|---|---|
| carrito | cart |
| agregar | add |
| buscar | search |
| vacío | empty |
| Recibe pronto... | Ships within... |
| Agregado al carrito | Added to cart |
| Favoritos | Wishlist |

**Goal:** Audit the entire theme for any Spanish strings surfacing on the customer-facing frontend. Fix all of them — not just the ones listed above.

**Process:**
1. Search the entire theme codebase for hardcoded Spanish words
2. Check `locales/es.json` vs `locales/en.default.json` — ensure the active locale is English
3. Fix any strings not pulling from the locale file by replacing with the correct translation key or hardcoded English equivalent

---

## Item 07 — Image Optimization — Page Speed

**File(s) to touch:** No Liquid changes needed — this is an asset-level task

**Goal:** Identify and optimize oversized images that are slowing down page load, especially on mobile.

**Process:**
1. Run a Lighthouse or PageSpeed audit on the homepage and a PDP
2. Identify images flagged as oversized or unoptimized
3. Re-export or compress those images (target: under 200kb per image where possible)
4. Re-upload to Shopify and replace references if needed
5. Confirm images use Shopify's built-in URL parameters for responsive sizing (`?width=800` etc.) where applicable

**Notes:**
- Do not compress the hero video
- Priority pages: homepage, Quantum Axis PDP

---

## Bonus — Loox Widget Style Audit (Conditional)

**This item is conditional — evaluate before implementing.**

**Goal:** Assess whether Loox allows sufficient CSS customization to match the Jack Turner visual language (typography, colors, layout).

**If yes:** Apply custom CSS to align the widget with the store's aesthetic — font, color, spacing.

**If no:** Scope a separate proposal for a custom-built review app using Loox data via API.

**Do not implement this without confirming scope with the client first.**

---

## Delivery Checklist

- [ ] Item 01 — PDP layout reordered
- [ ] Item 02 — Loox stars near CTA
- [ ] Item 03 — Sticky ATC on mobile
- [ ] Item 04 — Blog limit removed
- [ ] Item 05 — Explore buttons fixed
- [ ] Item 06 — All Spanish strings corrected
- [ ] Item 07 — Images optimized
- [ ] All items tested on desktop Chrome
- [ ] All items tested on mobile Safari
- [ ] No regressions on homepage or other PDPs
