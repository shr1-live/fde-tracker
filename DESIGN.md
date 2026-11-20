# FDE Tracker design system

The source of truth for how the web app looks and behaves. Tokens live once, at the top of `web/src/styles.css`; components and pages use only those tokens. Change the token, not the page.

## 1. Personality

Calm, professional, modern SaaS for an internal learning team. The quality bar is Linear (precision, quiet chrome, good dark mode), the LinkedIn feed (a familiar, readable post), and Notion (content first, generous reading width).

- **Quiet chrome, loud content.** Neutral surfaces, one accent (indigo), colour reserved for meaning (status, the primary action, the current place).
- **One primary action per screen.** Everything else is a secondary or ghost button.
- **Plain words.** Sentence case everywhere. Buttons say what happens ("Save status", "Invite", "Delete post"). No raw URLs shown where a name will do.
- **Always say what is going on.** Loading shows a skeleton of the real layout; empty states say what to do next; errors say what failed and offer a retry.

## 2. Tokens

### Colour

Neutrals are Tailwind zinc. The accent is indigo. Every text/background pair below meets WCAG 2.2 AA (4.5:1 for text, 3:1 for borders of controls and focus rings).

| Token | Light | Dark | Use |
|---|---|---|---|
| `--bg` | `#F7F7F8` | `#0B0B0E` | Page canvas |
| `--surface` | `#FFFFFF` | `#131317` | Cards, sidebar, inputs |
| `--surface-2` | `#F4F4F5` | `#1A1A20` | Subtle fills, table headers, hover |
| `--surface-3` | `#E9E9EC` | `#24242B` | Pressed, skeletons |
| `--border` | `#E4E4E7` | `#27272F` | Card and divider lines |
| `--border-strong` | `#A1A1AA` | `#52525B` | Input borders (3:1 against the surface) |
| `--text` | `#18181B` | `#EDEDEF` | Body and headings |
| `--text-2` | `#52525B` | `#A1A1AA` | Secondary text |
| `--text-3` | `#6B6B74` | `#8E8E98` | Meta (time, counts); only on `--surface`/`--bg` |
| `--accent` | `#4F46E5` | `#A5B4FC` | Links, active nav icon, focus ring |
| `--accent-bg` | `#4F46E5` | `#5B5BD6` | Primary button fill (white text, 6.3:1 / 5.4:1) |
| `--accent-bg-hover` | `#4338CA` | `#6E6EE0` | Primary button hover |
| `--accent-soft` | `#EEF2FF` | `rgba(99,102,241,.16)` | Selected chip, active nav, liked |
| `--accent-soft-text` | `#4338CA` | `#C7D2FE` | Text on `--accent-soft` |
| `--success` / `--success-soft` | `#047857` / `#ECFDF5` | `#6EE7B7` / `rgba(16,185,129,.14)` | Completed, saved |
| `--warning` / `--warning-soft` | `#B45309` / `#FFFBEB` | `#FCD34D` / `rgba(245,158,11,.14)` | Not filled in yet |
| `--danger` / `--danger-soft` | `#B91C1C` / `#FEF2F2` | `#FCA5A5` / `rgba(239,68,68,.14)` | Errors, delete |
| `--info` / `--info-soft` | `#0369A1` / `#F0F9FF` | `#7DD3FC` / `rgba(14,165,233,.14)` | In progress, role |

Dark mode follows the system (`prefers-color-scheme`) unless the person picks Light or Dark; the choice is stored as `data-theme` on `<html>` (set before first paint by `public/theme-init.js`). Both selectors carry the same values.

### Type

Font: **Inter** (Google Fonts, weights 400/500/600/700) with the system UI stack as fallback. `font-feature-settings: "cv11", "ss01"`; numbers in tables and counts use `tabular-nums`.

| Token | Size / line | Use |
|---|---|---|
| `--fs-xs` | 12 / 16 | Badges, overlines |
| `--fs-sm` | 13 / 20 | Meta, table cells, helper text |
| `--fs-md` | 14 / 20 | Controls, nav, buttons |
| `--fs-base` | 15 / 24 | Body and post text |
| `--fs-lg` | 17 / 26 | Card titles |
| `--fs-xl` | 20 / 28 | Section titles (h2) |
| `--fs-2xl` | 26 / 32 | Page titles (h1), tracking -0.02em |
| `--fs-3xl` | 40 / 44 | Landing hero only, tracking -0.03em |

Weights: 400 body, 500 controls and labels, 600 titles and names. Never bold paragraphs.

### Spacing, radius, elevation, motion

- **Spacing** (4 px base): `--s-1` 4, `--s-2` 8, `--s-3` 12, `--s-4` 16, `--s-5` 20, `--s-6` 24, `--s-8` 32, `--s-10` 40, `--s-12` 48.
- **Radius**: `--r-sm` 6 (inputs, buttons), `--r-md` 10 (cards, menus), `--r-lg` 14 (dialogs, landing card), `--r-full` (chips, avatars).
- **Elevation**: `--shadow-xs` resting cards; `--shadow-sm` raised (active nav item, hovered card); `--shadow-md` menus, toasts; `--shadow-lg` dialogs. In dark mode shadows are deeper and every raised surface also has a 1 px border, because shadows barely show on dark backgrounds.
- **Motion**: `--dur-fast` 120 ms (hover, press), `--dur` 180 ms (menus, toasts), `--dur-slow` 260 ms (drawer). Easing `--ease: cubic-bezier(.2,.8,.2,1)`. Under `prefers-reduced-motion: reduce` every transition and animation is reduced to near zero and skeletons stop shimmering.

## 3. App shell

- **Sidebar** (256 px, `--surface`, right border): brand, **program switcher**, main navigation, and the account block at the bottom (avatar, name, email, theme switch, Sign out).
  - The program switcher shows the current program (from the URL, otherwise the last one opened, otherwise the first) and the person's role in it. With more than one program it opens a list of programs. The navigation below it shows that program's pages: Plan, Daily status, Program status, Reports, and Manage and invite (coordinators and admin only).
  - Feed is always first. The admin also gets Programs.
  - Active item: `--accent-soft` fill, `--accent-soft-text` text, `aria-current="page"`.
- **Top bar** (56 px, sticky, translucent `--bg` with blur): a menu button (phones only) and a breadcrumb ("FDE Training Program / Reports").
- **Phones (< 900 px)**: the sidebar becomes a drawer that slides in over a scrim. Opening it moves focus into it; Esc, the scrim, the close button or picking a page closes it and returns focus to the menu button; the page behind is `inert` while it is open. No sideways scroll at 320 px and up.
- **Content width**: feed and single post 680 px; other pages up to 1120 px; text blocks never wider than ~72 characters.
- Route changes move focus to the page's main region so screen readers announce the new page.

## 4. Components

| Component | Rules |
|---|---|
| **Button** | `.btn` primary (accent fill), `.btn.secondary` (surface + border), `.btn.ghost` (no border), `.btn.danger`. Heights 36 px (`.sm` 30 px); 44 px on touch screens (`pointer: coarse`). Icon left, 16 px. Disabled at 50 % opacity, never the only cue. Busy state changes the label ("Saving"). |
| **Icon button** | `.iconbtn`, 36 px square (44 px on touch), always has `aria-label`. |
| **Input / select / textarea** | 36 px high, `--r-sm`, `--border-strong` border, `--surface` fill; focus: accent border plus 3 px `--ring`. Errors: `--danger` border, message below linked with `aria-describedby`, `aria-invalid`. Labels always visible above the control (sr-only only where the context is obvious, e.g. the comment box). |
| **Card** | `--surface`, 1 px `--border`, `--r-md`, `--shadow-xs`, 20-24 px padding. A card has a title when it holds more than one thing. |
| **Chip / badge** | `Chip` with tone ok / warn / bad / info / none. Pill, 12 px, 600 weight, a dot before the word. Words carry the meaning; colour backs it up. Filter chips (`.fchip`) are toggle buttons with `aria-pressed`. |
| **Tabs** | Segmented control (`.seg`) for switching views on one page (`aria-pressed`). Program page tabs (`.ptabs`) are links with an underline, shown on phones where the sidebar is hidden. |
| **Table** | `.table` inside `.table-wrap` (scrolls sideways inside itself, focusable, labelled region). Sticky header row on `--surface-2`, 13 px cells, row hover, first column sticky in wide sheet reports. |
| **Avatar** | Initials on a tinted circle; hue from the name, fixed lightness so contrast holds in both themes. 36 px in posts, 28 px in comments. Decorative (`aria-hidden`); the name is next to it. |
| **Menu** | `Menu` component: icon button with `aria-haspopup="menu"`, items are `role="menuitem"`, arrow keys move, Esc closes and returns focus. |
| **Toast** | `useToast()`: bottom-right on desktop, bottom-centre on phones, `--shadow-md`. Success and info use `role="status"`; errors use `role="alert"` and stay 7 s. Use toasts for the result of an action (saved, deleted, copied). Keep validation messages inline next to the field. |
| **Dialog** | `useConfirm()` built on `<dialog>` (`showModal`): focus trapped, Esc cancels, focus returns to the button that opened it. Title says the action; body says the consequence; destructive confirm button is `.btn.danger`. Never use `window.confirm`. |
| **Empty state** | `EmptyState`: icon, one-line title, one sentence of what to do next, and the action button when there is one. |
| **Loading** | `Skeleton` blocks in the shape of the real content (posts, day cards, table rows), inside an `aria-busy` region with a screen-reader "Loading" label. No spinners on full pages. |
| **Error** | `ErrorState`: what failed in plain words plus "Try again". A 401 anywhere shows "Your session has expired" with "Sign in again". |

## 5. Feed post anatomy

1. **Header**: avatar, author name (600), meta line: relative time (`<time>` with the full date and time on hover via `title`) and "· edited" when `edited_at` is set. Right side: a "More" menu with Copy link, Open post, and (author) Edit, (author or admin) Delete.
2. **Body**: 15 px text, line breaks kept, `https://` URLs turned into links (opened in a new tab with `rel="noopener noreferrer"`, shown as host + path, full URL on hover).
3. **Attachment** (when the post has a link):
   - **YouTube**: 16:9 thumbnail with a play button that plays the video in place (youtube-nocookie), and a footer row "YouTube · Open on YouTube".
   - **Other link**: a preview card (site initial tile, site name, short URL, external-link icon). The whole card is one link that opens the page in a new tab.
4. **Stats row**: "3 likes · 2 comments" (13 px, `--text-3`); the comment count toggles the comments.
5. **Action bar**: Like (`aria-pressed`, accent when on), Comment, Copy link. Equal-width ghost buttons, 40 px high.
6. **Comments**: oldest first, avatar 28 px, bubble on `--surface-2`, then the comment box.

Composer: avatar + auto-growing textarea with a character counter (appears once typing starts, amber in the last 200 characters, red at the limit), "Add a link" toggle, and the first `https://` URL in the text is picked up as the post's link when no separate link is given (shown as "Link found" under the box). The toolbar above the list has the search box (debounced), sort select (Newest / Most liked / Most discussed) and filter chips (All / Videos / Links / Text / My posts). Sort, filter and search live in the URL (`?sort=top&kind=video&q=rag`, `?mine=1`) so a view survives reload and can be shared. A single post lives at `/post/:id`.

## 6. Page layouts

- **Page header**: overline (program name + role chip), h1, one-line intro in `--text-2`, then the primary action on the right on desktop (below on phones).
- **Feed**: composer, toolbar, posts (16 px gap), "Show more".
- **Plan**: progress bar card (days completed), then weeks. Each week: title + chip; day cards with a check, "Week 1 · Day 2" overline, topic, status chip, and an expandable body (topics, practical task, resources, my status form).
- **Daily status**: two columns on desktop (form card 2/3, history 1/3), stacked on phones.
- **Program status / Reports**: toolbar card (date range, person, download), then the table.
- **Manage**: stacked cards (Details, People, Daily form, Program form), each with its own save.
- **Programs (admin)**: program cards grid plus the "New program" form.
- **Landing / Gate / 404 / session expired**: centred card on the canvas with a soft accent glow.

## 7. Accessibility rules (WCAG 2.2 AA)

- Contrast: 4.5:1 text, 3:1 large text, control borders and focus rings, in both themes.
- Focus: every interactive element shows a 2 px accent outline with 2 px offset (`:focus-visible`); never removed.
- Targets: 24 px minimum everywhere; 44 px on touch (`@media (pointer: coarse)`).
- Every control has a visible label or an `aria-label`; icon-only buttons always have one. Icons are `aria-hidden`.
- State never by colour alone: chips have words, the like button uses `aria-pressed`, invalid fields have text messages.
- Landmarks: one `main`, the sidebar `nav` labelled "Main", page `h1` per page, logical heading order.
- Live regions: toasts as above; the feed list is `aria-busy` while loading.
- Reduced motion respected; no auto-playing media (YouTube plays only after a press).
- Unsaved forms (daily status, day status, manage forms) warn before leaving the page or closing the tab.
- Checked with axe-core (WCAG 2.0/2.1/2.2 A and AA rules) in light, dark and at 390 px: zero violations is the bar.
