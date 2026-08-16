# Jack Turner Watches — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute 7 frontend improvements to the Jack Turner Watches Shopify theme: blog pagination, explore button links, Spanish string cleanup, PDP layout restructure with Loox stars, sticky mobile ATC bar, and image optimization guidance.

**Architecture:** All changes are to a custom Shopify Liquid theme (`SNC-JT-Final`). No git repo — changes are pushed live via `shopify theme push --only <file>`. The PDP section is `sections/snc-pdp-hero.liquid` (5,301 lines). Quick/independent items (Tasks 1–3) are done first; PDP restructure items (Tasks 4–6) follow in order; image optimization last.

**Tech Stack:** Shopify Liquid, vanilla JS, CSS, Shopify CLI 3.94.3

---

## File Map

| File | Action | Task |
|------|--------|------|
| `sections/snc-blog-grid.liquid` | Raise schema max from 21 → 100 | 1 |
| `templates/blog.json` | Change limit setting from 21 → 48 | 1 |
| `sections/snc-flex-content-vertical.liquid` | Use `block.settings.product_link` per slide for Explore button | 2 |
| `locales/en.default.json` | Add/fix missing English keys | 3 |
| `sections/snc-pdp-hero.liquid` | Fix description truncation, add Loox inline, restructure block rendering order, add scarcity + trust badges, add sticky ATC include | 4, 5, 6, 7 |
| `templates/product.json` | Reorder blocks, add scarcity + trust badge custom_liquid blocks | 6 |
| `snippets/snc-sticky-atc.liquid` | New: sticky mobile add-to-cart bar | 7 |

---

## Task 1 — Blog Pagination Limit (Item 04)

**Files:**
- Modify: `sections/snc-blog-grid.liquid` (line ~286–298)
- Modify: `templates/blog.json`

The schema `range` for `limit` has `"max": 21` — this caps the Shopify theme editor AND the template setting. Raise the max, then update the live value.

- [ ] **Step 1: Read the schema block in snc-blog-grid.liquid to confirm line numbers**

```bash
grep -n '"id": "limit"' sections/snc-blog-grid.liquid
# Expected output: ~286: "id": "limit",
```

- [ ] **Step 2: Raise schema max from 21 to 100**

In `sections/snc-blog-grid.liquid`, find:
```json
{
  "type": "range",
  "id": "limit",
  "min": 3,
  "max": 21,
  "step": 1,
  "label": "Number of articles",
  "default": 7
}
```
Replace with:
```json
{
  "type": "range",
  "id": "limit",
  "min": 3,
  "max": 100,
  "step": 1,
  "label": "Number of articles",
  "default": 7
}
```

- [ ] **Step 3: Update the live setting in templates/blog.json**

In `templates/blog.json`, find:
```json
"limit": 21,
```
Replace with:
```json
"limit": 48,
```

- [ ] **Step 4: Push both files**

```bash
shopify theme push --only sections/snc-blog-grid.liquid --only templates/blog.json --store jack-turner-watches.myshopify.com
```
Expected: `✔ Theme updated` with no errors.

- [ ] **Step 5: Verify**

Open `https://jack-turner-watches.myshopify.com/blogs/news` and confirm more than 21 articles appear (or that pagination now works beyond page 1 if fewer than 48 articles exist).

---

## Task 2 — Explore Buttons → Individual Product Links (Item 05)

**Files:**
- Modify: `sections/snc-flex-content-vertical.liquid` (line ~332)

The "Explore" button is a section-level link (`section.settings.button_link`) pointing to the collection. Each slide block already has a `product_link` field. Fix: use `block.settings.product_link.url` when available, fallback to the section link.

**Product handles (confirmed from `templates/index.json`):**
- Meridian → `jack-turner-meridian-limited-edition-swiss-automatic-mvmt-sports-watch`
- Tsunami → `the-tsunami-swiss-automatic-dive-watch`
- Maverick → `jack-turner-watches-maverick-pilot-feild-watch`

- [ ] **Step 1: Confirm the button line in the section**

```bash
grep -n "section.settings.button_link\|snc-scroll--btn" sections/snc-flex-content-vertical.liquid
# Expected: line ~332  <a href="{{ section.settings.button_link }}" class="snc-scroll--btn">
```

- [ ] **Step 2: Replace the button href to use block's product_link when set**

In `sections/snc-flex-content-vertical.liquid`, find:
```liquid
            {% if section.settings.button_label != blank %}
              <a href="{{ section.settings.button_link }}" class="snc-scroll--btn">
```
Replace with:
```liquid
            {% if section.settings.button_label != blank %}
              {%- assign _btn_href = section.settings.button_link -%}
              {%- if block.settings.product_link != blank -%}
                {%- assign _btn_href = block.settings.product_link.url -%}
              {%- endif -%}
              <a href="{{ _btn_href }}" class="snc-scroll--btn">
```

- [ ] **Step 3: Push**

```bash
shopify theme push --only sections/snc-flex-content-vertical.liquid --store jack-turner-watches.myshopify.com
```

- [ ] **Step 4: Verify**

On the homepage, hover each "Explore" button and confirm the URL in the browser status bar points to:
- Meridian slide → `/products/jack-turner-meridian-limited-edition-swiss-automatic-mvmt-sports-watch`
- Tsunami slide → `/products/the-tsunami-swiss-automatic-dive-watch`
- Maverick slide → `/products/jack-turner-watches-maverick-pilot-feild-watch`

---

## Task 3 — Spanish Strings Audit (Item 06)

**Files:**
- Modify: `sections/snc-pdp-hero.liquid` (hardcoded Spanish strings)
- Modify: `templates/product.json` (settings with Spanish fallback text)
- Modify: `locales/en.default.json` (missing keys)
- Possibly: other section/snippet files

- [ ] **Step 1: Find all hardcoded Spanish strings in the theme**

```bash
grep -rn "Ahorra\|Agregar\|carrito\|agregar\|buscar\|vacío\|Recibe pronto\|Agregado al carrito\|Favoritos\|Descripción del producto\|seguras y encriptadas\|¡Gracias\|avisaremos\|Mayúsculas\|minúsculas\|MAYÚSCULAS\|Imagen y Texto\|Contenido" --include="*.liquid" --include="*.json" . 2>/dev/null | grep -v ".json.bak" | grep -v "klaviyo-backup"
```

- [ ] **Step 2: Fix hardcoded Spanish in snc-pdp-hero.liquid**

Search for and fix these known strings:

**"Ahorra" (discount badge) — line ~2041:**
Find:
```liquid
<span class="pdp-hero--discount-badge">Ahorra {{ discount_percent }}%</span>
```
Replace with:
```liquid
<span class="pdp-hero--discount-badge">Save {{ discount_percent }}%</span>
```

**"¡Gracias! Te avisaremos cuando esté disponible." (stock notify) — line ~2161:**
Find:
```liquid
<p>{{ block.settings.success_text | default: '¡Gracias! Te avisaremos cuando esté disponible.' }}</p>
```
Replace with:
```liquid
<p>{{ block.settings.success_text | default: 'Thank you! We will notify you when it is back in stock.' }}</p>
```

**"Agregar {{ product.title }}" (aria-label) — line ~3017:**
Find:
```liquid
aria-label="Agregar {{ product.title }}"
```
Replace with:
```liquid
aria-label="Add {{ product.title }}"
```

- [ ] **Step 3: Fix Spanish strings in templates/product.json settings**

In `templates/product.json`, find and replace:

```json
"fallback_text": "Recibe pronto..."
```
→
```json
"fallback_text": "Ships within..."
```

```json
"fallback_text": "Descripción del producto."
```
→
```json
"fallback_text": "Product description."
```

```json
"secure_badge_text": "Compras 100% seguras y encriptadas"
```
→
```json
"secure_badge_text": "100% Secure Encrypted Checkout"
```

- [ ] **Step 4: Check other product template variants**

```bash
grep -n "Recibe pronto\|Descripción del producto\|seguras y encriptadas" templates/product.*.json 2>/dev/null
```
Apply the same replacements to any other `templates/product.*.json` files that have these strings.

- [ ] **Step 5: Scan all other sections for remaining Spanish strings**

```bash
grep -rn "Agregar\|carrito\|buscar\|vacío\|favoritos\|Favoritos" --include="*.liquid" sections/ snippets/ 2>/dev/null
```
Fix any matches found. If a string is pulled from a locale key, check `locales/en.default.json` instead.

- [ ] **Step 6: Check snc-blog-grid.liquid schema labels**

```bash
grep -n "Mayúsculas\|minúsculas\|MAYÚSCULAS" sections/snc-blog-grid.liquid sections/snc-pdp-hero.liquid sections/snc-flex-content-vertical.liquid 2>/dev/null
```
Schema labels are admin-facing (not customer-facing), so these are lower priority — note them but don't block shipping.

- [ ] **Step 7: Push all modified files**

```bash
shopify theme push --only sections/snc-pdp-hero.liquid --only templates/product.json --store jack-turner-watches.myshopify.com
```
Add any additional product template variants found in Step 4.

- [ ] **Step 8: Verify**

Visit a live product page. Confirm:
- Discount badge shows "Save X%" not "Ahorra X%"
- Delivery estimate shows no Spanish fallback
- All visible customer-facing strings are in English

---

## Task 4 — Description Always Expanded (Item 01, point 10)

**Files:**
- Modify: `sections/snc-pdp-hero.liquid` (description block rendering, lines ~2165–2200)

The description block renders a truncated excerpt with a "Read more" toggle. Replace the entire truncation structure with a simple full-render.

- [ ] **Step 1: Locate description block rendering**

```bash
grep -n "pdp-hero--description-wrap\|truncate_length\|description-toggle\|description-excerpt" sections/snc-pdp-hero.liquid
```

- [ ] **Step 2: Replace truncated description with full render**

Find this entire block (approximately lines 2165–2200):
```liquid
          {% when 'description' %}
            {%- assign truncate_length = block.settings.truncate_length | default: 150 -%}
            {%- capture description_source -%}
              {%- if block.settings.custom_description != blank -%}
                {{ block.settings.custom_description }}
              {%- elsif product and product.description != blank -%}
                {{ product.description }}
              {%- else -%}
                {{ block.settings.fallback_text | default: 'Product description.' }}
              {%- endif -%}
            {%- endcapture -%}
            {%- assign description_plain = description_source | strip_html | strip -%}
            <div class="pdp-hero--description-wrap" data-pdp-description {{ block.shopify_attributes }}>
              <div class="pdp-hero--description" data-pdp-description-excerpt>
                {{ description_plain | truncate: truncate_length }}
              </div>
              <div class="pdp-hero--description" data-pdp-description-full>
                {{ description_plain | newline_to_br }}
              </div>
              <div class="pdp-hero--description-fade" aria-hidden="true"></div>
              <button type="button" class="pdp-hero--description-toggle" data-pdp-description-toggle aria-expanded="false">
                Read more
              </button>
            </div>
```

Replace with:
```liquid
          {% when 'description' %}
            {%- capture description_source -%}
              {%- if block.settings.custom_description != blank -%}
                {{ block.settings.custom_description }}
              {%- elsif product and product.description != blank -%}
                {{ product.description }}
              {%- else -%}
                {{ block.settings.fallback_text | default: 'Product description.' }}
              {%- endif -%}
            {%- endcapture -%}
            <div class="pdp-hero--description rte" {{ block.shopify_attributes }}>
              {{ description_source }}
            </div>
```

- [ ] **Step 3: Push**

```bash
shopify theme push --only sections/snc-pdp-hero.liquid --store jack-turner-watches.myshopify.com
```

- [ ] **Step 4: Verify**

Open any product page. Confirm the full product description is visible without any "Read more" button or truncation. Check on mobile that text does not overflow.

---

## Task 5 — Loox Stars Above Price (Item 02)

**Files:**
- Modify: `sections/snc-pdp-hero.liquid` (info-top area, ~line 2030)

Loox is installed as an app extension. To render the star widget inline inside the PDP hero section (above the price), use Loox's app block render approach via `{% render %}` if the snippet exists, or their JS embed via metafields.

- [ ] **Step 1: Check if Loox snippet is available**

```bash
ls snippets/ | grep -i loox
shopify theme pull --only snippets/ --store jack-turner-watches.myshopify.com 2>/dev/null
ls snippets/ | grep -i loox
```

- [ ] **Step 2A: If `loox-rating` snippet exists — render it inline**

In `sections/snc-pdp-hero.liquid`, find the info-top area (line ~2030):
```liquid
        <div class="pdp-hero--price-container">
```

Insert above it:
```liquid
        {%- if product -%}
          <div class="pdp-hero--loox-stars">
            {% render 'loox-rating', product: product, show_rating_text: true %}
          </div>
        {%- endif -%}
        <div class="pdp-hero--price-container">
```

Add CSS near the existing `.pdp-hero--title-row` styles:
```css
  .pdp-hero--loox-stars {
    margin: 6px 0 12px;
  }
```

- [ ] **Step 2B: If no Loox snippet — use metafields embed**

In `sections/snc-pdp-hero.liquid`, insert above the price container:
```liquid
        {%- if product and product.metafields.loox.rating != blank -%}
          <div class="pdp-hero--loox-stars">
            <a href="#loox-reviews" style="display:inline-flex;align-items:center;gap:6px;text-decoration:none;color:inherit;">
              <span data-loox-rating="{{ product.metafields.loox.rating }}"></span>
              <span style="font-size:13px;color:#4a4a48;">({{ product.metafields.loox.rating_count }})</span>
            </a>
          </div>
        {%- endif -%}
        <div class="pdp-hero--price-container">
```

- [ ] **Step 3: Push**

```bash
shopify theme push --only sections/snc-pdp-hero.liquid --store jack-turner-watches.myshopify.com
```

- [ ] **Step 4: Verify**

Open a product page with reviews. Confirm star widget appears between the product title and the price. Check mobile — confirm no overflow.

---

## Task 6 — PDP Full Layout Restructure + Scarcity + Trust Badges (Item 01)

**Files:**
- Modify: `sections/snc-pdp-hero.liquid` (add scarcity and trust_badges block types)
- Modify: `templates/product.json` (reorder blocks, add new custom_liquid blocks)

Target block order per scope:
1. *(title — hardcoded in info-top, already first)*
2. *(price — hardcoded in info-top, already second)*
3. *(Loox stars — added in Task 5, already third)*
4. Scarcity statement
5. Delivery text (shipping estimate)
6. Quantity selector
7. Primary actions (Buy Now + Add to Cart)
8. Trust badges
9. Description

- [ ] **Step 1: Read current block_order in templates/product.json**

```bash
grep -A 20 '"block_order"' templates/product.json | head -25
```
Expected current order:
```
delivery_text_qTAa3q
quantity_selector_bNNPbB
primary_actions_aN9Fze
description_3KyRig
accordion_W6VR7c
accordion_9AYnTj
```

- [ ] **Step 2: Add scarcity block type to snc-pdp-hero.liquid schema**

At the end of the section's `blocks` array in the schema (search for `"type": "accordion"` block definition and add after it), add:

```json
,
{
  "type": "scarcity",
  "name": "Scarcity Statement",
  "settings": [
    {
      "type": "text",
      "id": "text",
      "label": "Text",
      "default": "Limited remaining inventory from the current production run."
    }
  ]
}
```

- [ ] **Step 3: Add scarcity block rendering to snc-pdp-hero.liquid**

In the `{% case block.type %}` switch (after `{% when 'delivery_text' %}`), add:

```liquid
          {% when 'scarcity' %}
            {%- if block.settings.text != blank -%}
              <p class="pdp-hero--scarcity" {{ block.shopify_attributes }}>{{ block.settings.text }}</p>
            {%- endif -%}
```

Add CSS near `.pdp-hero--description` styles:
```css
  .pdp-hero--scarcity {
    font-size: 13px;
    color: #4a4a48;
    margin: 0 0 12px;
    font-style: italic;
  }
```

- [ ] **Step 4: Add trust_badges block type to snc-pdp-hero.liquid schema**

Add after the scarcity block schema entry:
```json
,
{
  "type": "trust_badges",
  "name": "Trust Badges",
  "settings": []
}
```

- [ ] **Step 5: Add trust_badges block rendering to snc-pdp-hero.liquid**

In the `{% case block.type %}` switch, add:

```liquid
          {% when 'trust_badges' %}
            <ul class="pdp-hero--trust-badges" {{ block.shopify_attributes }}>
              <li>✓ Complimentary Worldwide Shipping</li>
              <li>✓ 30-Day Hassle-Free Returns</li>
              <li>✓ Secure Encrypted Checkout</li>
              <li>✓ International Warranty Coverage</li>
            </ul>
```

Add CSS:
```css
  .pdp-hero--trust-badges {
    list-style: none;
    padding: 0;
    margin: 16px 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .pdp-hero--trust-badges li {
    font-size: 13px;
    color: #4a4a48;
    letter-spacing: 0.02em;
  }
```

- [ ] **Step 6: Update templates/product.json with new block order**

In the `"main"` section of `templates/product.json`, update `"blocks"` to add the two new blocks, and update `"block_order"` to match the target sequence.

Add to `"blocks"`:
```json
"scarcity_jt001": {
  "type": "scarcity",
  "settings": {
    "text": "Limited remaining inventory from the current production run."
  }
},
"trust_badges_jt001": {
  "type": "trust_badges",
  "settings": {}
},
```

Update `"block_order"` to:
```json
"block_order": [
  "scarcity_jt001",
  "delivery_text_qTAa3q",
  "quantity_selector_bNNPbB",
  "primary_actions_aN9Fze",
  "trust_badges_jt001",
  "description_3KyRig",
  "accordion_W6VR7c",
  "accordion_9AYnTj"
]
```

- [ ] **Step 7: Push both files**

```bash
shopify theme push --only sections/snc-pdp-hero.liquid --only templates/product.json --store jack-turner-watches.myshopify.com
```

- [ ] **Step 8: Verify on desktop and mobile**

Open a product page. Confirm order from top to bottom:
1. Product title
2. Price
3. Loox stars (from Task 5)
4. Scarcity statement *(italic, muted)*
5. Delivery estimate
6. Quantity selector
7. Buy Now → Add to Cart
8. Trust badges list
9. Full description *(no truncation)*

Check mobile — confirm layout does not break, no horizontal overflow.

---

## Task 7 — Sticky Add to Cart Bar (Mobile Only) (Item 03)

**Files:**
- Create: `snippets/snc-sticky-atc.liquid`
- Modify: `sections/snc-pdp-hero.liquid` (include snippet + add CSS)

The bar appears when the main ATC button scrolls out of view on mobile. It hides when the button is back in view. Vanilla JS only.

- [ ] **Step 1: Create snippets/snc-sticky-atc.liquid**

```liquid
{%- if product -%}
<div id="snc-sticky-atc" class="snc-sticky-atc" aria-hidden="true">
  <span class="snc-sticky-atc--title">{{ product.title | truncate: 40 }}</span>
  <form action="/cart/add" method="post" class="snc-sticky-atc--form">
    <input type="hidden" name="id" value="{{ product.selected_or_first_available_variant.id }}">
    <input type="hidden" name="quantity" value="1">
    <button type="submit" class="snc-sticky-atc--btn">Add to Cart</button>
  </form>
</div>

<style>
  .snc-sticky-atc {
    display: none;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 9999;
    background: #f4f2ef;
    border-top: 1px solid #c9c4bc;
    padding: 12px 20px;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    transform: translateY(100%);
    transition: transform 0.3s ease;
  }
  .snc-sticky-atc.is-visible {
    transform: translateY(0);
  }
  .snc-sticky-atc--title {
    font-size: 13px;
    color: #0d0d0d;
    font-weight: 500;
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .snc-sticky-atc--btn {
    background: #0d0d0d;
    color: #f4f2ef;
    border: none;
    padding: 12px 24px;
    font-size: 13px;
    font-weight: 500;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    cursor: pointer;
    white-space: nowrap;
    border-radius: 0;
  }
  @media (min-width: 769px) {
    .snc-sticky-atc { display: none !important; }
  }
  @media (max-width: 768px) {
    .snc-sticky-atc { display: flex; }
  }
</style>

<script>
  (function () {
    const bar = document.getElementById('snc-sticky-atc');
    if (!bar) return;

    const atcBtn = document.querySelector('.pdp-hero--button-add-cart');
    if (!atcBtn) return;

    let ticking = false;

    function update() {
      const rect = atcBtn.getBoundingClientRect();
      const belowFold = rect.bottom < 0 || rect.top > window.innerHeight;
      if (belowFold) {
        bar.classList.add('is-visible');
        bar.setAttribute('aria-hidden', 'false');
      } else {
        bar.classList.remove('is-visible');
        bar.setAttribute('aria-hidden', 'true');
      }
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });

    update();
  })();
</script>
{%- endif -%}
```

- [ ] **Step 2: Find the insertion point in snc-pdp-hero.liquid and include the snippet**

```bash
grep -n "endcapture\|endfor.*block\|</div>.*pdp-hero--info\|pdp-hero--content-col\b" sections/snc-pdp-hero.liquid | tail -20
```

Look for the closing `</div>` of the `pdp-hero--info-bottom` or equivalent content column — it appears after the last `{% endfor %}` of the blocks loop (~line 3040). Insert immediately after that `{% endfor %}`:

```liquid
{% render 'snc-sticky-atc', product: product %}
```

- [ ] **Step 3: Push both files**

```bash
shopify theme push --only snippets/snc-sticky-atc.liquid --only sections/snc-pdp-hero.liquid --store jack-turner-watches.myshopify.com
```

- [ ] **Step 4: Verify on mobile**

Open a product page on a mobile device (or Chrome DevTools mobile emulation at 375px width). Scroll down past the Add to Cart button. Confirm:
- Sticky bar slides up from bottom
- Product title truncated correctly
- "Add to Cart" button works (adds to cart)
- Scrolling back up hides the bar
- On desktop (≥769px) the bar is completely hidden

---

## Task 8 — Image Optimization Guidance (Item 07)

This task requires a Lighthouse audit and cannot be fully automated. Steps are here for the implementing agent to follow.

- [ ] **Step 1: Run PageSpeed on homepage and a PDP**

Open in browser:
- `https://pagespeed.web.dev/` → test `https://jack-turner-watches.myshopify.com`
- `https://pagespeed.web.dev/` → test `https://jack-turner-watches.myshopify.com/products/jack-turner-meridian-limited-edition-swiss-automatic-mvmt-sports-watch`

- [ ] **Step 2: Note all images flagged under "Properly size images" or "Efficiently encode images"**

- [ ] **Step 3: For each flagged image, ensure Shopify URL parameters are used in Liquid**

Anywhere an image is output in Liquid without a width parameter, add one:
```liquid
{{ image | image_url: width: 800 | image_tag: loading: 'lazy' }}
```
Do NOT apply this to hero video files.

- [ ] **Step 4: For images outside Shopify CDN (local assets), re-export at target size**

Target: under 200kb per image. Priority pages: homepage hero section, Quantum Axis PDP.

- [ ] **Step 5: Push any modified files**

```bash
shopify theme push --only <modified-files> --store jack-turner-watches.myshopify.com
```

---

## Delivery Checklist

- [ ] Task 1 — Blog limit raised, 48 articles visible
- [ ] Task 2 — Explore buttons link to individual product pages
- [ ] Task 3 — All Spanish strings removed from customer-facing frontend
- [ ] Task 4 — Description always fully expanded, no "Read more" button
- [ ] Task 5 — Loox stars visible between title and price
- [ ] Task 6 — PDP block order matches scope spec, scarcity + trust badges present
- [ ] Task 7 — Sticky ATC bar works on mobile, hidden on desktop
- [ ] Task 8 — PageSpeed audit complete, oversized images addressed
- [ ] All items tested on desktop Chrome
- [ ] All items tested on mobile Safari (or Chrome DevTools mobile)
- [ ] No regressions on homepage or other PDPs
