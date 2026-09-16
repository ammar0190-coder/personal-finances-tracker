# M8 — Visual design pass

Design spec, 2026-09-16. Approved by Ammar in the brainstorming session of the same date.

## What this document is, and is not

**`docs/PRD.md` remains the behavioural source of truth.** This spec defines the visual system and
the interaction treatment layered over semantics the PRD already fixed. Where this document and
the PRD appear to disagree, the PRD wins and this document is wrong.

Neither the mockup canvas produced alongside this spec nor any screenshot is a source of truth.
They illustrate the system described here. A mockup showing a behaviour that contradicts the PRD
is a mockup error, not a specification change.

### The design record

The canvas artboards live in `design/m8/` and are committed with this spec, so the decisions are
reproducible from the repository rather than from an artifact link. `*.dc.html` and `canvas.json`
are the sources; the seeded `finance-tracker-m8.html` is a 2.5 MB build output — regenerated on
every edit, and gitignored.

**The canvas is a reference, not a design system the code must chase.** It is deliberately not
refined into a component library with exhaustive states, and it should not be. The artboards
establish principles, hierarchy and specific values; the implementation reproduces those against
real content, real data lengths and real responsive behaviour — which will differ from a fixed
390×844 frame. Where real content and the canvas disagree, real content wins and the canvas is
simply out of date. Do not spend M8 making the canvas more complete, and do not treat a pixel
difference as a defect.

## Why this milestone exists

The app is functionally complete for PRD §2–§13 but for the three gaps in §7 below, and it is
live. Ammar's assessment of the deployed UI was that it "looks quite sloppy… AI slop". The PRD
specifies only "Tailwind CSS + shadcn/ui" (§14) and gives no visual direction, so this milestone
had to begin with design decisions rather than code.

Design references given: **Kimi** and **Gemini** (calm, roomy, low-chrome, text-led) and
**TradingView** (dense, data-first, colour strictly carrying meaning). The synthesis adopted is
**calm shell, dense numbers** — whitespace between zones, density within them.

## 1. Design system

### 1.1 Typography

| Role | Face | Notes |
|---|---|---|
| Page titles, major section headings | **Instrument Serif** | Loaded via `next/font/google`, as Geist already is. Adds no npm dependency. |
| Body, labels, buttons, form controls | Geist Sans | Unchanged from today |
| Amounts, table figures | Geist Sans with `font-variant-numeric: tabular-nums` | Digits must align in columns |
| Charts, dense tables | Geist Sans | — |

**Serif is used sparingly and never inside dense transactional UI.** Transaction rows, tables,
form fields, chart labels and badges stay sans. The serif marks the top of a page or a major
section and nothing else. Over-applying it turns a finance app into a magazine, which is the
failure mode to avoid.

**Instrument Serif is the sole display serif.** Chosen against the real screens on 2026-09-16, not
from specimens. Fraunces and Newsreader were both considered and are both rejected — Fraunces
because it is among the faces that read as generated, Newsreader because it settles into a
conventional editorial voice and gives up the distinctiveness that justified a serif at all. Do
not reintroduce either, and do not add a second display face.

### 1.2 Colour

Dark-first. The light theme derives from the same scale rather than being designed separately.

| Token | Dark value | Role |
|---|---|---|
| background | `#0B0B0D` | Page ground, faintly cool |
| surface | `#161618` | Cards and raised regions, one step up |
| border | `#2A2A2E` | Hairline separators |
| foreground | near-white | Primary text |
| muted-foreground | `#A0A0A8` | Secondary text, labels |
| accent | `#8B85F5` | Periwinkle indigo: active nav, primary buttons, focus rings |

Values above are the starting point taken from the reference screenshot; they are tuned in the
canvas and expressed as `oklch()` tokens in `globals.css`, consistent with the existing token
file.

**Restraint is a requirement, not a preference.** No gradients, no glassmorphism, no glow, no
decorative shadows on cards. Surfaces are flat, separated by a one-step background change and a
hairline border. The design reads as considered because of type, spacing and alignment — not
because of effects.

### 1.3 Colour as meaning

Colour is reserved for exceptions. Ordinary amounts render in normal text, with a minus sign and
tabular alignment carrying direction.

| State | Treatment |
|---|---|
| Over-budget available-to-spend | Red. PRD §10.4 explicitly describes this as the over-budget render. |
| Credit-card amount owed | **No signal colour.** The amount renders in the ordinary neutral; an `owed` label in a warm neutral sits in the row's metadata line. PRD §10.1 requires the amount to be clearly distinguished — it does not require colour to do the distinguishing, and the label plus its position carry it. |
| Money owed to you vs by you | Distinguished by label and position, not by hue |
| Everything else | Neutral |

There are exactly **three** colour meanings — accent for interaction, red for an exceptional state,
neutral for ordinary information. A gold treatment for credit-card debt was drafted and rejected
on 2026-09-16: it introduced a fourth visual language for something the label already said. Adding
a fourth meaning later needs a deliberate decision, not a convenient one.

**Never carry meaning by hue alone.** Every coloured state pairs colour with a second signal — a
sign, an icon, a label, or a position. This covers colour-blind use and is why the active nav tab
uses an accent colour *and* an underline.

### 1.4 Chart reconciliation

Reports currently uses a validated 6-hue categorical order and a **sequential blue** trend line,
both established through the `dataviz` skill (see M6). The new indigo accent sits close enough to
that blue that on the Reports page the brand colour and a data series could read as the same
thing.

Resolution, settled on the canvas:

- **Spend by category is a single-hue ranked bar chart, not a categorical one.** It plots one
  measure — spend — so rank and length already carry the comparison; giving each category its own
  hue encodes identity that position states better, and competes with the accent. Bars are one
  neutral hue, and the accent marks only the bar currently drilled into. This dissolves the
  collision rather than negotiating it. It is a change to what M6 built.
- **The 12-month trend line is teal**, clearly separated from the indigo accent.

The rule behind both: **brand colour and data colour must never be confusable on the same screen.**

**Charts stay analytical, not decorative.** Reports is for reading numbers, not for looking at a
visualisation. No gradient fills, no glow, no animated reveals, no chart junk. If an embellishment
does not help someone read a figure faster, it does not go in. This constraint erodes quietly
during implementation, which is why it is written down.

## 2. App shell

A persistent shell wraps all authenticated routes. There is no shell today — navigation is three
underlined text links and a logout button in a bare header (`src/app/page.tsx`).

**Phone (primary target).** A bottom tab bar with four destinations: Dashboard, Investments, IOU,
Reports. Thumb-reachable, visible while scrolling. Active state is carried by accent colour **and**
an underline.

Settings lives in the header, not the tab bar. It is opened rarely and does not deserve equal
weight with the four modules.

**Expense Log is deliberately not a tab.** PRD §8 provides a quick-add shortcut precisely so
logging does not require navigating to a separate page. Logging is an action, not a destination.

**Desktop.** The same four destinations promote to a top or side nav. Content takes a max width
rather than stretching across the viewport.

## 3. Dashboard

### 3.1 Hierarchy

Fixed, following PRD §8's stated order:

| | Block | Kind | Masked |
|---|---|---|---|
| 1 | **Your Accounts** — per-account rows; credit-card amount owed visually distinct from bank balances (§10.1) | Position — never range-scoped | Yes, masked by default with per-account reveal |
| 2 | **This cycle / Selected period** — changes shape depending on whether the range is a real cycle | Cycle, or Range when the window is not a cycle | No |
| 3 | **IOUs** — net receivable and payable, written-off excluded | Position — never range-scoped | No |
| 4 | **Recent activity** | Feed — latest 15, not a window | No |

An earlier draft of this table marked blocks 3 and 4 range-scoped. Both were wrong, and the §3.3
audit is what caught them. The classifications above are the audited, approved ones — see
`2026-09-16-m8-dashboard-range-audit.md`, which is authoritative for this question.

The "range-scoped" column above records the *intent* for these four blocks. It is not a complete
inventory of period-dependent figures and must not be treated as one — see the audit required in
§3.3.

### 3.1.1 Accounts are a ledger, not a card

The account list carries **no surrounding card**: a hairline above, hairlines between rows, one
below, and figures at a larger size than the surrounding UI. It is the most important thing on the
screen and earns weight through typography and rules rather than a container.

The consequence is deliberate and load-bearing: **the cycle is the only card on the dashboard.**
That reads as the one computed, derived thing on a screen of recorded facts. A card-per-section
layout — accounts, cycle, IOU, recent, each boxed — was drafted and rejected on 2026-09-16 for
drifting into generic dashboard composition.

So: IOU and recent activity are also rule-separated rather than boxed. Before adding a new card to
the dashboard, the question to answer is what makes that block a computed result rather than a
record.

**Investments are deliberately absent** (PRD §6, §8). They live only in the Investments module.

There is no combined net-worth or total-across-accounts figure. PRD §8 specifies accounts
individually; a synthetic total would be a new financial concept the PRD does not define.

### 3.2 No permanent "available to spend" hero

Considered and rejected. Available-to-spend is conditional: per §10.4 it exists only for accounts
flagged `is_spend_account` and only once a transfer has started a budget cycle. A figure that can
structurally fail to exist cannot be the permanent face of the app. §10.4 also describes it going
negative and rendering red — the language of a diagnostic, not a headline.

The burn-down belongs on the dashboard, ranked second as §8 says, as a block that appears when a
cycle is live.

### 3.3 Date-range control

PRD §8 specifies a custom start/end picker after which "the whole view recalculates for that
window (spend by category, income, net savings, IOU activity within range)". Default on open is
the current period. When the range aligns to a real budget cycle it renders as a proper burn-down
against that ceiling; otherwise raw totals.

**Account balances are never range-scoped.** A balance is a position as of now, not a figure
computed for a past window. This is the single most important semantic rule in this document and
must be asserted by a test.

**This was a gate, not a step — and it has been cleared.** The audit ran on 2026-09-16 and was
approved: see `2026-09-16-m8-dashboard-range-audit.md`, which is authoritative for what the range
scopes. It found **five** kinds of figure rather than the three anticipated here (position, range,
cycle, today-relative, feed), and corrected two classifications in §3.1 that were wrong.

Its headline, which governs the implementation: **most of the Dashboard is not period data.** The
control scopes exactly one figure — spend-so-far, and only when the selected window is not the
current cycle. Read the audit's conceptual model before touching this.

This is the one area where an innocent-looking UI change can silently alter financial semantics,
which is why it gets a gate rather than care. The PRD's distinctions the audit must respect:

| Kind | Behaviour |
|---|---|
| Account balances | Never range-scoped — a position as of now |
| Spend, income, net savings, IOU activity | Range-scoped (§8) |
| Burn-down | Cycle-based when the selected range corresponds to a real budget cycle; raw totals otherwise (§8, §10.4) |
| Reports | Its own calendar-period semantics (§9) — not governed by the Dashboard control |

Known to need classification:

- `RecurringSection` "due now" is relative to **today**, not to a selected range. It almost
  certainly should not move with the picker — confirm rather than assume.
- Categories and the account list are not period-dependent.
- Anything reading `getCurrentBudgetCycle`, which carries a known single-`is_spend_account`
  assumption (see `docs/HANDOFF_NEXT_SESSION.md`). That limitation is **not** in scope to fix
  here; do not let the redesign silently change its behaviour either.

The control is built as a reusable component, since Reports (§9) needs the same vocabulary.

### 3.4 Quick-add

The inline "Log a transaction" form comes off the dashboard. It is replaced by a prominent
**Add Expense** action, with Income / Transfer / Investment behind a small adjacent menu. It opens
in a sheet on phone and a dialog on desktop.

A full transaction form occupying the middle of the dashboard is the opposite of §8's quick-add
shortcut, and it is the largest single contributor to the "forms dominate" problem.

Batch/lump-sum entry remains a first-class flow (PRD §1, CLAUDE.md). The sheet must not make
logging several lines together harder than it is today.

## 4. Account Settings

A new screen. None exists today, which is why two PRD §8 settings have never been reachable.

| Row | Behaviour |
|---|---|
| Privacy mode | Real toggle, writes `users.privacy_mode_enabled` (PRD §2, §8). Default remains `true`. |
| Theme | Dark / light toggle. Dark tokens already exist in `globals.css` and are currently unreachable. |
| Timezone | Per-user, already in the schema (PRD §10.11) |
| PIN | **Inactive surface only — see §5** |

### 4.1 Theme toggle implementation

No `next-themes` dependency. It is implemented by hand: a blocking inline script that sets the
theme class before first paint to avoid a flash, plus `localStorage` persistence. Roughly thirty
lines, and it avoids a dependency addition that would need separate approval per CLAUDE.md.

If a future need makes `next-themes` worth it, that is a separate ask.

## 5. PIN — architectural boundary

PRD §2 specifies a PIN for quick re-entry, and `users.pin_hash` exists in the schema. It has never
been built.

**M8 is a design and settings pass. It must not implement authentication or credential handling.**

The boundary, stated exactly:

> **M8 does not implement PIN authentication.** The Settings row is a visibly inactive "Not set
> up" surface only. M8 must not read, write, hash, validate, or otherwise interact with
> `pin_hash`. No PIN setup, unlock, or verification flow exists until the later security
> milestone.

Deliberately **not** done in M8: storing a PIN, comparing a PIN, hashing anything, adding a
hashing dependency, or building an unlock screen. Shipping a placeholder that insecurely stores or
checks a PIN in order to call M8 complete is explicitly prohibited.

**The test for this verifies the architectural boundary, not merely that today's UI happens not to
trigger it.** It asserts that no code path in the application reaches `pin_hash` — so that a later
change that wires the row up cannot pass silently.

The invariant is **no application or runtime code touching `pin_hash`**, not "the string may never
appear anywhere under `src/`". The field legitimately appears in places the test must ignore:

- `src/types/database.ts`, the generated schema type mirror — it already contains `pin_hash`
  today, so a naive whole-tree scan would fail on its first run;
- the migration that defines the column;
- documentation, specs and comments.

The assertion therefore scans application source — components, pages, route handlers, `src/lib/`
— excluding the generated types file, and treats a match as a failure. A test that is red before
any work begins gets deleted rather than obeyed, which would defeat the point.

Why the caution: a PIN compared on the client exposes its own hash, and a four-digit PIN is ten
thousand combinations, broken offline immediately. Doing it properly needs server-side
verification, a real hashing library, and rate limiting. That is its own milestone, routed through
the `security-review` skill.

## 6. Semantics that must not change

The redesign is visual. These behaviours are already implemented and verified by live integration
tests, and must survive it unchanged. Any diff that alters one is a defect regardless of how it
looks.

- Investments remain absent from the Dashboard (§6, §8).
- Credit-card balances remain visually and semantically distinct from bank balances (§10.1).
- Privacy masking remains on by default, with per-account reveal (§2).
- Over-budget remains the meaningful red state (§10.4).
- Transfers remain neither income nor spend (§10.6).
- Investment contributions remain outside spend (§10.7).
- IOU and reimbursement calculations remain exactly as implemented (§10.8), including
  `amount_settled` and `status` being recomputed rather than incremented.
- Balances, spend, available-to-spend and savings rate remain computed live from the transaction
  log — never stored, never cached (§10, CLAUDE.md).
- All displayed money continues to pass through `formatMoney` (`src/lib/ledger/format.ts`, D-13).

Any diff touching balance, spend or IOU figures runs the `ledger-check` skill before handover, per
CLAUDE.md.

## 7. PRD gaps closed by this milestone

`docs/MASTER_PLAN.md` currently claims every PRD MVP feature (§2–§13) is built. That claim is
false and is corrected as part of this work. Three §8/§2 items had schema support but no UI:

1. **Custom date-range picker** on the dashboard (§8 Controls) — built here, per §3.3.
2. **Privacy-mode configuration** (§2, §8 Settings) — built here, per §4.
3. **PIN quick-unlock** (§2, §8 Settings) — designed here, implementation deferred, per §5.

## 8. Reskin and recorded defects

All remaining screens move onto the new system: Investments, IOU, Reports, onboarding, and the
auth screens.

Defects recorded in `docs/MASTER_PLAN.md` M8 and `docs/HANDOFF_NEXT_SESSION.md` §5, cleared here:

- Raw stored values shown to the user: account type (`bank`) under account names, IOU status
  badges (`pending`). Both become labels through the existing `src/lib/select-options.ts`.
- `VEHICLE_LABELS` in `src/components/investments/holdings-list.tsx` duplicates
  `VEHICLE_TYPE_OPTIONS`; unify.
- Empty header gap in the IOU summary card.
- Disabled buttons that read as broken rather than as unavailable.
- Bare "Nothing logged yet" empty states, which get written properly.
- Onboarding is one card with a bare button and a raw form.

## 9. Testing

The existing Playwright walkthrough (`npm run test:e2e`, D-15) asserts behaviour rather than
styling, which makes it the safety net for a change this broad. **It stays green throughout.**

New tests:

| Test | Asserts |
|---|---|
| Date-range scoping | Changing the range alters period figures and leaves account balances untouched |
| Settings persistence | Privacy mode and theme survive a write and a reload |
| Theme | No flash of the wrong theme on load; toggle persists |
| PIN boundary | No application code path reads or writes `pin_hash` (§5). Implemented as a static assertion over `src/` — the identifier must not appear outside the migration that defines the column — so that wiring the row up later fails the test rather than passing silently. |
| Nav | Active tab state is correct on each route |

Per CLAUDE.md, implementation is test-first via `superpowers:test-driven-development`.

The integration suite is known to fail intermittently with `PGRST303: JWT issued at future`, a
WSL2 clock-step artefact confirmed 2026-09-16. It is unrelated to this work. A red integration run
showing only that error is not an M8 regression.

## 10. Sequencing

Three independently shippable stages. Stopping after any one leaves a coherent app rather than a
half-restyled one.

| Stage | Contents |
|---|---|
| **M8a** | Design system tokens, typography, app shell and navigation, dashboard hierarchy and quick-add |
| **M8b** | Remaining screens — Investments, IOU, Reports, onboarding, auth — plus the §8 defect list |
| **M8c** | Account Settings screen, theme toggle, and the date-range control |

M8c is last because it contains the two new PRD surfaces; the reskin does not depend on them.

## 11. Exit criteria

- A design reviewed and approved by Ammar in the canvas.
- Implemented screens match it at phone and desktop widths.
- Every item in §6 verifiably unchanged.
- `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm test`, `npm run test:db` and
  `npm run test:e2e` all green.
- `docs/MASTER_PLAN.md` no longer claims MVP completeness it does not have.
