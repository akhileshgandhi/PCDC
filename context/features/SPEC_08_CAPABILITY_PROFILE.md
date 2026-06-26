# SPEC_08 — Capability Profile Page

## Meta
- Role: Student
- Route: /dashboard/capability-profile
- Priority: 4 of 8
- Data: Mock only (no API connection yet)

---

## Layout

```
[ Page Header ]
[ Two column: Radar Chart Left | Score Cards Right ]
[ Capability History Table ]
[ Recommended Actions ]
```

---

## Page Header

```
My Capability Profile
Track your growth across all executive competencies.

Last updated: Jun 20, 2025   |   Based on 5 case studies
```

---

## Top Section — Two Column

### Left: Radar Chart (60%)

Large radar/spider chart showing all 8 capabilities.
Use recharts RadarChart component.

```
Capabilities on axes:
- Analytical Thinking
- Critical Thinking
- Strategic Thinking
- Decision Making
- Communication
- Leadership
- Innovation
- Risk Assessment

Two datasets on same chart:
- Current scores (gold fill, semi-transparent)
- Previous month scores (navy dashed line)

Legend:
  ── Current   - - Previous Month
```

Below chart:
```
Overall Capability Score
[ Large: 72 ]
Level 3 — Strategic Decision Making
Progress to Level 4: ████████░░ 240 pts needed
```

### Right: Score Cards (40%)

8 capability cards in a 2x4 grid:

Each card:
```
┌────────────────────────┐
│ [Icon]  Analytical     │
│         Thinking       │
│                        │
│    78 / 100            │
│ ████████░░             │
│ ▲ +3.2% this month    │
└────────────────────────┘
```

Trend indicator:
- Positive: green ▲ +X%
- Negative: red ▼ -X%
- Stable: grey → stable

---

## Capability History Table

Heading: "Recent Case Study Performance"

Table columns:
| Case Study | Date | Score | Strongest | Weakest |
|---|---|---|---|---|

---

## Recommended Actions Section

Heading: "Recommended Next Steps"

3 action cards:
```
┌──────────────────────────────────────────────┐
│ 🎯 Improve Strategic Thinking               │
│ Your score dropped 0.8% this month          │
│ Recommended: Level 5 Geopolitics case       │
│ [ View Case → ]                             │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 📈 Build on Decision Making strength        │
│ +4.1% growth — keep the momentum            │
│ Recommended: Level 4 Business case          │
│ [ View Case → ]                             │
└──────────────────────────────────────────────┘

┌──────────────────────────────────────────────┐
│ 💬 Schedule Mentor Session                  │
│ Your mentor has a note about Risk Awareness │
│ Dr. Ananya Rao — Tomorrow 11:00 AM          │
│ [ View Session → ]                          │
└──────────────────────────────────────────────┘
```

---

## Mock Data

```javascript
const mockCapabilityProfile = {
  overall_score: 72,
  level: 3,
  level_name: "Strategic Decision Making",
  points_to_next: 240,
  last_updated: "2025-06-20",
  case_count: 5,
  capabilities: [
    { name: "Analytical Thinking", score: 78, previous: 74.8, trend: +3.2 },
    { name: "Critical Thinking", score: 74, previous: 72.9, trend: +1.5 },
    { name: "Strategic Thinking", score: 68, previous: 68.8, trend: -0.8 },
    { name: "Decision Making", score: 71, previous: 68.1, trend: +4.1 },
    { name: "Communication", score: 74, previous: 74, trend: 0 },
    { name: "Leadership", score: 65, previous: 63.7, trend: +2.0 },
    { name: "Innovation", score: 61, previous: 61.7, trend: -1.2 },
    { name: "Risk Assessment", score: 69, previous: 65.4, trend: +5.5 }
  ],
  recent_cases: [
    {
      title: "Q3 Market Entry Strategy",
      date: "Jun 20, 2025",
      score: 76,
      strongest: "Analytical Thinking",
      weakest: "Risk Assessment"
    },
    {
      title: "IPL Franchise Turnaround",
      date: "Jun 15, 2025",
      score: 69,
      strongest: "Communication",
      weakest: "Strategic Thinking"
    },
    {
      title: "Startup Opportunity Assessment",
      date: "Jun 10, 2025",
      score: 81,
      strongest: "Decision Making",
      weakest: "Leadership"
    }
  ]
}
```

---

## Files to create

```
frontend/src/pages/capability/CapabilityProfile.jsx
frontend/src/components/capability/CapabilityRadar.jsx
frontend/src/components/capability/CapabilityCard.jsx
frontend/src/components/capability/CapabilityHistoryTable.jsx
```

Add route in App.jsx:
```jsx
<Route path="/dashboard/capability-profile"
       element={<CapabilityProfile />} />
```

Add sidebar link:
- Icon: TrendingUp (Lucide)
- Label: Capability Profile
- Route: /dashboard/capability-profile

---

## Definition of Done

- [ ] Page renders at /dashboard/capability-profile
- [ ] Radar chart shows all 8 capabilities with mock data
- [ ] Two datasets (current + previous) visible on radar
- [ ] 8 capability cards render with score, bar, trend
- [ ] Trend colours correct (green up, red down, grey stable)
- [ ] History table renders with 3 rows
- [ ] 3 recommended action cards render
- [ ] Overall score and level shown correctly
