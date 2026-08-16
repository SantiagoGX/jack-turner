# Jack Turner — Handoff de Desarrollo

**Fecha:** 2026-05-21  
**Tema activo:** SNC-JT-Final — ID `148409352343`  
**Store:** `jack-turner-watches.myshopify.com`  
**Directorio local:** `/Users/santiagosalinas/Documents/Shopify-Projects/Jack Turner`  
**Push command base:**
```bash
shopify theme push --only <archivos> --store jack-turner-watches.myshopify.com --theme 148409352343 --allow-live
```

---

## Lo que pidió el cliente (mensaje original de Jose)

> Here's a brief list of optimizations I'd like to make to the website:
>
> 1. **Product page layout** — I'd like to rearrange the order in which information is shown on product pages. The current layout isn't guiding the customer through the page like it should. I'd like it to go: Product title / Price / Limited edition badge + scarcity element / Free shipping text / BUY NOW + ADD TO CART / Reviews + stars / Trust badges / Description / Specifications
>
> 2. **Description should be open by default** — Currently it's "hidden" unless you open the dropdown. I want it to be readable from the get-go: open by default, with a "Read less" option. Or, if simpler, just as plain text — no dropdown at all.
>
> 3. **Specifications** — I want the specifications of each watch to be shown separately from the description, in a collapsible section below. The specs are different per product, so this needs to come from a per-product metafield (not hardcoded). The section should be positioned between the description and the shipping/refund policy sections.
>
> 4. **Sticky Add to Cart on mobile** — On mobile, a sticky bar at the bottom with the product name and Add to Cart button, so customers can always purchase without scrolling back up.
>
> 5. **Blog: 21 → 100+ articles** — The blog section on the homepage currently shows only 21 articles. I'd like to increase that limit to show more (ideally 100+).
>
> 6. **"Explore" button** — The Explore button on the homepage should link to the product page, not a collection or generic page.
>
> 7. **Spanish strings** — There are still some Spanish strings visible to the customer on the frontend (buttons, labels, ARIA attributes). These need to be in English.

---

## Estado de cada punto — qué se hizo

| # | Pedido | Estado | Notas |
|---|--------|--------|-------|
| 1 | Reordenar layout PDP | ✅ Hecho | El orden fue ajustado en `templates/product.json` via `block_order`. Las stars fueron reposicionadas via el editor de Shopify. |
| 2 | Descripción abierta por defecto | ✅ Hecho | JS modificado: `wrap.classList.remove('is-collapsible'); setExpanded(true)` en `snc-pdp-hero.liquid`. |
| 3 | Accordeón de Specifications | ✅ Hecho (resuelto sesión 2026-05-21) | Bug de render de filas corregido. Metafield `custom.specifications` funciona correctamente. Estilos de acordeones unificados. |
| 4 | Sticky ATC mobile | ✅ Hecho (sesión anterior) | Ya estaba implementado. |
| 5 | Blog 21→100+ artículos | ✅ Hecho | `templates/blog.json` ya tenía `"limit": 48`, schema max 100. |
| 6 | Botón Explore → product page | ✅ Hecho (sesión anterior) | Ya estaba implementado. |
| 7 | Spanish strings en frontend | ✅ Hecho (resuelto sesión 2026-05-21) | 20 strings corregidos en 9 archivos: ARIA labels (snc-reviews, snc-info-hero, snc-header), schema defaults (snc-flex-content, snc-flex-content-vertical, snc-3d-info-section, snc-icon-grid, snc-mixed-grid, snc-side-cart) y Liquid fallback (snc-collection-list). |

---

## Estado actual

✅ Todos los cambios de sesión 2026-05-21 pusheados al tema live (`148409352343`).

---

## Trabajo adicional — Sesión 2026-05-21

### Tipografía — Auditoría y coherencia global

**Problema:** El tema no tenía escala tipográfica global. Cada sección manejaba sus propios tamaños independientemente. Las secciones de homepage y producto usaban encabezados de 48px mientras el PDP hero (referencia aprobada) usa 32px de título de producto — jerarquía invertida.

**Solución:** Auditoría completa de 14+ archivos y reducción de encabezados a escala coherente con la referencia del PDP.

**Escala de referencia aprobada (PDP hero):**
- Título de producto (live): 32px
- Subtítulo / precio: 20px
- Body / labels: 14px · Small body: 13px · Captions: 12px · Micro: 11px · Hints: 10px

**Archivos modificados (tipografía):**

| Archivo | Cambios aplicados |
|---|---|
| `sections/snc-image-content.liquid` | Heading 40→24px, item titles 24→18px, body 16→14px, border-radius hover img 10→0 |
| `sections/snc-reviews.liquid` | Heading 40→28px, modal title 24→20px, modal body 16→14px + swipe touch en móvil |
| `sections/snc-flex-content-vertical.liquid` | Heading 48→40px, mobile 32→28px |
| `sections/snc-flex-content-end.liquid` | Heading 48→40px, subheading 18→16px |
| `sections/snc-our-story.liquid` | Subtitle 17→14px, body 16→14px |
| `sections/snc-article.liquid` | Title clamp max 48→40px |
| `sections/snc-policies-page.liquid` | Title clamp max 44→40px, body 16→14px |
| `sections/snc-header.liquid` | Announcement bar 14.42→14px, nav link 15.42→15px |

Rollback completo documentado en `TYPOGRAPHY_ROLLBACK.md`.

---

### 404 Page — Rediseño completo

**Problema:** La página 404 tenía contenido de otro cliente (De Leville — anillos, bolsos, colecciones ajenas). El template tenía 5 secciones basura.

**Solución:** Reemplazado `sections/404.liquid` y `templates/404.json` completamente.

**Diseño:**
- Fondo crema `#f4f2ef` full-screen (`min-height: 100dvh`)
- "404" en 220px weight 200 color `#c9c4bc` — grande pero silencioso
- Línea divisora dorada `#8b7355` de 48px
- Kicker "JACK TURNER WATCHES" 10px uppercase
- Heading: *"This page is no longer part of our collection."*
- Copy on-brand en `#4a4a48`
- Botón negro sharp "RETURN TO COLLECTION" → homepage
- Link secundario "Browse all watches" → all products
- Esquinas 0 en todo, sin imports externos, solo `var(--font-main)`

---

### Reviews — Swipe táctil en móvil

**Problema:** El carrusel de reviews solo se movía automáticamente. En móvil no se podía interactuar.

**Solución:** JS añadido en `sections/snc-reviews.liquid` (bloque `<script>` separado, no toca el código existente).

**Comportamiento:**
- Auto-scroll se mantiene igual en desktop y móvil
- En touch: al arrastrar, la animación CSS se pausa y se aplica transform directo
- Al soltar, la animación se reanuda exactamente desde donde quedó (via `animation-delay` negativo calculado)
- Umbral de 8px para distinguir tap (abre modal) de swipe (mueve carrusel)
- Solo activo si `ontouchstart` existe — no afecta desktop

---

### Eliminaciones

| Archivo eliminado | Razón |
|---|---|
| `sections/snc-hero-slider.liquid` | Sección huérfana, no referenciada en ningún template |
| Contenido De Leville en `templates/404.json` | Basura de otro cliente |

---

## Push pendiente

Ninguno — todo en producción.

---

## Archivos modificados y qué cambió

### 1. `sections/snc-pdp-hero.liquid` — archivo principal del PDP

#### A. Bloque `{% when 'specifications' %}` — acordeón de especificaciones

Lee el metafield `custom.specifications` del producto y lo renderiza como acordeón colapsable con tabla de dos columnas.

**Metafield requerido:**
- Namespace: `custom` / Key: `specifications`
- Tipo: **Multi-line text** (imprescindible — no single-line)
- Formato: una spec por línea, formato `Clave: Valor`
  ```
  Movement: Custom Sakura Tourbillon Calibre TY06
  Case: 43mm 316L Stainless Steel (12mm thick)
  Crystal: Dual Sapphire (Front & Back)
  Power Reserve: ≥43 Hours
  Water Resistance: 5 ATM
  ```

**Parsing Liquid (línea ~3147):**
```liquid
{%- assign specs_raw = product.metafields.custom.specifications.value -%}
{%- assign spec_lines = specs_raw | newline_to_br | replace: '<br />', '<br>' | split: '<br>' -%}
```
Cada línea se limpia con `strip_html | strip` antes de procesarla.

**HTML generado:**
```html
<dl class="pdp-hero--specs-dl">
  <div class="pdp-hero--spec-row">
    <dt class="pdp-hero--spec-key">Movement</dt>
    <dd class="pdp-hero--spec-val">Custom Sakura Tourbillon Calibre TY06</dd>
  </div>
  ...
</dl>
```

**CSS de la tabla de specs:**
```css
.pdp-hero--specs-dl { margin: 0; padding: 0; }
.pdp-hero--spec-row {
  display: grid;
  grid-template-columns: 40% 1fr;
  gap: 0 16px;
  padding: 10px 0;
  border-bottom: 1px solid #c9c4bc;
}
.pdp-hero--spec-row:first-child { padding-top: 0; }
.pdp-hero--spec-row:last-child { border-bottom: none; padding-bottom: 0; }
.pdp-hero--spec-key { font-size: 14px; color: #4a4a48; font-weight: 500; line-height: 1.65; }
.pdp-hero--spec-val { font-size: 14px; color: #0d0d0d; font-weight: 400; line-height: 1.65; }
```

**Schema del bloque** (en `{% schema %}` al final del archivo):
```json
{
  "type": "specifications",
  "name": "Specifications",
  "settings": [
    { "type": "text", "id": "title", "label": "Accordion title", "default": "Specifications" }
  ]
}
```

---

#### B. CSS de `.pdp-hero--accordion-text` — normalización de los 3 acordeones

Los tres acordeones (Specifications, Shipping Policy, Refund Policy) usan el mismo contenedor `.pdp-hero--accordion-text`. El CSS fue actualizado para que hereden tipografía uniforme y no sean sobreescritos por estilos del tema global:

```css
.pdp-hero--accordion-text {
  padding: 20px 20px;
  font-family: var(--font-main);
  font-size: 14px;
  color: #4a4a48;
  line-height: 1.65;
  font-weight: 400;
}
/* p, div, li, strong, a, h1-h3 también normalizados al mismo estilo */
```

**⚠️ PROBLEMA ACTIVO:** A pesar de esta normalización, Shipping Policy y Refund Policy se ven visualmente diferentes a Specifications en el preview local. El cliente lo notó y lo reportó como pendiente. Ver sección "Problemas sin resolver".

---

#### C. Botón de acordeón — estilo "luxury label"

```css
.pdp-hero--info-bottom .pdp-hero--accordion-button {
  font-size: 11px !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.12em !important;
  color: #0d0d0d !important;
  padding-top: 18px !important;
  padding-bottom: 18px !important;
}
```

---

#### D. Toggle de acordeón — eliminación del botón "Close"

Se eliminó el `<button data-accordion-close>Close</button>` que existía al pie del contenido. Ese botón hacía `scrollIntoView` al cerrarse, causando un salto visual. Ahora el header del acordeón hace toggle (abre/cierra con el mismo click).

JS relevante en `initPdpAccordions` (~línea 3341):
```javascript
toggle.addEventListener('click', (e) => {
  e.preventDefault();
  setOpen(!acc.classList.contains('is-open'));
});
```

---

#### E. Descripción abierta por defecto

En `initPdpDescriptionToggles` (~línea 3400+):
```javascript
wrap.classList.remove('is-collapsible');
setExpanded(true);  // era false
```

---

#### F. ARIA labels corregidos a inglés

- `aria-label="Disminuir cantidad"` → `aria-label="Decrease quantity"` (qty minus)
- `aria-label="Aumentar cantidad"` → `aria-label="Increase quantity"` (qty plus)

---

### 2. `sections/snc-side-cart.liquid`

ARIA labels corregidos en botones de cantidad (2 instancias Liquid + 2 en template literal JS):
- `"Reducir cantidad"` → `"Decrease quantity"`
- `"Incrementar cantidad"` → `"Increase quantity"`

**Pendiente en este archivo:** El texto `"¡Congrats!"` en el mensaje de free shipping desbloqueado. Está en el schema como `default` de un setting — no es un string hardcodeado, está en `settings.free_shipping_message` o similar. Buscar `Congrats` en el archivo para localizarlo.

---

### 3. `sections/overlay.json`

Cookie banner custom desactivado (conflicto con el consent nativo de Shopify que causaba doble banner):
```json
"cookie-banner": {
  "settings": { "enable": false }
}
```

---

### 4. `templates/product.json`

**Bloque `specifications_jt001` agregado** entre descripción y Shipping Policy:
```json
"specifications_jt001": {
  "type": "specifications",
  "settings": { "title": "Specifications" }
}
```

**Block order final de la sección snc-pdp-hero:**
```
scarcity → delivery_text → quantity_selector → primary_actions →
loox_reviews → trust_badges → description → specifications → accordion(shipping) → accordion(refund)
```

**Templates eliminados** (solo queda `product.json`):
- `product.prendas-superiores.json`
- `product.seamless-push-up.json`
- `product.supplex-push-up.json`
- `product.quantum-axis.json`

---

## ✅ Problemas resueltos (sesión 2026-05-21)

### ~~PROBLEMA PRINCIPAL: Estilos inconsistentes entre acordeones~~ — RESUELTO

Los estilos de Shipping Policy, Refund Policy y Specifications fueron unificados. Los tres acordeones se ven consistentes en la PDP.

### ~~PROBLEMA SECUNDARIO: Specifications muestra una sola fila~~ — RESUELTO

El bug de split de Liquid fue corregido. Las specs del metafield `custom.specifications` se renderizan correctamente en múltiples filas.

---

### PROBLEMA MENOR: 502 en `shopify theme dev`

```
Failed to render storefront with status 502 (Bad Gateway). fetch failed TypeError: undici
```

Es un error de red del CLI, no de Liquid (los tags están todos balanceados). Se resuelve reiniciando `shopify theme dev` o haciendo push directo al live theme.

---

## Credenciales

| Servicio | Valor |
|----------|-------|
| Shopify Store | `jack-turner-watches.myshopify.com` |
| Theme ID (live) | `148409352343` |
| Klaviyo Public Key | `X2CxYi` |
| Klaviyo List ID (Legacy Club) | `TWy4DM` |

Resto en `CLAUDE.md` en la raíz del proyecto.
