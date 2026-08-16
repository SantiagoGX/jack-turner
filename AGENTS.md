# JACK TURNER WATCHES — PROJECT MEMORY

## 🔑 Credenciales

| Servicio | Clave |
|----------|-------|
| Klaviyo Private API Key | `pk_ae78fcf3eca25b3f0bf11938fac1afa77a` |
| Klaviyo Public Key | `X2CxYi` |
| Klaviyo Newsletter List ID | `TWy4DM` |
| Facebook Pixel | `543974622835945` |
| Pinterest Tag | `549756787032` |
| Google Analytics GA4 | `G-3Z20QPFHXE` |
| Shopify Google Tag | `GT-5DCVJ3J` |

---

## 🏗️ Reglas de Diseño

- **Estética:** Ultra-minimalista Luxury (Rolex / Patek Philippe).
- **Fuentes:** SOLO fuentes definidas en el tema. Cero imports externos.
- **Paleta de colores obligatoria:**
  - `#0d0d0d` — negro principal (texto, botones, bordes)
  - `#f4f2ef` — crema cálido (fondos)
  - `#4a4a48` — texto secundario
  - `#c9c4bc` — bordes y divisores
  - `#8b7355` — acento dorado
- **Border-radius:** `0` en todo (esquinas vivas). Excepción: `50%` solo para avatares circulares.
- **Tono:** Alto valor percibido, mucho espacio en blanco, cero ruido.

---

## ✅ Trabajo Completado (sesiones anteriores)

### Shopify — Componentes Construidos

| Archivo | Estado | Descripción |
|---------|--------|-------------|
| `sections/snc-legacy-club-popup.liquid` | ✅ Listo | Pop-up Legacy Club. Exit-intent + timer configurable + cookie. Klaviyo Client API (no captcha). Animaciones entrada/salida mejoradas (Y-lift + scale). |
| `sections/snc-footer.liquid` | ✅ Listo | Footer completo con sección Legacy Club a la derecha. Form plano `<form>` (NO `{%- form 'customer' -%}`) → sin captcha. Klaviyo Client API directo. |
| `snippets/snc-tracking-v2.liquid` | ✅ Listo | Pixels: Meta (FB), Pinterest, GA4, Google Tag, Klaviyo onsite JS. Se renderiza en `<head>` de `layout/theme.liquid`. |
| `sections/overlay.json` | ✅ Listo | Configura el pop-up en el overlay template. `enable_popup: true`, list `TWy4DM`, `inactivity_seconds: 0`, `cookie_days: 0`. |

### Shopify — Audit de Lujo (Aplicado)

| Fix | Archivos afectados |
|-----|--------------------|
| Color `#2A4432` (verde legacy) eliminado → `#0d0d0d` | 27 archivos, 328 reemplazos |
| Emojis 🎉 eliminados como iconos UI | `snc-cart-page`, `snc-side-cart`, `snc-header` |
| `border-radius` corregidos a `0` | `snc-side-cart` (16 instancias) |

### Klaviyo

| Acción | Resultado |
|--------|-----------|
| Welcome flow configurado | Trigger: "Added to list TWy4DM". Re-entry permitido. Double opt-in desactivado (single opt-in). |
| Cleanup de profiles | 4,560 profiles suprimidos vía API (batch suppression). 100 más recientes de la lista conservados. Backup guardado en `klaviyo-backup-20260405_*.json`. |

### Loox — Widget CSS Overrides (2026-05-22)

| Archivo | Estado | Descripción |
|---------|--------|-------------|
| `assets/critical.css` | ✅ Listo (pendiente push) | Bloque `/* === LOOX WIDGET OVERRIDES === */` al final del archivo. Sobreescribe todos los estilos visuales de Loox para alinearse con la paleta Jack Turner. |

**Qué cambia:**
- `border-radius: 0` en todos los elementos Loox
- Estrellas llenas → `#0d0d0d` negro
- Estrellas vacías → borde `#c9c4bc`
- Cards de review → fondo `#f4f2ef`, borde `#c9c4bc`
- Autores → uppercase, `#0d0d0d`
- Botones → planos negros, sin radio
- Badge "Verified" → flat, borde crema, uppercase
- Barras de progreso → flat negro

**Estrategia CSS:** selectores `[class*="loox"]` amplios + `!important` para ganarle a los estilos inyectados por Loox. Funciona tanto con Loox v1 como v2+.

**Bug conocido — Estrellas del badge siguen verdes:**
Las estrellas que aparecen dentro del badge/floating tab de Loox siguen saliendo en color verde. Causa probable: Loox inyecta esas estrellas con `style="color: ..."` o `fill="..."` inline directamente en el SVG, que no es sobreescribible con CSS class selectors. Solución pendiente: inspeccionar el HTML exacto del badge en producción e identificar si usa atributo `fill` inline o variable CSS propia de Loox para añadir el override específico.

---

### Sesión 2026-05-22 — PDP Hero, Home, Performance, Pop-up

#### `sections/snc-pdp-hero.liquid`
| Cambio | Detalle |
|--------|---------|
| Hero overlay | Gradiente endpoint `transparent` → `rgba(0,0,0,0.32)` |
| Trust badges | Layout vertical (icono arriba, texto abajo), sin fondo, grid 4 col. Labels configurables desde customizer. Color picker para fondo. |
| Scarcity statement | Italic eliminado → `text-transform: uppercase`, `letter-spacing: 0.08em`, `font-weight: 400`, `10px` |
| Dynamic Shipping Estimate | Renombrado. JS implementado desde cero (antes no existía). Calcula días hábiles reales. Nuevo setting `show_estimated_dates`. Labels en inglés. Fix: `country` sin `default: ""`. |
| Precios desktop | 20px → 22px |
| Descripción desktop | 14px → 15px |
| Acordeón body desktop | 14px → 15px. Subheadings 12px → 13px. |
| Título mobile | 28px → 30px |
| Precio mobile | 22px → 24px |
| Descripción mobile | 15px → 16px |
| BUY NOW / ADD TO CART | `button_padding_y` 14 → 17px (en `product.json` y `product.quantum-axis.json`) |

#### `sections/snc-reviews.liquid`
- Orden invertido: título primero, subtítulo debajo.

#### `sections/snc-image-content.liquid`
- Título (ej. "Legacy Born in Tradition"): 24px → 36px desktop / 20px → 28px mobile.

#### `sections/snc-custom-content-text.liquid` + `templates/index.json`
- Botón "Discover The Quantum Axis." → underline text link (patrón Hermès/Céline).
- CSS: `text-decoration: underline`, `text-underline-offset: 5px`, `text-decoration-thickness: 1px`. Hover: línea desaparece en 250ms.
- Nuevo schema setting `btn1_underline` checkbox.

#### `templates/product.quantum-axis.json`
- Template creado y asignado al producto Quantum Axis Tourbillon.

#### `sections/snc-flex-content-vertical.liquid` — Performance
| Problema | Fix |
|----------|-----|
| `filter: blur(10px)` animado | Eliminado. Solo `opacity` + `transform: scale` |
| `offsetHeight` en cada scroll tick | Cacheado. Solo recalcula en `resize`. |
| DOM writes síncronos | `requestAnimationFrame` + skip si activeIndex no cambió |
| Primera imagen `loading: lazy` | → `loading: eager` |
| Sin `will-change` | Añadido `will-change: opacity, transform` |

#### `sections/snc-legacy-club-popup.liquid` — Mejoras
| Cambio | Detalle |
|--------|---------|
| Auto-cierre tras suscripción | `setTimeout(closePopup, 2500)` tras submit exitoso |
| Comportamiento en editor | Antes: abría al cargar. Ahora: abre solo al seleccionar la sección (`shopify:section:select`), cierra al deseleccionar |

---

## 🚀 Próximos Pasos (Pendiente)

1. **Fix estrellas verdes del badge Loox** — inspeccionar en producción el HTML del badge e identificar el selector exacto para forzar `fill: #0d0d0d` en las estrellas inline.
2. **Verificar Welcome Flow en Klaviyo** — con el conteo de profiles activos bajo 250, el flow debería poder ponerse Live. Ir a Klaviyo → Flow → "Set Live".
3. **Audit restante** — pendiente revisar `snc-cart-page.liquid`: font fallbacks (`-apple-system`), `border-radius` (pills/tabs), font sizes bajo 14px en mobile.
4. **`header-group.json`** — tiene 3 instancias de `#2A4432` que no se tocaron (es auto-generado por Shopify admin, se sobrescribe solo).

---

## 🛡️ Seguridad — Archivos Prohibidos

- **CRÍTICO:** NO modificar `layout/theme.liquid` ni `config/settings_data.json` automáticamente, incluso con `-y` o `--dangerously-skip-permissions`.
- **PROTECCIÓN:** Antes de cambiar arquitectura core, hacer backup de snippet o commit.
- **RESTRICCIÓN:** Nunca eliminar snippets con prefijo `snc-` sin confirmación explícita uno a uno.

---

## 🔧 Notas Técnicas

### Pop-up (snc-legacy-club-popup.liquid)
- Usa Klaviyo **Client API** (`POST https://a.klaviyo.com/client/subscriptions/?company_id=X2CxYi`) — no pasa por Shopify, no tiene captcha.
- Cookie: `snc_legacy_club_dismiss`. Si `cookie_days = 0`, siempre muestra (para testing).
- Animación entrada: `translateY(+22px) scale(0.96)` → `translateY(0) scale(1)` con `cubic-bezier(0.22,1,0.36,1)`.
- Animación salida: `data-popup-closing="true"` → espera 360ms → aplica `hidden`.

### Footer Form (snc-footer.liquid)
- Form es HTML plano con `novalidate`. JS intercepta submit → Klaviyo Client API.
- Lista: `TWy4DM`. Source tag: `legacy-club`.

### Klaviyo Suppression Script
- Archivo: `klaviyo-cleanup.py` en la raíz del proyecto.
- Uso: `python3 klaviyo-cleanup.py --export` (solo backup) o `--cleanup` (export + suprimir).
- Endpoint correcto de supresión:
  ```
  POST /api/profile-suppression-bulk-create-jobs/
  body.data.attributes.profiles.data = [{type: "profile", attributes: {email: "..."}}]
  ```
