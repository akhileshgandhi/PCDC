# SPEC_13: Student Dashboard — Capability Matrix Component

**Page:** `/student/dashboard`
**Component:** Capability Matrix
**Status:** UI fix — component renders blank, needs to be built
**Data:** Hardcoded for now, API wiring comes later

---

## Problem

The Capability Matrix section on the student dashboard is showing only the heading ("Capability Matrix") and subtitle ("Real-time performance across core executive competencies.") but rendering blank below that. The actual 4-category grid and sub-capability breakdown need to be built.

---

## What to Build

### Layout: 2×2 Grid + Accordion Panel

Two parts:
1. A 2×2 grid of 4 category boxes (always visible)
2. A single accordion panel below the grid (visible only when a box is clicked)

---

## Part 1 — Category Grid (Default State)

Four boxes in a 2×2 grid. Each box shows:
- Category label
- Aggregate score (large number, centered)
- "avg score" label beneath the number
- Subtle active/selected state when clicked (gold border or highlighted background matching existing design)

```
┌──────────────────────┐  ┌──────────────────────┐
│  Cognitive            │  │  Leadership           │
│  Capabilities         │  │  Capabilities         │
│                       │  │                       │
│         68            │  │         61            │
│      avg score        │  │      avg score        │
└──────────────────────┘  └──────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐
│  Entrepreneurial      │  │  Professional         │
│  Capabilities         │  │  Capabilities         │
│                       │  │                       │
│         57            │  │         72            │
│      avg score        │  │      avg score        │
└──────────────────────┘  └──────────────────────┘
```

---

## Part 2 — Accordion Panel (Click State)

- Clicking a box opens one shared accordion panel **directly below the 2×2 grid**
- Panel shows the 5 sub-capabilities for the selected category
- Each sub-capability row: name on left, progress bar in middle, numeric score on right
- Progress bar fills to score/100 (e.g. score 74 = 74% filled)
- Clicking the **same** active box again → closes the panel (toggle)
- Clicking a **different** box → panel stays open, content switches to that category
- Smooth open/close animation preferred

```
┌──────────────────────────────────────────────────────┐
│  Cognitive Capabilities                           68  │
│  ──────────────────────────────────────────────────  │
│  Analytical Thinking      ████████████░░░░░░   74    │
│  Critical Thinking        ██████████░░░░░░░░   65    │
│  Strategic Thinking       ███████████░░░░░░░   71    │
│  Systems Thinking         █████████░░░░░░░░░   60    │
│  Decision Making          ███████████░░░░░░░   70    │
└──────────────────────────────────────────────────────┘
```

---

## Hardcoded Data

Use this exact data object. Do not wire to any API endpoint — that comes in a later task.

```javascript
const capabilityData = [
  {
    id: 'cognitive',
    label: 'Cognitive Capabilities',
    score: 68,
    items: [
      { name: 'Analytical Thinking', score: 74 },
      { name: 'Critical Thinking', score: 65 },
      { name: 'Strategic Thinking', score: 71 },
      { name: 'Systems Thinking', score: 60 },
      { name: 'Decision Making', score: 70 },
    ]
  },
  {
    id: 'leadership',
    label: 'Leadership Capabilities',
    score: 61,
    items: [
      { name: 'Communication', score: 68 },
      { name: 'Influence', score: 58 },
      { name: 'Negotiation', score: 63 },
      { name: 'Conflict Resolution', score: 55 },
      { name: 'Team Management', score: 61 },
    ]
  },
  {
    id: 'entrepreneurial',
    label: 'Entrepreneurial Capabilities',
    score: 57,
    items: [
      { name: 'Opportunity Recognition', score: 62 },
      { name: 'Innovation', score: 55 },
      { name: 'Business Model Thinking', score: 58 },
      { name: 'Risk Assessment', score: 51 },
      { name: 'Resourcefulness', score: 59 },
    ]
  },
  {
    id: 'professional',
    label: 'Professional Capabilities',
    score: 72,
    items: [
      { name: 'Professional Judgment', score: 75 },
      { name: 'Business Acumen', score: 70 },
      { name: 'Execution Orientation', score: 73 },
      { name: 'Learning Agility', score: 68 },
      { name: 'Adaptability', score: 74 },
    ]
  }
]
```

---

## Interaction Logic (State)

```javascript
// One piece of state controls everything
const [activeCategory, setActiveCategory] = useState(null)

// Click handler on each box
function handleBoxClick(categoryId) {
  // Same box clicked → close panel (toggle off)
  // Different box clicked → switch content (panel stays open)
  setActiveCategory(prev => prev === categoryId ? null : categoryId)
}

// Accordion panel renders only when activeCategory is not null
// Panel content = capabilityData.find(c => c.id === activeCategory)
```

---

## Styling Notes

Match the existing student dashboard design:
- Dark navy (`#0f172a` or existing CSS var) for the welcome hero card — do not change that
- Gold accent (existing `--color-accent` or equivalent) for active box border/highlight and progress bar fill
- White/light background for the category boxes (same card style used elsewhere on the dashboard)
- Progress bar: light grey track, gold fill
- Accordion panel: same card background as the boxes, slightly elevated shadow
- Font sizes: category label medium weight, score large and bold, sub-capability names regular weight
- Do not introduce any new color values — use only what already exists in the project's Tailwind config or CSS variables

---

## Files to Touch

- Locate the existing Capability Matrix section inside the student dashboard component (likely in `frontend/src/pages/student/Dashboard.jsx` or similar)
- The blank section is already rendered — find it and replace the empty content with this component
- If the capability grid is complex enough, extract it as a separate component: `frontend/src/components/student/CapabilityMatrix.jsx`
- Do not modify any other section of the dashboard

---

## Acceptance Criteria

- [ ] 4 category boxes visible in a 2×2 grid on the student dashboard
- [ ] Each box shows category label + aggregate score
- [ ] Clicking a box opens the accordion panel below the grid
- [ ] Panel shows all 5 sub-capabilities with progress bars and scores
- [ ] Clicking the same active box closes the panel
- [ ] Clicking a different box switches the panel content without closing it
- [ ] Active box has a visible selected state (border or background highlight)
- [ ] Scores and names match the hardcoded data exactly
- [ ] No API calls made — purely hardcoded data for now
- [ ] No existing dashboard sections are affected or broken
