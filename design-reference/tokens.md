# LoanDrift design tokens

Source of truth: `app/globals.css`. Live examples: `/foundations`.

Brand changed from blue to **purple** on 2 November 2026, at the user's request, alongside a dashboard redesign inspired by two reference shots (a gradient hero with overlapping white cards, and a soft canvas with one filled accent card).

## Brand

| Token | Value | Paired with | Contrast | Use |
|---|---|---|---|---|
| `--primary` / `--brand` | `#7C3AED` | white text | 5.70:1 | Primary buttons, links, focus ring, selected state, chart series 1. **The only accent** |
| `--brand-subtle` | `#F3EEFF` | `#4C1D95` text | 9.64:1 | Active nav item, the dashboard's Needs attention card |
| `--brand-deep` | `#2E1065` | white | — | Deepest stop of the hero |
| `--hero-gradient` | `#1E0B3D` → `#3B0F80` → `#6D28D9` → `#C4B5FD` → canvas, plus a violet glow top right | white text on the upper half (13.4:1 on `#3B0F80`) | — | Dashboard hero only. Text sits on the dark upper part; cards overlap the pale lower part |
| `--canvas` | `#F6F5FA` | — | — | Page background behind cards (lavender-tinted grey) |

One primary button per area; everything else uses the outline, ghost or secondary style. On the hero, actions are white pills.

## Neutrals

| Token | Value | Contrast | Use |
|---|---|---|---|
| `--foreground` | `#14111F` | 18:1 | Body text |
| `--muted-foreground` | `#6B6880` | 5.36:1 on white, 4.94:1 on canvas | Descriptions, metadata |
| `--sidebar-foreground` | `#4A4659` | ≥ 7:1 on sidebar | Nav items |
| `--input` | `#8A8799` | 3.50:1 | Form control borders (WCAG 1.4.11 needs 3:1) |
| `--border` | `#E8E6EF` | — | Decorative dividers only |

## Status (text on its own subtle fill)

Status colour never carries meaning alone: every badge has a text label and an icon.

| Meaning | Text | Fill | Contrast |
|---|---|---|---|
| Success: active, completed, on track | `#0F766E` | `#F0FDFA` | 5.25:1 |
| Warning: unrecognised, needs checking | `#B45309` | `#FFFBEB` | 4.84:1 |
| Danger: arrears, rejected, failure | `#B91C1C` | `#FEF2F2` | 5.91:1 |
| Info: captured, disbursed, due today | `#1D4ED8` | `#EFF6FF` | 6.16:1 |
| Review: approved, awaiting next step | `#0E7490` | `#ECFEFF` | 5.15:1 (moved off purple so a status can't be mistaken for the brand) |

Chart series: purple `#7C3AED` and teal `#0D9488`, which pass the dataviz palette check (CVD ΔE 21.0, both at least 3:1 on white). Darker `#0F766E` stays the success text colour; it's too grey for a chart fill.

## Shape

Radius base 12px. Cards are `rounded-2xl` and dashboard panels `rounded-3xl`, with no shadows except the hero's glass card. Headline numbers dim their decimals (`Figure`). KPI values are sized by their card's width (container queries), not the window's.

## Type

Inter, with Geist Mono for record references.

| Role | Size |
|---|---|
| Page title (H1) | 20px, 24px from tablet up, 600 |
| Section heading | 16px, 600 |
| Body and table cell | 14px |
| Label and metadata | 12px, muted |
| KPI value | 24px, 600, tabular figures |
| Record reference | Mono 13px, 500 |

## Focus

A 2px `--ring` outline with a 2px offset on every focusable element. It's applied globally with `!important`, because shadcn's default 50% ring fails the 3:1 contrast requirement.
