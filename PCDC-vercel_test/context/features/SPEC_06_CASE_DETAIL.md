# SPEC_06 — Case Detail Page

## Meta
- Role: Student
- Route: /dashboard/case-studies/:id
- Priority: 2 of 8
- Data: Mock only (no API connection yet)

---

## Purpose

This is the "pre-flight" page shown before a student starts their
attempt. It gives full context about the case, sets expectations,
and shows the one-attempt warning before committing.

---

## Layout

```
[ Back link: ← My Case Studies ]

[ Two column layout ]
  Left (65%):                    Right (35%):
  - Case header                  - Attempt info card
  - Case description             - Capabilities card
  - Learning outcomes            - Career tracks card
  - Reflection questions preview - Start button
```

---

## Left Column

### Case Header
```
[ Domain pill ]  [ Difficulty badge ]

Case Title Here (H1, navy, 28px)
Short description (body text, secondary colour)

[ Clock icon ] Estimated time: 45 minutes
[ Calendar icon ] Added: Jun 20, 2025
[ User icon ] Created by: Dr. Ananya Rao
```

### Case Description Section
Heading: "The Situation"
Full case description text (from mock data content field).
Style: readable body text, line height 1.8, max width 680px.

### Learning Outcomes Section
Heading: "What You Will Develop"
Bulleted list with checkmark icons (gold colour):
- Each learning outcome on its own line

### Reflection Questions Preview
Heading: "You Will Be Asked To Reflect On"
Show the 3 reflection questions as a numbered list.
Style: slightly muted, italic text.
Note below: "These questions appear after your AI discussion."

---

## Right Column (sticky on scroll)

### Attempt Info Card (navy background, white text)
```
┌─────────────────────────────┐
│  Your Attempt               │
│                             │
│  ⏱  45 minutes              │
│  📊  Level 3 — Decision     │
│      Making                 │
│  🎯  One attempt only       │
│                             │
│  ⚠️  Read the full case     │
│  before starting. You       │
│  cannot restart once begun. │
│                             │
│  [ Start My Attempt → ]     │
│   (gold button, full width) │
└─────────────────────────────┘
```

If status = completed, replace button with:
```
  ✓ Attempt Completed
  [ View My Results ]
```

If status = in_progress, replace button with:
```
  ● In Progress — Stage 3/6
  [ Continue Attempt → ]
```

### Capabilities Card (white card)
Heading: "Capabilities Assessed"
Show capability tags as pills:
- Strategic Thinking
- Decision Making
- Analytical Thinking
(gold border, navy text)

### Career Tracks Card (white card)
Heading: "Relevant Career Tracks"
Show career track tags as pills:
- Consulting
- Marketing
(light navy bg, white text)

---

## Mock Data (extend from SPEC_05 mock, add these fields)

```javascript
const mockCaseDetail = {
  id: 1,
  title: "Q3 Market Entry Strategy",
  description: `ABC Electronics, a mid-sized consumer electronics company,
    has seen a 25% revenue decline over the past two quarters in Southeast
    Asia. The company faces stiff competition from Chinese OEMs, a weakening
    distribution network, and shifting consumer preferences toward
    premium-segment products.

    As the newly appointed Strategy Head, you have been tasked with
    developing a comprehensive market re-entry plan. You have access to
    financial reports, customer feedback data, and competitor analysis.
    The board expects a presentation in 45 minutes.`,
  domain: "Business",
  difficulty: 3,
  estimated_minutes: 45,
  status: "in_progress",
  current_stage: 3,
  created_by: "Dr. Ananya Rao",
  created_at: "2025-06-20",
  learning_outcomes: [
    "Apply strategic frameworks to diagnose business decline",
    "Evaluate trade-offs in market re-entry strategies",
    "Develop data-driven recommendations under time pressure",
    "Anticipate competitive responses to strategic decisions"
  ],
  reflection_questions: [
    "What assumptions did you make that could be challenged?",
    "How did your thinking evolve after the AI discussion?",
    "What would you do differently with more information?"
  ],
  career_tracks: ["Consulting", "Marketing"],
  capabilities: ["Strategic Thinking", "Decision Making", "Analytical Thinking"]
}
```

---

## Interactions

- "Start My Attempt →" button navigates to
  `/dashboard/case-studies/:id/attempt` (SPEC_07)
- "Continue Attempt →" also navigates to attempt flow
- "← My Case Studies" back link navigates to /dashboard/case-studies
- Sticky right column follows scroll on desktop

---

## Files to create

```
frontend/src/pages/cases/CaseDetail.jsx
```

Add route in App.jsx:
```jsx
<Route path="/dashboard/case-studies/:id" element={<CaseDetail />} />
```

---

## Definition of Done

- [ ] Page renders at /dashboard/case-studies/1
- [ ] Back link works
- [ ] All sections render: header, situation, outcomes, reflection preview
- [ ] Right column shows correct state (available / in_progress / completed)
- [ ] Start button navigates to attempt flow
- [ ] Sticky right column works on desktop scroll
