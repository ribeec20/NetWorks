# NetWorks — Professional Network Visualization Tool

## Product Spec v1.0

---

## Overview

NetWorks is a web-first, one-time-purchase tool that helps professionals visualize, track, and maintain their professional network as an interactive force-directed graph. Unlike subscription-based personal CRMs that focus on contact management, NetWorks is visualization-first — the graph IS the product. Relationship strength is dynamic, evolving over time based on tenure, interaction history, and ongoing connections.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React |
| Graph rendering | Sigma.js (WebGL) + Graphology (graph data structure) |
| Auth | Firebase Authentication (Google + email sign-in) |
| Database (cloud) | Firestore |
| Local storage (no-account tier) | IndexedDB |
| Hosting | Firebase Hosting |
| State management | React Context or Zustand (implementer's choice) |

---

## User Tiers

### Tier 1 — No Account (Free, Zero Friction)

- No sign-up required. User lands on site and starts immediately.
- All data stored in IndexedDB (browser-local).
- Full feature access. No feature gating.
- No contact limit (local storage only — no server cost).
- Data is browser-bound: no sync, no backup, lost on cache clear.
- Upgrade prompt: persistent but non-intrusive banner explaining risk of data loss and benefits of an account.

### Tier 2 — Free Account (Firestore, 40 Contacts)

- User creates account via Firebase Auth.
- On account creation, all local IndexedDB data auto-merges into Firestore seamlessly. User should not need to re-enter anything.
- 40 total contacts (not "active" — total ever created). Deleting a contact frees a slot.
- Full feature access. No feature gating. Volume cap only.
- Cross-device access, cloud backup, persistence.
- Upgrade prompt: shown when approaching or hitting the 40-contact cap.

### Tier 3 — Paid One-Time Purchase (Firestore, Unlimited)

- One-time purchase at ~$39 price point.
- Unlimited contacts.
- Full feature access.
- Includes one default visual theme.
- Future: additional theme packs available as separate purchases (out of scope for v1).

---

## Data Model

### Contact (Node)

```
contacts/{contactId}
├── name: string
├── role: string (e.g., "VP Eng @ Stripe")
├── company: string
├── tags: string[] (e.g., ["mentor", "investor", "fitness"])
├── howWeMet: {
│     category: enum [
│       "professional_introduction",
│       "referral",
│       "cold_outreach",
│       "existing_relationship",
│       "event_conference",
│       "online",
│       "other"
│     ],
│     freeform: string (user's own description, e.g., "Met at SaaS North 2024 after-party"),
│     referredBy: contactId | null (link to referring contact if category is "referral")
│   }
├── dateAdded: timestamp
├── dateFirstMet: timestamp (can be backdated for existing relationships)
├── userStrengthOverride: number | null (0-100, optional user self-assessment)
├── createdAt: timestamp
├── updatedAt: timestamp
```

### Interaction (Log Entry)

```
contacts/{contactId}/interactions/{interactionId}
├── date: timestamp
├── type: enum [
│     "message",        // text, DM, LinkedIn message
│     "email",
│     "call",
│     "video_call",
│     "coffee_lunch",   // in-person casual
│     "meeting",        // formal/professional
│     "event",          // conference, meetup, group setting
│     "collaboration",  // working session, pair work
│     "other"
│   ]
├── notes: string (freeform — what you discussed, action items, things to remember)
├── duration: number | null (minutes, optional)
├── createdAt: timestamp
```

### Ongoing Strength Builder

```
contacts/{contactId}/ongoingBuilders/{builderId}
├── label: string (e.g., "Co-workers at Stripe", "SpeedTrap project collaboration")
├── hoursPerWeek: number | null (optional intensity indicator)
├── startDate: timestamp
├── endDate: timestamp | null (null = still active)
├── createdAt: timestamp
```

### Relationship Edge

```
contacts/{contactId}/relationship
├── strengthScore: number (0-100, computed)
├── isDirect: boolean
├── referralSource: contactId | null (if originally a referral, who introduced them)
├── createdAt: timestamp
├── updatedAt: timestamp
```

Note: Edges between two non-"you" contacts (mutual connections) are optional and informational only. These are stored separately:

```
mutualConnections/{connectionId}
├── contactA: contactId
├── contactB: contactId
├── label: string | null (e.g., "college friends", "co-workers")
├── createdAt: timestamp
```

### User Profile

```
users/{userId}
├── email: string
├── displayName: string
├── tier: enum ["free", "paid"]
├── contactCount: number (denormalized counter for enforcing cap)
├── purchaseDate: timestamp | null
├── createdAt: timestamp
```

---

## Relationship Strength Algorithm

### Five Inputs

Strength is computed from five factors, each contributing to a composite score (0-100):

#### 1. Tenure (weight: ~20%)
- How long you've known the person (dateFirstMet to now).
- Provides a "floor" — long tenure means the relationship has resilience.
- Scale: 0-1 year = low, 1-3 years = moderate, 3+ years = high, 5+ years = max tenure contribution.

#### 2. Recency (weight: ~25%, modulated by tenure)
- Time since last interaction.
- **Critical rule**: Recency weight is inversely proportional to tenure. For new contacts (< 6 months), recency matters a lot — 2 weeks of silence is a big signal. For long-tenure contacts (5+ years), 2 months of silence barely registers.
- Decay curve flattens as tenure grows.

#### 3. Frequency (weight: ~20%)
- Interaction count over a rolling window (e.g., last 90 days).
- Weekly interactions = high contribution. Monthly = moderate. Quarterly = low.

#### 4. Depth (weight: ~15%)
- Based on interaction types logged. Each type carries a depth multiplier:
  - message/email: 1x
  - call/video_call: 2x
  - coffee_lunch: 3x
  - meeting: 2.5x
  - event: 1.5x
  - collaboration: 4x
- Depth score = average depth multiplier across recent interactions.

#### 5. Ongoing Strength Builders (weight: ~20%)
- Active builders contribute continuous passive strength.
- A builder with hoursPerWeek set contributes proportionally (8 hrs/week > 1 hr/week).
- When a builder ends (endDate set), it stops contributing immediately, but tenure and past interactions remain.

### User Override

- Users can optionally set a self-assessed strength score (0-100) on any contact.
- When set, this override is displayed alongside the computed score.
- User overrides are collected to help tune algorithm parameters in future versions.
- The graph visualization uses the computed score for edge rendering, but the detail card shows both if an override exists.

### Referral → Direct Transition

- A contact added via referral starts with `isDirect: false`.
- The referral edge renders as a dashed line visually routed through the referrer.
- As the user logs direct interactions, strength grows.
- When the computed strength crosses a threshold (suggest: 40/100), `isDirect` flips to `true`.
- The edge transitions from dashed/indirect to solid/direct in the visualization.
- The referralSource field is preserved for history ("Originally introduced by Marcus").

### Strength Decay

- Strength decays over time if no new interactions are logged and no ongoing builders are active.
- Decay rate is modulated by tenure (high tenure = slow decay).
- A contact with no interactions and no builders will eventually fade to near-zero strength, but very slowly if tenure is high.

---

## Core Features

### 1. Interactive Network Graph (Main View)

- Force-directed graph layout via Sigma.js / Graphology.
- "You" node is center/anchor, always visible.
- Nodes = contacts. Size scaled by relationship strength.
- Edges = relationships. Visual properties driven by strength:
  - Thickness: proportional to strength score.
  - Color: strong (teal/green) → growing (amber) → weak (gray).
  - Style: solid for direct connections, dashed for referral/indirect connections.
- Strong connections are pulled closer to "You" by force layout. Weak connections drift to periphery.
- Nodes are draggable.
- Click a node to open the detail panel.
- Zoom and pan support.
- Nodes colored by tag/group (user-assigned tags determine color).

### 2. Add Contact — Direct

- Accessible from main UI (e.g., "+" button).
- Form fields:
  - Name (required)
  - Role / title (optional)
  - Company (optional)
  - How we met — category dropdown + freeform text field (required)
  - Date first met (defaults to today, can be backdated)
  - Tags (optional, multi-select/create)
  - Ongoing strength builder (optional, can add immediately)
- On save: creates node with direct edge to "You" at initial low strength.

### 3. Add Contact — Referral

- Accessible from an existing contact's detail panel (e.g., "Add referral" button on Marcus's card).
- Same form as direct add, except:
  - How we met category is pre-set to "referral."
  - referredBy is auto-populated with the source contact.
  - User fills in the freeform "how we met" with context (e.g., "Marcus introduced us over email about the AI project").
- On save: creates node with indirect/dashed edge to "You" routed through the referrer. Also creates a mutual connection edge between the new contact and the referrer.

### 4. Contact Detail Panel

- Opens on node click.
- Displays:
  - Name, role, company
  - How you met (category + freeform)
  - Date first met / tenure
  - Tags
  - Relationship strength bar (computed score, plus user override if set)
  - Direct vs. indirect status (and referral source if applicable)
  - Active ongoing strength builders
- Below profile info: chronological interaction feed (newest first).
- Each interaction entry shows: date, type icon, notes preview, duration if set.
- "Add interaction" button at top of feed.
- "Add referral" button to add a new contact referred by this person.
- "Edit contact" and "Delete contact" options.

### 5. Log Interaction

- Accessible from contact detail panel.
- Form fields:
  - Date (defaults to today, can be backdated)
  - Type (dropdown: message, email, call, video_call, coffee_lunch, meeting, event, collaboration, other)
  - Notes (freeform text, multiline — this is the primary field)
  - Duration in minutes (optional)
- On save: interaction is added to the contact's feed. Relationship strength recalculates.

### 6. Ongoing Strength Builders

- Managed from contact detail panel.
- "Add ongoing connection" button.
- Fields:
  - Label (e.g., "Co-workers at Stripe", "Weekly basketball league")
  - Hours per week (optional)
  - Start date
- Active builders show on the contact detail panel with an option to end them (sets endDate).
- Ended builders remain visible in history but grayed out.

### 7. Mutual Connections (Optional Edges)

- From any contact detail panel, user can link two existing contacts as knowing each other.
- "Add mutual connection" → select another contact → optional label.
- These edges render in the graph as thinner, neutral-colored lines between non-"You" nodes.
- Purely informational. Does not affect the user's relationship strength with either contact.
- Helps visualize cluster structure (e.g., "my grad school group" all interconnected).

### 8. User Strength Override

- On the contact detail panel, next to the computed strength bar.
- "How would you rate this relationship?" — optional slider (0-100).
- When set, displayed alongside computed score: "Computed: 62 | Your rating: 80."
- Override is stored on the contact doc.

---

## Adding Contacts — Flow Summary

```
Main View (Graph)
├── [+ Add Contact] → Direct add form → New node with direct edge
└── [Click existing node] → Detail Panel
    ├── [Add Referral] → Referral add form → New node with indirect edge through this contact
    ├── [Add Interaction] → Interaction form → Logged to this contact's feed
    ├── [Add Ongoing Builder] → Builder form → Passive strength contributor
    └── [Add Mutual Connection] → Link two existing contacts
```

---

## Local Storage (Tier 1) Architecture

- Use IndexedDB via a wrapper library (e.g., Dexie.js or idb).
- Mirror the Firestore data model exactly in IndexedDB object stores:
  - `contacts` store
  - `interactions` store (keyed by contactId + interactionId)
  - `ongoingBuilders` store
  - `mutualConnections` store
  - `userProfile` store (local-only settings)
- All app logic reads/writes through a data access layer that abstracts the storage backend.
- When user creates an account (Tier 1 → Tier 2), the migration layer:
  1. Reads all data from IndexedDB.
  2. Writes it to Firestore under the new user's document.
  3. Confirms success.
  4. Switches the data access layer to Firestore.
  5. Optionally clears IndexedDB.
- This migration must be seamless and automatic on account creation.

---

## Firestore Security Rules

```
users/{userId}:
  - read/write: only if request.auth.uid == userId

users/{userId}/contacts/{contactId}:
  - read/write: only if request.auth.uid == userId

users/{userId}/contacts/{contactId}/interactions/{interactionId}:
  - read/write: only if request.auth.uid == userId

users/{userId}/contacts/{contactId}/ongoingBuilders/{builderId}:
  - read/write: only if request.auth.uid == userId

users/{userId}/mutualConnections/{connectionId}:
  - read/write: only if request.auth.uid == userId
```

Contact count enforcement (40-cap for free tier) should be enforced both client-side and via Firestore security rules checking the `contactCount` field on the user profile against the tier.

---

## Graph Rendering Details

### Sigma.js Configuration

- Renderer: WebGL (default Sigma.js renderer).
- Layout: Force-directed via graphology-layout-forceatlas2 (or similar).
- The layout should run on initial load and stabilize, then allow manual dragging.

### Node Rendering

- "You" node: largest, fixed center position, distinct color (purple).
- Contact nodes: sized by strength score (min radius for very weak, max for very strong).
- Node color determined by primary tag/group or relationship type.
- Node label: first name (or full name if zoomed in).

### Edge Rendering

- Direct edges: solid lines.
- Indirect/referral edges: dashed lines.
- Edge thickness: proportional to strength (1px weak → 5px strong).
- Edge color: teal (strong, 60+) → amber (growing, 30-59) → gray (weak, <30).

### Interaction

- Click node → open detail panel.
- Drag node → reposition (temporary, snaps back on layout recalc unless pinned).
- Zoom/pan → standard graph navigation.
- Hover node → tooltip with name + strength score.

---

## UI Structure

See **[UI.md](./UI.md)** for the complete UI specification, including all screen layouts, drawer behavior, navigation map, and interaction patterns.

---

## Payment Integration

- Use Stripe Checkout or Stripe Payment Links for one-time purchase.
- On successful payment, Firebase Cloud Function (or webhook handler) updates user doc: `tier: "paid"`, `purchaseDate: timestamp`.
- Client listens to user doc changes and unlocks unlimited contacts immediately.

---

## Out of Scope for v1

- Theme packs (future monetization via separate purchases)
- Timeline scrubber (view network state at past points in time)
- Import from LinkedIn / CSV / other CRMs
- Email/calendar integration (auto-logging interactions)
- Mobile native app (web-first PWA only)
- Team/shared networks
- Notifications / email reminders for follow-ups
- API access
- Export functionality

---

## Success Metrics

- Conversion rate: no-account → free account (target: 30%+)
- Conversion rate: free account → paid (target: 10-15%)
- Contacts per active user (indicates engagement depth)
- Interactions logged per week per user (indicates habit formation)
- User strength override usage (data for tuning the algorithm)

---

## Implementation Priority

1. **Core graph rendering** — Sigma.js + Graphology, force layout, node/edge rendering with strength-based visuals.
2. **Local storage layer** — IndexedDB data model, CRUD operations, data access abstraction.
3. **Add contact (direct)** — form, node creation, edge creation.
4. **Contact detail panel** — profile display, strength bar.
5. **Log interaction** — form, feed display, strength recalculation.
6. **Add contact (referral)** — referral flow from existing contact, indirect edge rendering.
7. **Ongoing strength builders** — CRUD, integration into strength algorithm.
8. **Strength algorithm** — full implementation with all five factors + decay.
9. **Firebase Auth + Firestore** — account creation, cloud storage, security rules.
10. **Local → cloud migration** — seamless IndexedDB to Firestore merge on sign-up.
11. **Tier enforcement** — 40-contact cap for free, unlimited for paid.
12. **Stripe integration** — one-time purchase flow.
13. **Mutual connections** — optional edges between non-"You" contacts.
14. **Polish** — search, tag filtering, strength filter, responsive layout.