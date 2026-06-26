# SPEC_10 — Career Pathway Page

## Meta
- Role: Student
- Route: /dashboard/career-pathway
- Priority: 6 of 8
- Data: Mock only

---

## Layout

```
[ Page Header ]
[ Current Pathway Banner ]
[ Progress Timeline ]
[ Recommended Activities ]
[ Career Track Explorer ]
```

---

## Page Header

```
Career Pathway
Your personalised development roadmap toward
Management Consulting.
```

---

## Current Pathway Banner (navy background, gold accents)

```
┌──────────────────────────────────────────────────────┐
│  CURRENT PATHWAY                                     │
│  Management Consulting                               │
│                                                      │
│  Capability Readiness: ████████░░ 72%               │
│                                                      │
│  Key Focus Areas:                                    │
│  [ Strategic Thinking ] [ Decision Making ]          │
│  [ Communication ]      [ Analytical Thinking ]      │
│                                                      │
│  Estimated readiness: 4-6 months                    │
│                  [ Change Pathway ]                  │
└──────────────────────────────────────────────────────┘
```

---

## Progress Timeline

Visual horizontal timeline with 5 milestones:

```
Foundation ──●── Analysis ──●── Decision ──○── Strategy ──○── Executive
   Done          Done        In Progress     Locked          Locked
```

Each milestone node expands on click to show:
- Milestone name
- Required capabilities and scores
- Case studies completed at this level
- Status: Done / In Progress / Locked

---

## Recommended Activities (3 cards)

```
NEXT RECOMMENDED ACTIVITIES

┌─────────────────────────────────┐
│ 📋 Market Entry Case            │
│    Level 3 · Business · 45 min  │
│    Develops: Strategic Thinking │
│    [ Start → ]                  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 🧩 Problem Structuring Drill    │
│    Level 3 · Exercise · 20 min  │
│    Develops: Analytical Thinking│
│    [ Start → ]                  │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ 💬 Executive Communication      │
│    Level 2 · Exercise · 15 min  │
│    Develops: Communication      │
│    [ Start → ]                  │
└─────────────────────────────────┘
```

---

## Career Track Explorer

Heading: "Explore Other Pathways"

Grid of all 10 career track cards:
```javascript
const careerTracks = [
  { name: "Management Consulting", icon: "Briefcase", match: 85, current: true },
  { name: "Finance", icon: "TrendingUp", match: 71 },
  { name: "Marketing", icon: "Megaphone", match: 68 },
  { name: "Human Resources", icon: "Users", match: 62 },
  { name: "Operations", icon: "Settings", match: 74 },
  { name: "Entrepreneurship", icon: "Rocket", match: 79 },
  { name: "Family Business", icon: "Home", match: 66 },
  { name: "Sales Leadership", icon: "Target", match: 70 },
  { name: "Business Analytics", icon: "BarChart", match: 77 },
  { name: "General Management", icon: "Layout", match: 80 }
]
```

Each card shows:
- Icon + name
- "X% capability match" bar
- "Current" badge if active
- [ Explore ] button

---

## Files to create

```
frontend/src/pages/career/CareerPathway.jsx
frontend/src/components/career/PathwayBanner.jsx
frontend/src/components/career/ProgressTimeline.jsx
frontend/src/components/career/CareerTrackCard.jsx
```

Add route: `/dashboard/career-pathway`
Sidebar: Icon=Compass, Label="Career Pathway"

---

## Definition of Done

- [ ] Page renders with navy pathway banner
- [ ] Timeline shows 5 milestones with correct states
- [ ] 3 recommended activity cards render
- [ ] 10 career track cards render with match percentages
- [ ] Current pathway is highlighted


---
---


# SPEC_11 — Achievements Page

## Meta
- Role: Student
- Route: /dashboard/achievements
- Priority: 7 of 8
- Data: Mock only

---

## Layout

```
[ Page Header ]
[ Stats Bar ]
[ Earned Badges Grid ]
[ Locked Badges Grid ]
[ Milestones Timeline ]
[ Leaderboard (cohort) ]
```

---

## Page Header

```
Achievements
Your milestones, badges, and recognition.
```

---

## Stats Bar

```
[ 🏆 Badges Earned: 7 ]  [ 🔥 Current Streak: 5 days ]
[ ⭐ Total Points: 1,240 ] [ 📊 Cohort Rank: #8 of 45 ]
```

---

## Earned Badges Grid (3 columns)

Each badge card:
```
┌────────────────────┐
│   [ Badge Icon ]   │
│   (gold, large)    │
│                    │
│  Critical Thinker  │
│  Earned Jun 15     │
│                    │
│  Scored 80%+ in    │
│  3 analytical cases│
└────────────────────┘
```

```javascript
const earnedBadges = [
  { id: 1, name: "Critical Thinker", icon: "Brain", earned_at: "Jun 15, 2025", description: "Scored 80%+ in 3 analytical case studies", color: "#C9A227" },
  { id: 2, name: "AI-Aware Learner", icon: "Cpu", earned_at: "Jun 10, 2025", description: "Used AI discussion in 5 case attempts", color: "#0B1D3A" },
  { id: 3, name: "Consistent Performer", icon: "Award", earned_at: "Jun 05, 2025", description: "Completed cases 5 days in a row", color: "#16A34A" },
  { id: 4, name: "First Attempt", icon: "Star", earned_at: "May 28, 2025", description: "Completed your very first case study", color: "#7C3AED" },
  { id: 5, name: "Deep Thinker", icon: "Lightbulb", earned_at: "May 20, 2025", description: "Submitted initial analysis over 400 words", color: "#DC2626" },
  { id: 6, name: "Level Up", icon: "TrendingUp", earned_at: "May 15, 2025", description: "Advanced from Level 2 to Level 3", color: "#059669" }
]
```

---

## Locked Badges Grid (greyed out, 3 columns)

Show with lock icon overlay and "X more to unlock" hint:

```javascript
const lockedBadges = [
  { name: "Strategic Leader", hint: "Score 85%+ in 3 leadership cases" },
  { name: "Entrepreneur", hint: "Complete 5 entrepreneurship cases" },
  { name: "Mentor's Pick", hint: "Receive a commendation from your mentor" },
  { name: "Top Performer", hint: "Reach top 3 in cohort ranking" }
]
```

---

## Milestones Timeline (vertical)

```
✅ Jun 20  Reached Level 3 — Strategic Decision Making
✅ Jun 15  Completed 5 case studies
✅ Jun 10  First 80%+ score
✅ May 28  First case study completed
○  —      Complete 10 case studies (6/10)
○  —      Reach Level 4 (240 pts needed)
```

---

## Leaderboard

Top 10 cohort students (anonymised except self):

```
# | Name         | Score | Level | Cases
1 | Priya M.     |  84   |   4   |   9
2 | Rahul K.     |  81   |   4   |   8
...
8 | You (Sanjay) |  72   |   3   |   5  ← highlighted gold
...
```

---

## Files to create

```
frontend/src/pages/achievements/Achievements.jsx
frontend/src/components/achievements/BadgeCard.jsx
frontend/src/components/achievements/MilestoneTimeline.jsx
frontend/src/components/achievements/Leaderboard.jsx
```

Add route: `/dashboard/achievements`
Sidebar: Icon=Trophy, Label="Achievements"

---

## Definition of Done

- [ ] Stats bar renders with 4 metrics
- [ ] Earned badges grid renders all 6 badges
- [ ] Locked badges show greyed out with lock icon
- [ ] Milestones timeline shows correct done/pending states
- [ ] Leaderboard shows 10 rows with student row highlighted
- [ ] Streak counter shows correctly


---
---


# SPEC_12 — Mentor Support Page

## Meta
- Role: Student
- Route: /dashboard/mentor-support
- Priority: 8 of 8
- Data: Mock only

---

## Layout

```
[ Page Header ]
[ Mentor Profile Card ]
[ Upcoming Session Card ]
[ Mentor Notes & Feedback ]
[ Intervention History ]
[ Schedule Session ]
```

---

## Page Header

```
Mentor Support
Your assigned executive mentor and coaching history.
```

---

## Mentor Profile Card (prominent, navy + gold)

```
┌────────────────────────────────────────────────┐
│  [ Avatar placeholder ]                        │
│                                                │
│  Dr. Ananya Rao                                │
│  ASSIGNED EXECUTIVE MENTOR                     │
│                                                │
│  Department: Strategy & Leadership             │
│  Experience: 18 years in consulting            │
│  Specialisation: Strategic Thinking, Decision  │
│                  Making, Executive Presence    │
│                                                │
│  Students assigned: 18 / 25                   │
│                                                │
│  [ Send Message ]    [ View Profile ]          │
└────────────────────────────────────────────────┘
```

---

## Upcoming Session Card (gold accent border)

```
┌────────────────────────────────────────────────┐
│  📅 UPCOMING SESSION                           │
│                                                │
│  Tomorrow — Friday, June 27, 2025              │
│  11:00 AM – 11:45 AM                          │
│                                                │
│  Agenda (set by mentor):                       │
│  "Focus on improving risk awareness and        │
│   implementation clarity in your defense       │
│   responses."                                  │
│                                                │
│  [ Join Session ] [ Add to Calendar ]          │
└────────────────────────────────────────────────┘
```

---

## Mentor Notes & Feedback

Heading: "Mentor Observations"

3 note cards:
```javascript
const mentorNotes = [
  {
    date: "Jun 20, 2025",
    case: "Q3 Market Entry Strategy",
    note: "Sanjay shows strong structured thinking but needs to develop more robust risk mitigation. His AI utilisation is good — he asks probing questions rather than seeking answers.",
    type: "observation"
  },
  {
    date: "Jun 15, 2025",
    case: "IPL Franchise Turnaround",
    note: "Communication score was lower than expected. Recommend working with the Communication Coach before the next leadership case.",
    type: "recommendation"
  },
  {
    date: "Jun 10, 2025",
    case: "General",
    note: "Excellent improvement in analytical thinking this month. Keep pushing on strategic case complexity.",
    type: "praise"
  }
]
```

Each note has a left border colour:
- observation: navy
- recommendation: gold
- praise: green

---

## Intervention History (simple table)

```
Date       | Type              | Action Taken          | Status
Jun 20     | Capability Alert  | Recommended Level 5   | Done
Jun 15     | Session           | 45-min coaching call  | Done
Jun 01     | Resource Share    | Sent McKinsey article | Done
```

---

## Schedule Session Section

```
REQUEST A SESSION

Reason (dropdown):
[ Case Study Review | Capability Discussion |
  Career Guidance | General Check-in ]

Preferred time:
[ Date picker placeholder ]
[ Time picker placeholder ]

Message to mentor (optional):
[ Textarea ]

[ Send Request ]
```

(Show success toast on submit — no real API needed)

---

## Files to create

```
frontend/src/pages/mentor/MentorSupport.jsx
frontend/src/components/mentor/MentorProfileCard.jsx
frontend/src/components/mentor/UpcomingSession.jsx
frontend/src/components/mentor/MentorNoteCard.jsx
frontend/src/components/mentor/ScheduleSession.jsx
```

Add route: `/dashboard/mentor-support`
Sidebar: Icon=UserCheck, Label="Mentor Support"

---

## Definition of Done

- [ ] Mentor profile card renders with all details
- [ ] Upcoming session card renders with agenda
- [ ] 3 mentor note cards render with correct border colours
- [ ] Intervention history table renders
- [ ] Schedule session form renders
- [ ] Form submit shows success toast
- [ ] "Send Message" and "Join Session" show placeholder alerts
