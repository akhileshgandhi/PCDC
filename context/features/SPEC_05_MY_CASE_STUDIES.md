# SPEC_05 — My Case Studies Page

## Meta
- Role: Student
- Route: /dashboard/case-studies
- Priority: 1 of 8
- Data: Mock only (no API connection yet)

---

## Design System (apply to all elements)
- Primary Navy: #0B1D3A
- Accent Gold: #C9A227
- Background Page: #F6F7F9
- Background Card: #FFFFFF
- Border Light: #E6EBEB
- Text Primary: #111827
- Text Secondary: #6B7280
- Success: #16A34A
- Warning: #F59E0B
- Danger: #EF4444
- Font: Inter (Google Fonts)
- Border radius: xl=12px, lg=8px, md=6px, sm=4px

---

## Layout

Left sidebar (same as dashboard — already built).
Main content area:

```
[ Page Header ]
[ Filter Bar ]
[ Case Study Cards Grid ]
```

---

## Page Header

```
My Case Studies
Browse and attempt case studies assigned to your career track.

[ 3 stat pills ]
  Available: 12   |   In Progress: 1   |   Completed: 4
```

---

## Filter Bar

Horizontal row of filters:

- Domain dropdown: All Domains | Geopolitics | Sports |
  Business | Social | Science | Technology |
  Environment | Healthcare
- Difficulty dropdown: All Levels | Level 1 | Level 2 |
  Level 3 | Level 4 | Level 5 | Level 6 | Level 7
- Status tabs: All | Available | In Progress | Completed
- Search input (right side): placeholder "Search case studies..."

---

## Case Study Card (grid, 3 columns desktop / 1 mobile)

Each card contains:

```
[ Domain tag pill ]  [ Difficulty badge ]       [ Status badge ]

Title of Case Study
Short description text (2 lines max, truncate)

[ Level icon ] Level 3    [ Clock icon ] 45 min

[ Career track tags: e.g. "Consulting"  "Finance" ]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ Button ]
```

Button states:
- Available → gold filled button "Start Attempt →"
- In Progress → navy outline button "Continue Attempt →"
- Completed → green outline button "View Results" + green
  checkmark badge top-right of card

Domain tag pill colours:
- Geopolitics: navy bg, white text
- Sports: green bg, white text
- Business: gold bg, dark text
- Social: purple bg, white text
- Science: blue bg, white text
- Technology: teal bg, white text
- Environment: emerald bg, white text
- Healthcare: red bg, white text

Difficulty badge: small pill, navy border, navy text "Level X"

Status badge (top-right corner of card):
- Available: no badge
- In Progress: gold "In Progress"
- Completed: green "Completed ✓"

---

## Mock Data (use this exactly)

```javascript
const mockCaseStudies = [
  {
    id: 1,
    title: "Q3 Market Entry Strategy",
    description: "A consumer electronics company faces declining market share in Southeast Asia. As the Strategy Head, develop a market re-entry plan.",
    domain: "Business",
    difficulty: 3,
    estimated_minutes: 45,
    status: "in_progress",
    career_tracks: ["Consulting", "Marketing"],
    capabilities: ["Strategic Thinking", "Decision Making"]
  },
  {
    id: 2,
    title: "India-China Border Tensions: Economic Impact",
    description: "Analyse the cascading economic impact of geopolitical tensions on Indian manufacturing and supply chain strategy.",
    domain: "Geopolitics",
    difficulty: 5,
    estimated_minutes: 90,
    status: "available",
    career_tracks: ["Consulting", "General Management"],
    capabilities: ["Analytical Thinking", "Risk Assessment"]
  },
  {
    id: 3,
    title: "IPL Franchise Turnaround",
    description: "A mid-table IPL franchise is losing fan engagement and sponsorship revenue. Design a 3-year revival strategy.",
    domain: "Sports",
    difficulty: 2,
    estimated_minutes: 30,
    status: "completed",
    career_tracks: ["Marketing", "General Management"],
    capabilities: ["Innovation", "Communication"]
  },
  {
    id: 4,
    title: "Rural Healthcare Delivery Model",
    description: "Design a financially sustainable last-mile healthcare delivery model for tier-3 Indian cities.",
    domain: "Healthcare",
    difficulty: 4,
    estimated_minutes: 60,
    status: "available",
    career_tracks: ["Entrepreneurship", "General Management"],
    capabilities: ["Innovation", "Decision Making"]
  },
  {
    id: 5,
    title: "EV Adoption Barriers in India",
    description: "Identify and prioritise the key barriers to EV adoption and recommend a policy + product strategy.",
    domain: "Technology",
    difficulty: 4,
    estimated_minutes: 60,
    status: "available",
    career_tracks: ["Consulting", "Analytics"],
    capabilities: ["Analytical Thinking", "Strategic Thinking"]
  },
  {
    id: 6,
    title: "Water Scarcity in Marathwada",
    description: "Develop a multi-stakeholder intervention plan for the water crisis in Maharashtra's Marathwada region.",
    domain: "Environment",
    difficulty: 6,
    estimated_minutes: 120,
    status: "available",
    career_tracks: ["General Management", "Entrepreneurship"],
    capabilities: ["Systems Thinking", "Risk Assessment"]
  }
]
```

---

## Interactions

- Clicking "Start Attempt →" navigates to `/dashboard/case-studies/{id}`
  (Case Detail page — SPEC_06)
- Clicking "Continue Attempt →" navigates directly to
  `/dashboard/case-studies/{id}/attempt`
  (Case Attempt flow — SPEC_07)
- Clicking "View Results" navigates to
  `/dashboard/case-studies/{id}/results`
- Filter dropdowns filter the visible cards instantly (client-side)
- Search filters by title and description (client-side)
- Empty state: if no cards match filters, show centred message:
  "No case studies match your filters. Try adjusting the filters above."

---

## Files to create

```
frontend/src/pages/cases/MyCaseStudies.jsx
frontend/src/components/cases/CaseCard.jsx
frontend/src/components/cases/DomainTag.jsx
frontend/src/components/cases/DifficultyBadge.jsx
frontend/src/components/cases/StatusBadge.jsx
```

Add route in App.jsx:
```jsx
<Route path="/dashboard/case-studies" element={<MyCaseStudies />} />
```

Add sidebar link in Sidebar component:
- Icon: BookOpen (Lucide)
- Label: My Case Studies
- Route: /dashboard/case-studies

---

## Definition of Done

- [ ] Page renders at /dashboard/case-studies
- [ ] Sidebar link navigates to this page and shows active state
- [ ] All 6 mock cards render with correct domain/difficulty/status
- [ ] Domain filter works client-side
- [ ] Difficulty filter works client-side
- [ ] Status tabs filter correctly
- [ ] Search filters by title
- [ ] Card buttons navigate to correct routes
- [ ] Completed card shows green checkmark badge
- [ ] In Progress card shows Continue button
- [ ] Responsive on mobile (1 column)
