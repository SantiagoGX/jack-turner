# Hero Section — Estado antes de ajuste visual (2026-05-22)

## Estructura de elementos (de arriba a abajo)

| Elemento | Contenido | Clase CSS | Estilo de tema | Scale (JSON) |
|----------|-----------|-----------|----------------|--------------|
| Gold ornament | Línea horizontal dorada decorativa | `::before` en `.snc-info-hero--title` | — | — |
| Subtitle | "Discernment Is Rare." | `.snc-info-hero--subtitle` + `.snc-info-hero--subtitle-inner` | `h1` | 120% desktop / 100% mobile |
| Title (h2) | "Not made for everyone. Limited mechanical timepieces for those who understand what a watch is meant to become." | `.snc-info-hero--title` + `.snc-info-hero--title-inner` | `h2` | 120% desktop / 100% mobile |
| Text | "*- Chosen by collectors in the U.S. and abroad -*" | `.snc-info-hero--text` + `.snc-info-hero--text-inner` | `body` | 100% desktop / 100% mobile |
| Button wrapper | "Explore" | `.snc-info-hero--button-wrapper` | button preset 1 | 100% |
| Award badge | "THE PERFECT GIFT AWARD 2026" | `.snc-info-hero--award-badge` `snc-award-badge-below_button` | — | — |

## CSS clave antes del ajuste

```css
/* Subtitle ("Discernment Is Rare.") */
.snc-info-hero--subtitle {
  margin: 0 0 6px 0;
  letter-spacing: 0.18em;
}
.snc-info-hero--subtitle-inner {
  font-size: calc(1em * var(--snc-info-hero-subtitle-scale-current) / 100);
  /* resultado aprox: h1 base × 120% ≈ 48px–54px desktop */
}

/* Title (body copy) */
.snc-info-hero--title {
  margin: 0;
  max-width: 800px;
}
.snc-info-hero--title-inner {
  font-size: calc(1em * var(--snc-info-hero-title-scale-current) / 100);
  /* resultado aprox: h2 base × 120% ≈ 30px–36px desktop */
}

/* Text (italic attribution) */
.snc-info-hero--text {
  margin: 12px 0 0 0;
  opacity: 0.82;
}
.snc-info-hero--text-inner {
  font-size: calc(1em * var(--snc-info-hero-text-scale-current) / 100);
  /* resultado aprox: body base × 100% ≈ 14px–16px */
}

/* Button wrapper */
.snc-info-hero--button-wrapper {
  margin-top: 28px;
  padding-top: 28px;
  border-top: 1px solid rgba(244, 242, 239, 0.15);
}

/* Text shadow (todos los inner) */
.snc-info-hero--title-inner,
.snc-info-hero--subtitle-inner,
.snc-info-hero--text-inner {
  text-shadow: 0 1px 24px rgba(0, 0, 0, 0.35);
}
```

## JSON settings del hero (templates/index.json — sección "main")

```json
{
  "subtitle": "Discernment Is Rare.",
  "subtitle_style": "h1",
  "subtitle_scale": 120,
  "subtitle_scale_mobile": 100,
  "title": "Not made for everyone. Limited mechanical timepieces for those who understand what a watch is meant to become.",
  "title_max_width": 800,
  "title_style": "h2",
  "title_scale": 120,
  "title_scale_mobile": 100,
  "text": "<p><em>- Chosen by collectors in the U.S. and abroad -</em></p>",
  "text_style": "body",
  "text_scale": 100,
  "text_scale_mobile": 100,
  "button_label": "Explore",
  "button_preset": "1",
  "show_award_badge": true,
  "award_badge_text": "THE PERFECT GIFT AWARD 2026",
  "award_badge_position": "below_button"
}
```

## Para restaurar

Revertir el bloque `/* ── Hero Hierarchy Adjustments 2026-05-22 ── */`
al final de la sección `<style>` en `sections/snc-info-hero.liquid`.
