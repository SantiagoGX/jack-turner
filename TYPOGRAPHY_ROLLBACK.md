# Typography Rollback Reference
**Created:** 2026-05-21  
**Purpose:** Backup of original font-size values before the typography coherence plan. Use this to revert any section if needed.

---

## Changes Already Applied (2026-05-21)

### `sections/snc-image-content.liquid`
| Selector | Property | Original | New |
|---|---|---|---|
| `.snc-hl__title` | font-size (desktop) | `40px` | `24px` |
| `.snc-hl__title` (mobile ≤768px) | font-size | `32px` | `20px` |
| `.snc-hl__item-title` | font-size (desktop) | `24px` | `18px` |
| `.snc-hl__item-title` (mobile ≤768px) | font-size | `18px` | `15px` |
| `.snc-hl__item-text` | font-size | `16px` | `14px` |
| `.snc-hl__item-image img` | border-radius | `10px` | `0` |

### `sections/snc-reviews.liquid`
| Selector | Property | Original | New |
|---|---|---|---|
| `.snc-reviews--title` | font-size (desktop) | `40px` | `28px` |
| `.snc-reviews--title` (mobile ≤768px) | font-size | `32px` | `22px` |
| `.snc-reviews--modal-title` | font-size | `24px` | `20px` |
| `.snc-reviews--modal-body` | font-size | `16px` | `14px` |

---

### `sections/snc-flex-content-vertical.liquid` (applied 2026-05-21)
| Selector | Property | Original | New |
|---|---|---|---|
| `.snc-scroll--title` (desktop) | font-size | `48px` | `40px` |
| `.snc-scroll--title` (mobile ≤768px) | font-size | `32px` | `28px` |

### `sections/snc-flex-content-end.liquid` (applied 2026-05-21)
| Selector | Property | Original | New |
|---|---|---|---|
| `.snc-hs--title` | font-size | `48px` | `40px` |
| `.snc-hs--text` | font-size | `18px` | `16px` |

### `sections/snc-our-story.liquid` (applied 2026-05-21)
| Selector | Property | Original | New |
|---|---|---|---|
| `.snc-our-story--subtitle` | font-size | `17px` | `14px` |
| `.snc-our-story--text` | font-size | `16px` | `14px` |

### `sections/snc-article.liquid` (applied 2026-05-21)
| Selector | Property | Original | New |
|---|---|---|---|
| `.snc-article__title` | font-size | `clamp(32px, 4.2vw, 48px)` | `clamp(28px, 4.2vw, 40px)` |

### `sections/snc-policies-page.liquid` (applied 2026-05-21)
| Selector | Property | Original | New |
|---|---|---|---|
| `.snc-policy__title` | font-size | `clamp(28px, 4vw, 44px)` | `clamp(24px, 4vw, 40px)` |
| `.snc-policy__content` | font-size | `16px` | `14px` |

### `sections/snc-header.liquid` (applied 2026-05-21)
| Selector | Property | Original | New |
|---|---|---|---|
| `.custom-header--announcement` | font-size | `14.42px` | `14px` |
| `.custom-header--nav-link` | font-size | `15.42px` | `15px` |

## Pending Changes (not yet applied)

### `sections/snc-header.liquid`
| Selector | Property | Original | Proposed |
|---|---|---|---|
| Announcement bar | font-size | `14.42px` | `14px` |
| Desktop nav link | font-size | `15.42px` | `15px` |

### `sections/snc-footer.liquid`
| Element | Property | Original | Proposed |
|---|---|---|---|
| Various elements | font-family | `var(--font-heading-family)` / `var(--font-body-family)` | `var(--font-main)` |

---

## Reference Scale (snc-pdp-hero — client-approved, DO NOT CHANGE)
| Role | Size |
|---|---|
| Product title (live setting) | `32px` |
| Price / USP title | `20px` |
| Body / labels | `14px` |
| Small body / badges | `13px` |
| Captions | `12px` |
| Micro labels (accordion buttons) | `11px` |
| Hints / close buttons | `10px` |

---

## How to Revert

For any selector above, restore the "Original" value using Edit tool on the corresponding file.  
All changes are CSS-only — no logic, layout, or schema was modified.
