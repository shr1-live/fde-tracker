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
- **Motion** (one scale, ease-out): `--dur-fast` 150 ms (hover, press, tooltips), `--dur` 200 ms (menus, popovers, toasts, page fade-in, like count), `--dur-slow` 250 ms (drawer, side panel fold). Easing `--ease: cubic-bezier(.2,.8,.2,1)`. Only `opacity` and `transform` animate, so nothing shifts layout. The one exception is the 700 ms heart burst after a double tap (a celebration, not a UI transition). Under `prefers-reduced-motion: reduce` every transition and animation is reduced to near zero, the heart burst and page fade are off, smooth scrolling becomes a jump, and skeletons stop shimmering.
- **Icons**: Lucide (`lucide-react`, pinned exact version, ISC licence), through `components/Icon.tsx` only (`<Icon name="heart" />`); pages never import the library directly. 2 px stroke (1.9 in the side panel), 16-22 px. Decorative (`aria-hidden`); the meaning is always in words or an `aria-label`.

## 3. App shell

Industry-standard layout (Linear / Vercel / Notion on desktop, Instagram-style tab bar on phones).

- **Side panel** (256 px, `--sidebar`, right border), top to bottom:
  1. **Brand row**: mark + "FDE Tracker" (links to the feed).
  2. **Program switcher**: the current program (from the URL, otherwise the last one opened, otherwise the first) with its tile and the person's role. It opens a popover listing their programs with role and a check on the current one; a search box appears from 6 programs; arrow keys move; the admin also gets "All programs". Links in it replace the popover's history entry.
  3. **Navigation** in groups: Feed (with a count of new posts by others since the person last looked, polled every 2 minutes) and Programs (admin); then a section labelled with the program name: Plan, Daily status, Program status, Reports, Manage and invite (coordinators and admin).
  4. **Account button** at the bottom (avatar, name, email). It opens a popover with name, email, Admin badge, the theme switch (System / Light / Dark) and Sign out. No loose controls in the panel.
  - **Active item**: `--accent-soft` filled pill, `--accent-soft-text` text, accent icon, a 3 px accent bar on the panel's left edge, `aria-current="page"`.
  - **Dev builds only**: a compact "Dev" row (Admin / Coord. / Member) above the account button; in the rail it moves into the account popover. Production builds render nothing.
- **Icon rail** (desktop and tablet, 72 px): the top-bar button folds the panel to icons; the choice is remembered (`fde:sidebar`). With no choice yet the panel is a rail under 1200 px wide and full above. In the rail, labels become tooltips on hover and keyboard focus (they stay in the page for screen readers); popovers open beside the rail; section labels become a thin divider.
- **Top bar** (56 px + top safe area, sticky, translucent `--topbar` with blur): the fold button (desktop) or the menu button (phones), a divider, and the breadcrumb ("FDE Training Program / Reports").
- **Phones (< 768 px)**:
  - **Bottom tab bar**: Feed, Plan, Status (daily status), Reports, More (opens the drawer). Icons in a 52 x 28 pill that fills with `--accent-soft` when active; 11 px labels; a red dot on Feed when there are new posts. It sits above the home indicator (`env(safe-area-inset-bottom)`), and the page and toasts leave room for it. With no program: Feed, Programs (admin), More.
  - **Drawer**: the side panel slides in over a scrim. Focus moves in; Esc, the scrim, the X, a link or **Android Back** closes it; focus returns to the button that opened it; the page behind is `inert` and does not scroll.
- **Back button rule** (`lib/layers.ts`): opening the drawer, a dialog, a post menu, the program switcher or the account menu adds a history entry for the same address, so Android Back (or the browser Back button) closes the top layer first instead of leaving the page. Closing a layer any other way removes that entry; an action that navigates or opens a dialog waits until it is gone.
- **Content width**: feed and single post 680 px; other pages up to 1120 px; text blocks never wider than ~72 characters. On a 1920 px screen the content stays centred at those widths.
- **Pages** fade in (200 ms, opacity and 4 px rise). Route changes move focus to the page's main region so screen readers announce the new page.

### Devices

- **iPhone / iPad Safari**: `viewport-fit=cover`; top bar, drawer, tab bar and page padding use `env(safe-area-inset-*)` for the notch and home indicator; heights use `100dvh` (with `100vh` fallback) so the Safari toolbar does not hide content; every input, select and textarea is 16 px on touch screens so Safari does not zoom on focus; `-webkit-tap-highlight-color: transparent` (every control has its own pressed state); hover effects on media and actions are wrapped in `@media (hover: hover)` so they never stick after a tap; media uses `touch-action: manipulation` so a double tap likes instead of zooming.
- **Android Chrome**: the Back button closes layers first (above); `theme-color` follows light/dark.
- **Touch**: 44 px targets (`pointer: coarse`); nothing is hover-only.
- **Checked sizes**: 360, 375, 390, 412, 768, 1024, 1366, 1920 px wide with no sideways scroll on every page, plus iPhone 13, Pixel 7 and iPad emulation.

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
| **Menu** | `Menu` component: icon button with `aria-haspopup="menu"`, items are `role="menuitem"`, arrow keys move, Esc or Android Back closes and returns focus. An item that copies runs inside the tap (`instant`, for Safari's clipboard); others run once the menu's history entry is gone. |
| **Popover** | `usePopover()` (program switcher, account menu): `.pop` panel, `--shadow-md`, 200 ms pop-in; a tap outside, Esc or Android Back closes it and returns focus. |
| **Tooltip** | Only in the icon rail: the item's own label shown beside it on hover and keyboard focus (inverted colours). Elsewhere use `title` for extra detail. |
| **Toast** | `useToast()`: bottom-right on desktop, bottom-centre on phones, `--shadow-md`. Success and info use `role="status"`; errors use `role="alert"` and stay 7 s. Use toasts for the result of an action (saved, deleted, copied). Keep validation messages inline next to the field. |
| **Dialog** | `useConfirm()` built on `<dialog>` (`showModal`): focus trapped, Esc or Android Back cancels, focus returns to the button that opened it. Title says the action; body says the consequence; destructive confirm button is `.btn.danger`. Never use `window.confirm`. |
| **Empty state** | `EmptyState`: icon, one-line title, one sentence of what to do next, and the action button when there is one. |
| **Loading** | `Skeleton` blocks in the shape and size of the real content (a post skeleton has the 16:9 media box, the action row and two lines), inside an `aria-busy` region with a screen-reader "Loading" label. No spinners on full pages. |
| **Form card** (owner's favourite) | The pattern for forms and panels, e.g. "New program": `.card`, bold title + muted one-line subtitle, labelled fields with "(optional)" hints, a full-width primary button with an icon. Keep it; reuse it for new forms. |
| **Error** | `ErrorState`: what failed in plain words plus "Try again". A 401 anywhere shows "Your session has expired" with "Sign in again". |

## 5. Feed (Instagram style)

Post anatomy, top to bottom:

1. **Header**: avatar, author name (600), meta line: relative time (`<time>`, full date on hover) and "· edited". Right: a "More" menu with Copy link, Open post, and (author) Edit, (author or admin) Delete.
2. **Media**, full width inside the card (edge to edge):
   - **YouTube**: 16:9 thumbnail; a tap plays it in place (youtube-nocookie), a double tap likes the post (the play waits 260 ms to tell them apart; keyboard Enter plays at once). Under it a slim row "YouTube · Open on YouTube".
   - **Other link**: a rich card: a cover tinted with the site's hue (the avatar formula, so contrast holds in both themes) showing the site tile and name, then the short address and an open icon. The whole card is one link (new tab).
   - **Text only**: the words are the media (17 px); a double tap / double click likes it.
3. **Action row**: icon buttons Like (heart, filled accent when liked, pops 1.28x on like), Comment, Copy link (paper plane). Each has an `aria-label` and a tooltip; `aria-pressed` on Like. 40 px (44 px touch).
4. **Likes line**: "3 likes" (600) with "· 2 comments"; the number slides in when it changes. With no likes: "Be the first to like this".
5. **Caption** (when there is media): author name in bold, then the text; long captions fold to 3 lines with "more".
6. **Comments**: the latest 2 under the post, "View all N comments" opens the whole thread in place (and "See all comments" links to the post page when the server sent only the latest ones). Compact lines: small avatar, **name** text, then time and Delete. Then a rounded "Add a comment" box with a text Send button inside it.

**Double tap to like**: double tap (touch) or double click (mouse) on the media likes the post (never unlikes) and shows a white heart burst over the video (accent heart on text posts). The Like button stays for everyone else. Reduced motion: no burst.

**Optimistic updates everywhere**: like, comment, delete comment, delete post and new post change the screen at once; the server's answer replaces the guess, and a failure puts things back and says why in a toast (a failed comment or post puts the text back in its box). A new post shows at the top marked "Posting" until it is saved. Updates use updater functions so quick actions in a row never overwrite each other.

**Loading more**: infinite scroll with an `IntersectionObserver` 800 px before the end, with a visible "Show more posts" button kept as the fallback and for keyboard users (pressing it moves focus to the first new post; scrolling never moves focus). After an error the automatic loading stops and the button says "Try again". The end says "You are all caught up".

**New posts pill**: every 60 s (and when the tab becomes visible again) the first page is fetched; like and comment counts update in place, and newer posts are *not* inserted. A "N new posts" pill with the authors' faces floats under the top bar (sticky, takes no space, so nothing shifts) and is announced politely; pressing it shows them and scrolls to the top.

**Side-panel badge**: the newest post time shown on the feed is stored as "seen" in this browser; the Feed item shows how many posts by others are newer (9+ at most).

Composer: avatar + auto-growing textarea with a character counter (appears once typing starts, amber in the last 200 characters, red at the limit), "Add a link" toggle, and the first `https://` URL in the text is picked up as the post's link when no separate link is given (shown as "Link found"). The toolbar has the search box (debounced), sort select (Newest / Most liked / Most discussed) and filter chips (All / Videos / Links / Text / My posts); on phones search and sort share one row and the chips scroll sideways in one row. Sort, filter and search live in the URL (`?sort=top&kind=video&q=rag`, `?mine=1`). A single post lives at `/post/:id` and shows all its comments.

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
- Gestures always have a visible alternative (double tap -> Like button; More tab -> menu button).
- Checked with axe-core (WCAG 2.0/2.1/2.2 A and AA rules) in light and dark on phones (iPhone, Pixel), iPad and desktop, with the drawer, rail, popovers and dialogs open: zero violations is the bar.
