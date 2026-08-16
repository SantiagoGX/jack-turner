# Client Feedback Round 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply 8 client feedback items to improve the PDP, homepage sections, and product layout.

**Architecture:** Changes span 3 files heavily (`sections/snc-pdp-hero.liquid`, `templates/product.json`, `templates/index.json`) and one new file (`templates/product.quantum-axis.json`). Tasks are independent and can be done in any order except Task 8 (depends on product.json being stable).

**Tech Stack:** Shopify Liquid, JSON templates, inline SVG, CSS, `shopify theme push`

---

## Context — What Already Exists

- `templates/product.json` — single template for all product pages, block_order controls PDP layout
- `sections/snc-pdp-hero.liquid` — main PDP section; trust_badges block renders a plain checkmark `<ul>`
- `templates/index.json` — homepage template; `snc_custom_content_text_i6YUXA` section holds "Time, Considered." text
- `sections/snc-info-hero.liquid` — hero section with award badge; badge CSS is at `.snc-info-hero--award-badge` (font-size: 9px)
- Star ratings are pulled from Loox via `product.metafields.loox.rating` — this is informational, no code change

---

## Question Answered (no code needed)

**"Where are the star ratings pulling from?"**
Stars shown under the product title come from the **Loox app** via Shopify metafields:
- `product.metafields.loox.rating` → average score
- `product.metafields.loox.rating_count` → review count
Loox populates these automatically when reviews are collected. No action required.

---

## Task 1: Perfect Gift Award Badge — Increase Size

**Files:**
- Modify: `sections/snc-info-hero.liquid` (CSS around line 748)

The badge currently has `font-size: 9px` and `padding: 8px 14px`. Increase to be more visible without breaking the minimal luxury feel.

- [ ] **Step 1: Find and update badge CSS**

In `sections/snc-info-hero.liquid`, find `.snc-info-hero--award-badge` (around line 748–768) and change:

```css
/* FROM */
font-size: 9px;
padding: 8px 14px;

/* TO */
font-size: 11px;
padding: 10px 18px;
```

Also find the mobile override around line 840+ (`.snc-info-hero--award-badge` inside `@media`):
```css
/* FROM */
font-size: 8px;

/* TO */
font-size: 10px;
```

- [ ] **Step 2: Push the file**

```bash
cd "/Users/santiagosalinas/Documents/Shopify-Projects/Jack Turner"
shopify theme push --only sections/snc-info-hero.liquid --store jack-turner-watches.myshopify.com --theme 148409352343 --allow-live
```

Expected: upload success, no errors.

- [ ] **Step 3: Verify on live site**

Open homepage on jackturnerwatches.com and confirm the "THE PERFECT GIFT AWARD 2026" badge is visibly larger than before, still elegant.

---

## Task 2: "Time, Considered." — Match Size with CTA

**Files:**
- Modify: `templates/index.json`

Currently:
- `text_qaE9qn` block: `"text": "<p>Time, Considered.</p>"`, `"font_size": 36`, `"color": "#2a4432"` (green — leftover!)
- `buttons_acUXL9` block: `"btn1_text": "Discover The Quantum Axis."`, `"btn1_font_size": 25`

The client wants "Time, Considered." to match the visual size of "Discover The Quantum Axis." CTA. We reduce the tagline to 25px to match, and fix the leftover `#2a4432` green color.

- [ ] **Step 1: Update text_qaE9qn block in index.json**

In `templates/index.json`, find `text_qaE9qn` block settings and change:

```json
"font_size": 25,
"font_size_mobile": 17,
"color": "#4a4a48"
```

(was `"font_size": 36`, `"color": "#2a4432"`)

- [ ] **Step 2: Push the file**

```bash
shopify theme push --only templates/index.json --store jack-turner-watches.myshopify.com --theme 148409352343 --allow-live
```

- [ ] **Step 3: Verify on live site**

Open homepage and confirm "Time, Considered." and the "Discover The Quantum Axis." button appear visually balanced in size. Also confirm the tagline is no longer green — should be `#4a4a48` (dark gray).

---

## Task 3: Gray Strip — "2 YEAR WARRANTY" → "2-YEAR WARRANTY"

**Files:**
- The text lives in Shopify's server-side `settings_data.json` (not in the local repo)

The strip at the top of the homepage that reads "COMPLIMENTARY SHIPPING • 2 YEAR WARRANTY • 30 DAY RETURN PRIVILEGE" is stored as announcement bar block settings in the header section — editable only via Shopify theme editor or by pulling settings_data.json.

- [ ] **Step 1: Pull current settings_data.json from Shopify**

```bash
shopify theme pull --only config/settings_data.json --store jack-turner-watches.myshopify.com --theme 148409352343
```

- [ ] **Step 2: Find and fix the text**

Open `config/settings_data.json` and search for `2 YEAR`. Change it to `2-YEAR`. Example diff:

```json
// FROM
"text": "COMPLIMENTARY SHIPPING • 2 YEAR WARRANTY • 30 DAY RETURN PRIVILEGE"

// TO
"text": "COMPLIMENTARY SHIPPING • 2-YEAR WARRANTY • 30 DAY RETURN PRIVILEGE"
```

> ⚠️ `settings_data.json` is a protected file. Make ONE targeted edit only. Do NOT touch other keys.

- [ ] **Step 3: Push settings_data.json**

```bash
shopify theme push --only config/settings_data.json --store jack-turner-watches.myshopify.com --theme 148409352343 --allow-live
```

- [ ] **Step 4: Verify on live site**

Confirm the strip now reads "2-YEAR WARRANTY".

---

## Task 4: PDP Block Reorder — Star Rating Under Price

**Files:**
- Modify: `templates/product.json` (block_order inside `"main"` section)

Current block_order:
```
scarcity → delivery → quantity → primary_actions → loox_rating → trust_badges → description → specs → accordion(shipping) → accordion(refund)
```

Target (per reference image — stars immediately after price, before scarcity/buttons):
```
loox_rating → scarcity → delivery → quantity → primary_actions → trust_badges → description → specs → accordion(shipping) → accordion(refund)
```

- [ ] **Step 1: Update block_order in templates/product.json**

Find `"block_order"` inside the `"main"` section and replace it with:

```json
"block_order": [
  "loox_reviews_loox_rating_FKry73",
  "scarcity_jt001",
  "delivery_text_qTAa3q",
  "quantity_selector_bNNPbB",
  "primary_actions_aN9Fze",
  "trust_badges_jt001",
  "description_3KyRig",
  "specifications_jt001",
  "accordion_W6VR7c",
  "accordion_9AYnTj"
]
```

- [ ] **Step 2: Push**

```bash
shopify theme push --only templates/product.json --store jack-turner-watches.myshopify.com --theme 148409352343 --allow-live
```

- [ ] **Step 3: Verify on live PDP**

Open any product page, confirm star rating appears directly under the price/title area, before the scarcity text and buttons.

---

## Task 5: Trust Badges — Redesign as Icon Badges

**Files:**
- Modify: `sections/snc-pdp-hero.liquid` (CSS around line 610, HTML around line 2270)

Current: plain `<ul>` with checkmark characters.
Target (per reference image): 4 horizontal icons with 2-line labels — matching Jack Turner palette.

Icons used (inline SVG, no external fonts or images):
- Lock → SECURE CHECKOUT
- Globe → WORLDWIDE SHIPPING
- Shield → 30-DAY RETURNS
- Award/circle → 2-YEAR WARRANTY

- [ ] **Step 1: Replace CSS for trust badges (around line 610)**

Find `.pdp-hero--trust-badges` and `.pdp-hero--trust-badges li` and replace the entire block with:

```css
.pdp-hero--trust-badges {
  list-style: none;
  padding: 0;
  margin: 20px 0;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}
.pdp-hero--trust-badge-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 14px 8px;
  border: 1px solid #c9c4bc;
  text-align: center;
}
.pdp-hero--trust-badge-icon {
  width: 24px;
  height: 24px;
  color: #0d0d0d;
  flex-shrink: 0;
}
.pdp-hero--trust-badge-icon svg {
  width: 100%;
  height: 100%;
  stroke: currentColor;
}
.pdp-hero--trust-badge-label {
  font-size: 10px;
  font-weight: 500;
  color: #0d0d0d;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  line-height: 1.3;
}
@media (max-width: 500px) {
  .pdp-hero--trust-badges {
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
  }
}
```

- [ ] **Step 2: Replace the trust_badges HTML block (around line 2270)**

Find the `{% when 'trust_badges' %}` case and replace the entire `<ul>` with:

```liquid
{% when 'trust_badges' %}
<ul class="pdp-hero--trust-badges" {{ block.shopify_attributes }}>
  <li class="pdp-hero--trust-badge-item">
    <span class="pdp-hero--trust-badge-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="0"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>
      </svg>
    </span>
    <span class="pdp-hero--trust-badge-label">Secure<br>Checkout</span>
  </li>
  <li class="pdp-hero--trust-badge-item">
    <span class="pdp-hero--trust-badge-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
      </svg>
    </span>
    <span class="pdp-hero--trust-badge-label">Worldwide<br>Shipping</span>
  </li>
  <li class="pdp-hero--trust-badge-item">
    <span class="pdp-hero--trust-badge-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
      </svg>
    </span>
    <span class="pdp-hero--trust-badge-label">30-Day<br>Returns</span>
  </li>
  <li class="pdp-hero--trust-badge-item">
    <span class="pdp-hero--trust-badge-icon">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
      </svg>
    </span>
    <span class="pdp-hero--trust-badge-label">2-Year<br>Warranty</span>
  </li>
</ul>
```

- [ ] **Step 3: Push**

```bash
shopify theme push --only sections/snc-pdp-hero.liquid --store jack-turner-watches.myshopify.com --theme 148409352343 --allow-live
```

- [ ] **Step 4: Verify on live PDP**

Open a product page and confirm trust badges show as 4 columns with SVG icons, sharp corners, and correct labels. Check mobile (2-column layout).

---

## Task 6: Move Reviews Carousel Under Refund Policy

**Files:**
- Modify: `templates/product.json` (top-level `"order"` array)

Current order:
```
main → snc_images_JkfyBL → snc_image_content_r8t43L → snc_related_grid_bDwqUY → snc_reviews_AgFfg7 → 177772774512f84a51 → 177895133763e44103
```

Target — reviews section immediately after main (which ends with Refund Policy accordion):
```
main → snc_reviews_AgFfg7 → snc_images_JkfyBL → snc_image_content_r8t43L → snc_related_grid_bDwqUY → 177772774512f84a51 → 177895133763e44103
```

- [ ] **Step 1: Update the `order` array in templates/product.json**

Find the top-level `"order"` array and replace with:

```json
"order": [
  "main",
  "snc_reviews_AgFfg7",
  "snc_images_JkfyBL",
  "snc_image_content_r8t43L",
  "snc_related_grid_bDwqUY",
  "177772774512f84a51",
  "177895133763e44103"
]
```

- [ ] **Step 2: Push**

```bash
shopify theme push --only templates/product.json --store jack-turner-watches.myshopify.com --theme 148409352343 --allow-live
```

- [ ] **Step 3: Verify on live PDP**

Scroll a product page and confirm the "A Community of Legacy" reviews carousel appears directly after the Refund Policy accordion, not at the bottom.

---

## Task 7: Increase Mobile Font Sizes on Product Pages

**Files:**
- Modify: `sections/snc-pdp-hero.liquid` (mobile `@media` CSS)

Fonts that look small on mobile: product title, price, description body text. The PDP hero uses inline styles from section settings for title font size (currently 32px desktop). On mobile the CSS doesn't explicitly increase body legibility.

- [ ] **Step 1: Find the mobile @media blocks in snc-pdp-hero.liquid**

Search for `@media (max-width: 768px)` or `@media (max-width: 600px)` inside the `<style>` block (around lines 480–560 in the CSS section).

- [ ] **Step 2: Add/update mobile font size overrides**

Find or add a mobile override block for the following selectors. If the selectors already exist in a mobile @media rule, update the values. If they don't exist, add them to the closest `@media (max-width: 768px)` block:

```css
@media (max-width: 768px) {
  /* product title — rendered via inline style from settings (32px), bump via CSS override */
  .pdp-hero--title {
    font-size: 26px !important;
  }
  /* price display */
  .pdp-hero--price,
  .pdp-hero--price .price,
  .pdp-hero--price [class*="price"] {
    font-size: 20px !important;
  }
  /* description body */
  .pdp-hero--description,
  .pdp-hero--description p,
  .pdp-hero--description li {
    font-size: 14px !important;
    line-height: 1.7 !important;
  }
  /* scarcity label */
  .pdp-hero--scarcity {
    font-size: 12px !important;
  }
}
```

> Note: The title size override uses `!important` to beat the inline `style` attribute set by the section settings. The current setting is 32px on desktop — 26px on mobile is a reasonable reduction.

- [ ] **Step 3: Push**

```bash
shopify theme push --only sections/snc-pdp-hero.liquid --store jack-turner-watches.myshopify.com --theme 148409352343 --allow-live
```

- [ ] **Step 4: Verify**

Open a product page on mobile (or DevTools 375px). Confirm title, price, and description text are comfortably readable.

---

## Task 8: Remove Recommended Pieces from Quantum Axis Page Only

**Files:**
- Create: `templates/product.quantum-axis.json`
- Note: After pushing, the Quantum Axis product must be assigned this template in Shopify admin (Products → Quantum Axis → Theme template → `product.quantum-axis`)

The cleanest approach is a dedicated template — it has no risk of breaking other product pages.

- [ ] **Step 1: Create product.quantum-axis.json**

Copy `templates/product.json` to `templates/product.quantum-axis.json`. Then remove the `snc_related_grid_bDwqUY` section entirely:

1. Delete the `"snc_related_grid_bDwqUY"` key and its entire object from the `"sections"` map
2. Remove `"snc_related_grid_bDwqUY"` from the `"order"` array

The `order` in the new template should be:
```json
"order": [
  "main",
  "snc_reviews_AgFfg7",
  "snc_images_JkfyBL",
  "snc_image_content_r8t43L",
  "177772774512f84a51",
  "177895133763e44103"
]
```

(Note: assumes Task 6 has already been applied to product.json, so snc_reviews_AgFfg7 is already second.)

- [ ] **Step 2: Push new template**

```bash
shopify theme push --only templates/product.quantum-axis.json --store jack-turner-watches.myshopify.com --theme 148409352343 --allow-live
```

- [ ] **Step 3: Assign template in Shopify admin**

1. Go to Shopify Admin → Products
2. Open **Quantum Axis Tourbillon** product
3. In the right sidebar, find **Theme template**
4. Change from `product` to `product.quantum-axis`
5. Save

- [ ] **Step 4: Verify on live site**

Open the Quantum Axis product page and confirm "Recommended Pieces" section no longer appears. Open any other product page and confirm Recommended Pieces still appears normally.

---

## Push Summary

Most efficient push order (minimizes total pushes):

| Tasks combined | File | Command |
|---|---|---|
| Task 1 | `sections/snc-info-hero.liquid` | `--only sections/snc-info-hero.liquid` |
| Tasks 4, 5, 6 together | `sections/snc-pdp-hero.liquid` + `templates/product.json` | `--only sections/snc-pdp-hero.liquid templates/product.json` |
| Task 2 | `templates/index.json` | `--only templates/index.json` |
| Task 3 | `config/settings_data.json` | Pull first, then push |
| Task 8 | `templates/product.quantum-axis.json` | `--only templates/product.quantum-axis.json` |

```bash
# Tasks 4, 5, 6 — push both PDP files together
shopify theme push --only sections/snc-pdp-hero.liquid templates/product.json --store jack-turner-watches.myshopify.com --theme 148409352343 --allow-live
```
