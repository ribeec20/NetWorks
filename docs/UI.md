# NetWorks — UI Specification v1.0

---

## Screens Overview

| # | Screen | Type | Notes |
|---|--------|------|-------|
| 1 | Main Graph Dashboard | Full page | Primary view, always the landing page |
| 2 | Contact Drawer | Side drawer (right) | View, add, and edit contacts in one panel with mode toggle |
| 3 | Log Interaction | Drawer content swap | Replaces drawer content, back button to return to contact detail |
| 4 | Auth / Sign-In | Full page | Firebase Auth (Google + email), shown on upgrade from Tier 1 |
| 5 | Settings & Account | Full page | User profile, tier info, upgrade prompts |
| 6 | Payment / Upgrade | Full page | Stripe checkout (deferred — design later) |

---

## Screen 1: Main Graph Dashboard

The primary and default view. The interactive network graph fills the viewport with a top bar, an optional left-side results panel, and a floating action button.

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  Top Bar                                                 │
│  [Logo]  [Search...]  [Filter: Tags ▼]  [Strength ▼]  [👤] │
├────────────┬─────────────────────────────────────────────┤
│            │                                             │
│  Results   │                                             │
│  Panel     │         Network Graph                       │
│  (left,    │         (full canvas, WebGL)                │
│  shown     │                                             │
│  only when │         "You" node at center                │
│  filtering │                                             │
│  or        │         Contacts as nodes                   │
│  searching)│         Edges show relationships            │
│            │                                             │
│            │                                             │
│            │                                    [+ FAB]  │
├────────────┴─────────────────────────────────────────────┤
│  Tier 1 upgrade banner (persistent, dismissible per      │
│  session, shown only for no-account users)               │
└──────────────────────────────────────────────────────────┘
```

### Top Bar

- **Logo**: Left-aligned. App name/icon. Clicking returns to default graph view (clears filters/search).
- **Search box**: Center-left. Text input with placeholder "Search connections...". As the user types:
  - The graph filters to only show matching nodes and their edges.
  - The left Results Panel slides in with a list of matching contacts.
  - Clearing the search restores the full graph and hides the panel.
- **Tag filter dropdown**: Dropdown/multi-select for filtering by tags. Applying a filter:
  - Filters the graph to only matching nodes.
  - Opens the left Results Panel with the filtered list.
- **Strength filter dropdown**: Slider or range selector (e.g., "50–100") to filter by relationship strength. Same behavior — filters graph, shows Results Panel.
- **Account icon**: Right-aligned. For Tier 1 (no account): shows "Sign In" label. For signed-in users: shows avatar/initial. Clicking navigates to the Settings & Account page.

### Results Panel (Left Side)

- Hidden by default. Appears when search text is entered or any filter is active.
- Displays a scrollable list of contacts matching the current search/filter criteria.
- Each list item shows:
  - Contact name
  - Role / company (one line, truncated)
  - Strength score indicator (small colored dot or bar)
- Clicking a list item:
  - Highlights/zooms to that node on the graph.
  - Opens the Contact Drawer on the right.
- A header shows the result count (e.g., "12 connections") and a "Clear" button to reset all filters.
- Panel width: ~280px, does not overlap the graph — the graph canvas resizes.

### Network Graph Canvas

- Fills the remaining viewport space.
- Force-directed layout (ForceAtlas2) via Sigma.js + Graphology.
- **"You" node**: Fixed center position, largest node, distinct purple color.
- **Contact nodes**:
  - Size scaled by relationship strength (min 8px radius, max 28px).
  - Color determined by primary tag. Untagged contacts use a neutral gray.
  - Label shows first name by default; full name on zoom.
- **Edges**:
  - Solid lines for direct connections.
  - Dashed lines for indirect/referral connections.
  - Thickness: 1px (weak, <30) → 3px (growing, 30–59) → 5px (strong, 60+).
  - Color: gray (<30) → amber (30–59) → teal (60+).
- **Interactions**:
  - Hover node → tooltip: full name, role, strength score.
  - Click node → opens Contact Drawer (right side).
  - Drag node → reposition temporarily.
  - Scroll → zoom. Click-drag background → pan.
- **Mutual connection edges**: Thinner (1px), neutral light-gray, no strength coloring.

### Floating Action Button (FAB)

- Position: bottom-right corner of the graph canvas, above the upgrade banner if present.
- Appearance: circular button with "+" icon, prominent accent color.
- Click → opens the Contact Drawer in **Add mode**.

### Onboarding (First Visit — Guided Tooltips)

Shown once on first visit when the graph is empty. A sequential tooltip tour:

1. **Tooltip on FAB**: "Start by adding your first connection" — arrow pointing to the FAB.
2. **Tooltip on search bar** (after first contact is added): "Search and filter your network here."
3. **Tooltip on a node** (after first contact is added): "Click any connection to see details, log interactions, and more."
4. **Tooltip on filters** (after 3+ contacts): "Filter by tags or relationship strength to focus your view."

Each tooltip has a "Got it" dismiss button and a "Skip tour" link. Tour state is stored locally so it only shows once.

### Tier 1 Upgrade Banner

- Thin bar at the bottom of the viewport.
- Text: "Your data is stored locally in this browser. Sign in to sync across devices and back up your network."
- [Sign In] button on the right side of the banner.
- Dismissible per session (X button), but reappears next session.
- Not shown for signed-in users (Tier 2/3).

---

## Screen 2: Contact Drawer (Right Side)

A single drawer panel on the right side of the screen used for viewing, adding, and editing contacts. The drawer has three modes that share the same panel: **View**, **Add**, and **Edit**.

### Drawer Behavior

- Width: ~400px on desktop, full-screen on mobile.
- Slides in from the right. Graph canvas resizes to accommodate (no overlay).
- Opened by: clicking a graph node (View mode), clicking the FAB (Add mode), or clicking "Add Referral" on an existing contact (Add mode with referral pre-filled).
- Close button (X) in top-right corner of drawer. Also closes on Escape key.

### View Mode

Opened when clicking a node on the graph or selecting a contact from the Results Panel.

```
┌─────────────────────────────┐
│ [← Back]              [X]  │
├─────────────────────────────┤
│                             │
│  Name                       │
│  Role @ Company             │
│  Tags: [mentor] [investor]  │
│                             │
│  ── How We Met ──────────── │
│  🤝 Professional intro      │
│  "Met at SaaS North 2024"   │
│  Known since: Mar 2024      │
│  (Referred by: Marcus)      │
│                             │
│  ── Relationship ─────────  │
│  Strength: ████████░░ 72    │
│  Your rating: ░░░░░░░░ --   │
│  Status: Direct connection  │
│                             │
│  ── Active Builders ──────  │
│  • Co-workers at Stripe     │
│    8 hrs/week, since Jan 25 │
│  [+ Add Builder]            │
│                             │
│  ── Interactions ─────────  │
│  [+ Log Interaction]        │
│                             │
│  📞 Mar 20 — Video call     │
│  "Discussed Q2 roadmap..."  │
│  45 min                     │
│                             │
│  ☕ Mar 12 — Coffee/Lunch   │
│  "Caught up on hiring..."   │
│                             │
│  (scrollable feed)          │
│                             │
├─────────────────────────────┤
│ [Edit] [Add Referral] [Delete] │
└─────────────────────────────┘
```

**Sections:**

1. **Header**: Contact name (large), role @ company, tag chips.
2. **How We Met**: Category label, freeform text, date first met, tenure computed (e.g., "2 years, 1 month"). If referral, shows "Referred by: [Name]" as a clickable link that navigates to that contact.
3. **Relationship Strength**:
   - Computed strength bar (0–100) with color matching edge color scheme.
   - User override slider below. Shows "--" if not set. Clicking activates the slider.
   - Direct/indirect status label. If indirect, shows referral source.
4. **Active Ongoing Builders**: List of active builders with label, hours/week, start date. Ended builders shown below, grayed out. [+ Add Builder] button opens an inline expandable form (label, hours/week, start date fields). Each active builder has an "End" action.
5. **Interaction Feed**: Chronological (newest first), scrollable. Each entry: type icon, date, notes preview (2–3 lines, expandable), duration if set. [+ Log Interaction] button at top — navigates to the Log Interaction view (Screen 3).
6. **Bottom Actions**:
   - [Edit] → switches drawer to Edit mode.
   - [Add Referral] → switches drawer to Add mode with referral pre-filled.
   - [Delete] → confirmation dialog, then removes contact.
   - [Add Mutual Connection] → inline picker to select another contact + optional label.

### Add Mode

Opened by the FAB or "Add Referral" action.

```
┌─────────────────────────────┐
│ Add Connection        [X]   │
├─────────────────────────────┤
│                             │
│  Name *                     │
│  [________________________] │
│                             │
│  Role / Title               │
│  [________________________] │
│                             │
│  Company                    │
│  [________________________] │
│                             │
│  How did you meet? *        │
│  [Category dropdown ▼     ] │
│  [Freeform text...        ] │
│                             │
│  (If referral:)             │
│  Referred by: Marcus ✓      │
│                             │
│  Date first met             │
│  [Mar 23, 2026         📅] │
│                             │
│  Tags                       │
│  [mentor ×] [+ Add tag    ] │
│                             │
│  ── Ongoing Builder ──────  │
│  (optional, expandable)     │
│  □ Add an ongoing builder   │
│    Label: [_______________] │
│    Hours/week: [__]         │
│    Start date: [_________]  │
│                             │
├─────────────────────────────┤
│         [Save Connection]   │
└─────────────────────────────┘
```

**Fields:**
- **Name** (required): text input.
- **Role/Title** (optional): text input.
- **Company** (optional): text input.
- **How did you meet** (required): category dropdown + freeform text field.
  - For referrals: category is pre-set to "Referral" and locked. The referrer is shown as a read-only chip (e.g., "Referred by: Marcus ✓").
- **Date first met**: date picker, defaults to today.
- **Tags**: multi-select chip input. User can select existing tags or type to create new ones.
- **Ongoing builder** (optional): expandable section with label, hours/week, start date.
- **[Save Connection]**: primary action button. On save, the new node appears on the graph with an animation.

### Edit Mode

Same layout as Add mode, but pre-populated with existing data. Title changes to "Edit Connection". Save button reads "Save Changes". All fields are editable. Destructive actions (delete) remain in the bottom action bar.

### Referral Flow

The referral flow is not a separate screen. It works as follows:

1. User clicks a node on the graph → Contact Drawer opens in View mode.
2. User clicks [Add Referral] at the bottom of the drawer.
3. Drawer switches to Add mode with:
   - "How did you meet" category pre-set to "Referral" and locked.
   - "Referred by" field pre-filled with the source contact's name (read-only).
   - All other fields empty for the user to fill in.
4. On save: new node created with indirect/dashed edge to "You" routed through the referrer. Mutual connection edge auto-created between the new contact and the referrer.

---

## Screen 3: Log Interaction (Drawer Content Swap)

Not a separate screen — replaces the Contact Drawer content when the user clicks [+ Log Interaction] from the contact's View mode.

### Layout

```
┌─────────────────────────────┐
│ [← Back to {Name}]   [X]   │
├─────────────────────────────┤
│                             │
│  Log Interaction            │
│  with {Contact Name}        │
│                             │
│  Date                       │
│  [Mar 23, 2026         📅] │
│                             │
│  Type *                     │
│  [Dropdown ▼              ] │
│  ┌──────────────────────┐   │
│  │ 💬 Message           │   │
│  │ 📧 Email             │   │
│  │ 📞 Call              │   │
│  │ 📹 Video Call        │   │
│  │ ☕ Coffee / Lunch     │   │
│  │ 🏢 Meeting           │   │
│  │ 🎪 Event             │   │
│  │ 🤝 Collaboration     │   │
│  │ 📝 Other             │   │
│  └──────────────────────┘   │
│                             │
│  Notes                      │
│  [                        ] │
│  [  Multiline freeform    ] │
│  [  text area...          ] │
│  [                        ] │
│                             │
│  Duration (minutes)         │
│  [____] (optional)          │
│                             │
├─────────────────────────────┤
│         [Save Interaction]  │
└─────────────────────────────┘
```

**Behavior:**
- [← Back to {Name}] returns to the contact's View mode without saving.
- Date defaults to today, can be backdated.
- Type is required.
- Notes is the primary field — large text area.
- Duration is optional.
- On save: returns to the contact's View mode. The new interaction appears at the top of the feed. Relationship strength recalculates and the graph edge updates visually.

---

## Screen 4: Auth / Sign-In Page

A full-page screen shown when a Tier 1 user clicks "Sign In" from the upgrade banner or from the Settings page.

### Layout

```
┌──────────────────────────────────────────┐
│                                          │
│              [NetWorks Logo]             │
│                                          │
│         Sign in to save your network     │
│                                          │
│    Your existing connections will sync   │
│    automatically to your account.        │
│                                          │
│    ┌──────────────────────────────┐      │
│    │  🔵 Continue with Google     │      │
│    └──────────────────────────────┘      │
│                                          │
│    ─────── or sign in with email ──────  │
│                                          │
│    Email                                 │
│    [_____________________________]       │
│                                          │
│    Password                              │
│    [_____________________________]       │
│                                          │
│    [         Sign In            ]        │
│    [      Create Account        ]        │
│                                          │
│    ────────────────────────────────────  │
│    [← Back to my network]               │
│                                          │
└──────────────────────────────────────────┘
```

**Behavior:**
- Centered card layout on a simple background.
- Google sign-in button (Firebase Auth with Google provider).
- Email/password sign-in and registration.
- On successful auth:
  - If Tier 1 → Tier 2 transition: triggers IndexedDB → Firestore migration automatically.
  - Shows brief loading state: "Syncing your network..." with progress indicator.
  - Redirects back to Main Graph Dashboard with all data intact.
- [← Back to my network] returns to the graph without signing in.
- Error states shown inline (e.g., "Email already in use", "Invalid password").

---

## Screen 5: Settings & Account Page

A full-page screen accessible from the account icon in the top bar.

### Layout

```
┌──────────────────────────────────────────┐
│  [← Back to Network]          NetWorks   │
├──────────────────────────────────────────┤
│                                          │
│  Account                                 │
│  ─────────────────────────────────────── │
│  Name: Jane Doe                          │
│  Email: jane@example.com                 │
│  Tier: Free (12 / 40 contacts used)     │
│  [Upgrade to Unlimited — $39]            │
│                                          │
│  (For Tier 1 / no account:)              │
│  You're using NetWorks without an        │
│  account. Your data is stored locally.   │
│  [Create Account to Sync & Back Up]      │
│                                          │
│  ─────────────────────────────────────── │
│                                          │
│  Preferences                             │
│  ─────────────────────────────────────── │
│  Default graph layout    [ForceAtlas2 ▼] │
│  Node label display      [First name ▼]  │
│                                          │
│  ─────────────────────────────────────── │
│                                          │
│  Data                                    │
│  ─────────────────────────────────────── │
│  Contacts: 12                            │
│  Interactions logged: 47                 │
│  [Sign Out]                              │
│                                          │
│  ─────────────────────────────────────── │
│                                          │
│  Danger Zone                             │
│  [Delete All Data]  [Delete Account]     │
│                                          │
└──────────────────────────────────────────┘
```

**Sections:**

1. **Account**: Shows user info, current tier, contact usage. Upgrade CTA for Tier 1 and Tier 2 users.
2. **Preferences**: Minimal settings for v1. Layout and label display options.
3. **Data**: Summary stats. Sign out button.
4. **Danger Zone**: Destructive actions with confirmation dialogs.

---

## Screen 6: Payment / Upgrade Page

**Deferred — design later.** Will be a full-page Stripe Checkout integration for the one-time $39 purchase (Tier 2 → Tier 3).

---

## Shared UI Patterns

### Drawer Transitions

All drawer mode changes use a horizontal slide animation:
- View → Edit: content slides left, edit form slides in from right.
- View → Log Interaction: same slide transition.
- Back navigation: reverse slide.

### Confirmation Dialogs

Used for destructive actions (delete contact, delete account, end builder). Centered modal overlay with:
- Description of what will happen.
- [Cancel] and [Confirm] buttons. Confirm button is red for destructive actions.

### Empty States

- **No contacts yet**: Graph shows only the "You" node. Onboarding tooltips guide the user.
- **No interactions on a contact**: Interaction feed area shows "No interactions yet. Log your first one." with a button.
- **No active builders**: Builder section shows "No ongoing connections" with [+ Add Builder] button.
- **No search results**: Results Panel shows "No connections match your search."

### Loading States

- Graph initial load: skeleton shimmer on the canvas area while layout computes.
- Drawer opening: brief fade-in.
- Save actions: button shows spinner, disables to prevent double-submit.

### Responsive Behavior (v1 — Minimal)

- **Desktop (>1024px)**: Full layout as described. Drawer and Results Panel coexist with the graph.
- **Tablet (768–1024px)**: Drawer overlays the graph (doesn't resize it). Results Panel overlays.
- **Mobile (<768px)**: Drawer is full-screen. Results Panel is full-screen. Graph is touch-enabled (pinch zoom, tap nodes). FAB remains in bottom-right.

---

## Navigation Map

```
Main Graph Dashboard
├── FAB (+) → Contact Drawer (Add Mode)
│   └── Save → back to graph, new node appears
├── Click node → Contact Drawer (View Mode)
│   ├── [Edit] → Contact Drawer (Edit Mode)
│   │   └── Save → back to View Mode
│   ├── [Add Referral] → Contact Drawer (Add Mode, referral pre-filled)
│   │   └── Save → back to graph, new node appears
│   ├── [+ Log Interaction] → Log Interaction (drawer swap)
│   │   └── Save → back to View Mode
│   ├── [+ Add Builder] → inline form expand
│   ├── [Add Mutual Connection] → inline contact picker
│   └── [Delete] → confirmation dialog → back to graph
├── Search / Filters → Results Panel (left) + filtered graph
│   └── Click result → Contact Drawer (View Mode)
├── Account icon → Settings & Account Page
│   ├── [Upgrade] → Payment Page (deferred)
│   ├── [Create Account] → Auth Page
│   └── [← Back] → Main Graph Dashboard
└── Upgrade banner → Auth Page
    └── Success → back to Main Graph Dashboard (data synced)
```
