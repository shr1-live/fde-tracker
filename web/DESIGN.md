---
name: FDE Learning Tracker
description: A calm, documentation-grade learning portal for engineers. Paper-warm canvas, ink text, one blue action colour, one yellow marker for progress.
version: 2.0
colors:
  canvas: "#F7F6F2"
  surface: "#FFFFFF"
  surface-sunken: "#EFEDE7"
  ink: "#15191F"
  ink-muted: "#5B6470"
  line: "#DAD7CE"
  action: "#2457C5"
  action-ink: "#FFFFFF"
  action-soft: "#E6EDFB"
  marker: "#F2C94C"
  success: "#2E7D57"
  warning: "#9A5B00"
  danger: "#B3261E"
  night-canvas: "#0E1217"
  night-surface: "#171D25"
  night-ink: "#E8ECF1"
  night-muted: "#9AA6B4"
  night-line: "#2A3441"
  night-action: "#8DB0F5"
typography:
  display: { family: "Bricolage Grotesque", weight: 700, size: "clamp(32px, 4.5vw, 52px)", lineHeight: 1.1, tracking: "-0.015em" }
  h1: { family: "Bricolage Grotesque", weight: 700, size: "clamp(28px, 3.4vw, 38px)", lineHeight: 1.15 }
  h2: { family: "Bricolage Grotesque", weight: 600, size: "24px", lineHeight: 1.25 }
  h3: { family: "Bricolage Grotesque", weight: 600, size: "18px", lineHeight: 1.3 }
  body: { family: "Hanken Grotesk", weight: 400, size: "16px", lineHeight: 1.65 }
  small: { family: "Hanken Grotesk", weight: 400, size: "14px", lineHeight: 1.5 }
  label: { family: "Hanken Grotesk", weight: 600, size: "13px", lineHeight: 1.2, tracking: "0.04em", transform: "uppercase" }
  mono: { family: "ui-monospace, SFMono-Regular, Menlo, monospace", weight: 400, size: "13px" }
spacing: { unit: 4, scale: [4, 8, 12, 16, 24, 32, 48, 72, 112] }
radii: { sm: 6, md: 10, lg: 16, pill: 999 }
elevation:
  rest: "0 1px 2px rgba(21,25,31,.06)"
  raised: "0 2px 4px rgba(21,25,31,.06), 0 10px 24px rgba(21,25,31,.08)"
layout: { contentMax: 1120, readingMax: 68ch, sidebar: 264, gutter: 24 }
---

# Design system: FDE Learning Tracker

## Overview

This is a place people come to *learn on purpose*. It should feel like good documentation crossed with a quiet notebook: warm paper, dark ink, generous space, one clear action colour. The interface never competes with the material. Anything that moves or glows must carry meaning (progress, a state change), never decoration.

Reference mood: Stripe Docs and Linear for restraint and clarity; a printed workbook for warmth. Not a dashboard of gradients. Not a SaaS landing-page template.

Three ideas hold everything together:

1. **Layers.** The product is about building skills layer by layer. The yellow *marker* stripe (the logo mark) is the only recurring decoration. It appears as the progress fill, the active-item tick and the highlight under key words.
2. **Reading first.** Long text sits in a 68-character column. Cards separate *kinds* of thing (a resource, a task, a review), not just chunks of space.
3. **Honest states.** Pending, approved, changes requested, completed and locked each look different, always with text as well as colour.

## Colors

| Token | Use |
|---|---|
| `canvas` | Page background. Warm off-white so long reading is easy on the eyes. |
| `surface` | Cards, inputs, tables. |
| `surface-sunken` | Wells, code blocks, inactive tabs. |
| `ink` / `ink-muted` | Text. Muted is for secondary text only; never below 4.5:1 contrast. |
| `line` | 1px borders and dividers. |
| `action` / `action-soft` | Links, primary buttons, focus ring, selected states. The only saturated colour in the UI. |
| `marker` | Progress fills and the active tick. Never used for text. |
| `success` `warning` `danger` | Review and form states. Always paired with an icon or word. |

Dark mode uses the `night-*` set. It is a first-class theme, not an inversion: keep the same hierarchy, lower the surface contrast, lift the action colour.

Rules: one action colour per screen; `marker` is never used on a button; no gradients except the subtle progress fill; status colour alone never carries meaning.

## Typography

Headings use **Bricolage Grotesque** (distinct, humane); everything else uses **Hanken Grotesk**. Both are free (Google Fonts). Use the scale above and nothing in between.

- Body 16px minimum; reading columns max `68ch`.
- Headings use `text-wrap: balance`. Never centre body text.
- `label` style is for eyebrows and table headers only.
- Numbers in tables and progress use tabular figures.

## Layout

- App shell: 264px sidebar, content max 1120px, 24px gutters. Sidebar collapses via the hamburger; on phones it is a drawer.
- 4px spacing unit; sections separated by 48px, cards padded 24px, form rows 16px apart.
- Primary reading pages use a single 68ch column with an optional right rail (progress, table of contents).
- Breakpoints: 640 (single column), 900 (drawer sidebar), 1200 (two-column feeds).

## Elevation and shape

Mostly flat. Cards use `rest` shadow plus a 1px `line`; `raised` is for menus and dialogs only. Radii: `sm` inputs and chips, `md` cards and buttons, `lg` hero panels, `pill` tags.

## Components

- **Button.** Primary: `action` fill, white text, `md` radius, 44px tall. Secondary: `surface` with `line` border. Destructive: `danger` text on secondary. Focus: 2px `action` ring with 2px offset. Disabled: 50% opacity plus `not-allowed`.
- **Card.** `surface`, 1px `line`, `md` radius, 24px padding. Interactive cards lift 2px on hover and show the action border.
- **Resource row.** Kind tag, title link, source line, then a *Mark done* toggle. Done rows get a check, a muted title and a strike-through only on the title.
- **Progress.** A 8px pill track in `line` with a `marker` fill. Always shows the number beside it ("3 of 7").
- **Tabs.** Underline style on desktop (2px `action` underline for the active tab); horizontal scroll on phones.
- **Status tag.** Pill with icon + word: Draft, In review, Approved, Changes requested, Rejected.
- **Feed item.** Topic label, title, 2-line summary, author, date, stack chip. Approved items only.
- **Review panel.** Content preview left, decision form right (Approve, Request changes, Reject, comment required for the last two).
- **Empty state.** One sentence saying what belongs here and one button to add it. No illustrations needed.
- **Toast.** Bottom centre, 4s, `role="status"`. Never the only confirmation of a destructive action.

## Motion

150–250ms ease-out for hover, focus and expanding panels. Progress fills animate once on load. Everything respects `prefers-reduced-motion` (no animation at all).

## Accessibility

WCAG 2.2 AA minimum. Visible focus on everything; 44px touch targets; one `h1` per page; landmarks (`header`, `nav`, `main`); forms have labels and inline error text; tab and dialog patterns follow WAI-ARIA; colour is never the only signal.

## Do and don't

**Do** keep one action colour per view; show counts next to bars; write short, plain labels; give every list an empty state; keep the sidebar to 8 items or fewer.

**Don't** add animated backgrounds, parallax, confetti or glow effects; use more than two font families; hide actions behind icons without labels; mix card radii; use the marker colour for text.

## Page patterns

- **Landing.** Left: display heading, one sentence, one primary button. Right: a static "layers" diagram. Below: three short feature rows and the sign-in form. No carousels.
- **Home (signed in).** Greeting, current program progress, "continue where you left off", latest approved feed items for your stack.
- **Feed.** Topic filter chips on top, stack toggle (General | your stack), cards in a single column of 68ch (two columns above 1200px).
- **Program.** Ordered steps with progress per step; tabs for Learn, Build, Practice, Notes only when the step has that content.
- **Review queue.** Table of submissions with status, author, topic, age; open one to review.
- **Admin.** People, roles, access requests, programs.

## Reference and product KPIs (added 2026-11-16)

**Reference site: Khan Academy.** This is a free, internal learning tool whose core job is mastery and visible progress, not selling or lead generation. Khan Academy is the closest match: free and non-commercial, progress and mastery shown everywhere, a calm and trustworthy look, and one clear "continue" action. Subscription and conversion references (Duolingo streak pressure, Udemy urgency badges, Coursera certificates and pricing) fit a public marketplace and are not used. We borrow structure and UX patterns only, never text, logos or assets.

**Principles taken from the EdTech brief, adapted to this tool**
- Value in five seconds: the dashboard opens with progress and the next step, with one primary action.
- Progress is always visible: progress bars on every programme, week and day; "next up" is one click away.
- One primary action per screen; proof near the action (what is done, what is left).
- WCAG 2.2 AA, keyboard navigation, good contrast, mobile first, dark mode; tokens defined once and reused.
- Honest status only: never imply something is live, merged or finished when it is not.
- Icons are inline SVG and decorative: the meaning is always in words next to them.

**KPIs this tool should show (the dashboard and report are built around them)**
| KPI | Where it shows |
|---|---|
| Programme completion | Dashboard progress bar; Week 1 report "Criteria met" |
| Activation (first task done) | Dashboard "next up" |
| Week and day completion | Plan, Week 1 tasks, Week 1 report |
| Assistant usage and model quality (pass rate, speed, tokens, failures) | Assistant page, Week 1 report |
| Return visits (streak or last seen) | Optional, later |

**Not applicable to this internal free tool:** pricing and payments, SEO and public marketing pages, referral and coupon programmes, certificates.

**Phased redesign plan:** UI1 tokens, fonts, icon set and app shell; UI2 dashboard as a KPI view; UI3 remaining pages; UI4 accessibility, performance and dark-mode pass.

