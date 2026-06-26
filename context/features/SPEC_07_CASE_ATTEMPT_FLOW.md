# SPEC_07 — Case Attempt Flow (6 Screens)

## Meta
- Role: Student
- Route: /dashboard/case-studies/:id/attempt
- Priority: 3 of 8
- Data: Mock only (AI chat can use real Claude API or mock responses)

---

## Overview

A single page that renders 6 sequential screens. Only one screen
is visible at a time. Students cannot go back to a previous screen.
Progress bar at top shows current stage.

```
Stage:  1          2          3          4          5          6
     Briefing  Analysis  AI Chat  Solution  Defense  Evaluation
        ●─────────○─────────○────────○─────────○─────────○
```

---

## Progress Bar (persistent top bar across all screens)

```
[ PCDC logo ]  Q3 Market Entry Strategy  [ Stage 3 of 6: AI Discussion ]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
●────────●────────●────────○─────────○──────────○
Briefing  Analysis  AI Chat  Solution  Defense  Evaluation

[ Clock: 23:45 remaining ]
```

Timer counts up (elapsed time), not down.

---

## Screen 1: Briefing

Layout: Centered, max width 800px

```
ROLE ASSIGNED
━━━━━━━━━━━━━━━━━━━━━━━━━━

🎭 You are the Strategy Head
   ABC Electronics

THE SITUATION
━━━━━━━━━━━━━━━━━━━━━━━━━━
[ Full case description text ]
[ Financial summary table: mock data ]
[ Customer feedback snippets ]
[ Competitor overview ]

YOUR OBJECTIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━
Develop a comprehensive market re-entry plan for
Southeast Asia. You have 45 minutes.

[ I have read the case — Begin Analysis → ]
(gold button, bottom right)
```

---

## Screen 2: Initial Analysis (Think First)

Layout: Centered, max width 720px

```
THINK FIRST
━━━━━━━━━━━━━━━━━━━━━━━━━━
Before accessing AI assistance, submit your initial
analysis. Minimum 200 words required.

Answer these questions in your analysis:
• What do you think is happening?
• What are the possible causes?
• What assumptions are you making?
• What information is missing?
• What would be your tentative solution?

┌──────────────────────────────────────────────────┐
│                                                  │
│  [ Large textarea, min 10 rows ]                 │
│                                                  │
│                                                  │
└──────────────────────────────────────────────────┘

Word count: 47 / 200 minimum
[ Progress bar — fills gold as words increase ]

[ Submit Analysis & Unlock AI → ]
Button disabled (grey) until word count >= 200
Button enabled (gold) when word count >= 200

Note below button:
"Once submitted, you cannot edit your analysis.
 AI access will be unlocked immediately."
```

Word counter logic:
- Count words in textarea in real time
- Show count as: "X / 200 minimum"
- When >= 200: counter turns green, button enables
- When < 200: counter stays red/orange, button disabled

---

## Screen 3: AI Discussion

Layout: Two column

```
Left (45%) — Case Reference Panel:
┌─────────────────────────┐
│ CASE REFERENCE          │
│ (collapsible)           │
│                         │
│ [ Case summary text ]   │
│ [ Key data points ]     │
│ [ Your analysis ]       │
│ (read-only)             │
└─────────────────────────┘

Right (55%) — AI Chat:
┌─────────────────────────┐
│ AI DISCUSSION           │
│                         │
│ [AI] Hello Sanjay. I've │
│ reviewed your analysis. │
│ You've identified the   │
│ revenue decline but     │
│ haven't considered the  │
│ distribution gap.       │
│ What are your thoughts? │
│                         │
│ [Student] I think the   │
│ main issue is...        │
│                         │
│ [AI] Interesting. But   │
│ have you considered...  │
│                         │
└─────────────────────────┘
[ Type your message... ] [Send]

[ I'm ready to submit my solution → ]
(bottom of page, gold button)
```

Mock AI responses — cycle through these:
```javascript
const mockAIResponses = [
  "Interesting perspective. Have you considered how the shift to premium products affects your distribution strategy? What data would you need to validate this?",
  "You're on the right track. Let me push you further — if you fix distribution alone, how does that address the pricing gap with Chinese OEMs?",
  "Good thinking. Now consider this: what happens if the competitor responds by dropping prices by 15%? How does your strategy hold up?",
  "I'd challenge your assumption about customer loyalty here. What evidence do you have that brand recall is still strong in these markets?",
  "Solid analysis. What's your recommended first move in the next 90 days, and why that over alternatives?"
]
```

---

## Screen 4: Solution Submission

Layout: Centered, max width 720px

```
YOUR FINAL RECOMMENDATION
━━━━━━━━━━━━━━━━━━━━━━━━━

Structure your solution using the sections below.
Be specific and justify your recommendations.

RECOMMENDATION
┌──────────────────────────────────────────────────┐
│ What is your primary recommendation?             │
└──────────────────────────────────────────────────┘

REASONING
┌──────────────────────────────────────────────────┐
│ Why this approach over alternatives?             │
└──────────────────────────────────────────────────┘

IMPLEMENTATION PLAN
┌──────────────────────────────────────────────────┐
│ How would you execute this? Key steps + timeline │
└──────────────────────────────────────────────────┘

RISKS & MITIGATIONS
┌──────────────────────────────────────────────────┐
│ What could go wrong and how would you handle it? │
└──────────────────────────────────────────────────┘

[ Submit Solution → ]
(gold button — requires all 4 sections non-empty)
```

---

## Screen 5: Defense

Layout: Centered, max width 720px, one question at a time

```
DEFEND YOUR SOLUTION
━━━━━━━━━━━━━━━━━━━━━━━━━
The AI will now challenge your recommendation.
Answer each question before the next one appears.

Question 1 of 3:
━━━━━━━━━━━━━━━━━
"Your strategy assumes brand recall is high.
 But recent surveys show only 34% of target
 customers recognise the ABC brand. How does
 this change your approach?"

┌──────────────────────────────────────────────────┐
│ [ Answer textarea ]                              │
└──────────────────────────────────────────────────┘

[ Submit Answer → Next Question ]
```

After all 3 answers submitted:
```
[ Submit Defense & Get Evaluation → ]
```

Mock defense questions:
```javascript
const mockDefenseQuestions = [
  "Your strategy assumes brand recall is high. But recent surveys show only 34% recognise the ABC brand. How does this change your approach?",
  "If the board cuts your budget by 40%, which elements of your plan do you preserve and which do you cut first?",
  "A competitor just announced a direct entry into your target market with a product priced 20% lower. How do you respond?"
]
```

---

## Screen 6: Evaluation Results

Layout: Centered, max width 900px

```
EVALUATION COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OVERALL SCORE
[ Large score display: 76 / 100 ]
[ "Good" label in green ]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CAPABILITY BREAKDOWN
[ 6-spoke radar/spider chart ]

Thinking Depth    ████████░░  82
Logic             ███████░░░  74
Creativity        ██████░░░░  63
Practicality      ████████░░  79
Risk Awareness    ██████░░░░  65
Reflection        ███████░░░  71

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[ Strengths card — green border ]
STRENGTHS
"Strong structured thinking and clear prioritisation
 of the distribution problem. Good use of frameworks."

[ Weaknesses card — orange border ]
AREAS TO IMPROVE
"Risk mitigation was surface-level. Competitor
 response scenarios were not fully explored."

[ Blind Spots card — red border ]
BLIND SPOTS
"Brand perception data was available but not
 incorporated into the strategy."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

NEXT RECOMMENDED CASE
┌──────────────────────────────────────────────────┐
│ 📋 India-China Border Tensions: Economic Impact  │
│    Geopolitics · Level 5 · 90 min                │
│    [ View Case → ]                               │
└──────────────────────────────────────────────────┘

[ Back to My Case Studies ]   [ Share with Mentor ]
```

Score label mapping:
- 90-100: "Excellent" (green)
- 75-89: "Good" (green)
- 60-74: "Improving" (gold)
- Below 60: "Needs Work" (orange)

Mock evaluation data:
```javascript
const mockEvaluation = {
  total_score: 76,
  thinking_depth: 82,
  logic_score: 74,
  creativity_score: 63,
  practicality_score: 79,
  risk_awareness_score: 65,
  reflection_score: 71,
  strengths: "Strong structured thinking and clear prioritisation of the distribution problem. Good use of strategic frameworks under time pressure.",
  weaknesses: "Risk mitigation was surface-level. Competitor response scenarios were identified but not fully developed into concrete contingency plans.",
  blind_spots: "Brand perception data was available in the brief but was not meaningfully incorporated into the final recommendation.",
  next_case: {
    id: 2,
    title: "India-China Border Tensions: Economic Impact",
    domain: "Geopolitics",
    difficulty: 5,
    estimated_minutes: 90
  }
}
```

---

## State Management

Use React useState to track:
```javascript
const [currentScreen, setCurrentScreen] = useState(1) // 1-6
const [analysisText, setAnalysisText] = useState("")
const [wordCount, setWordCount] = useState(0)
const [chatMessages, setChatMessages] = useState([
  { role: "ai", text: "I've reviewed your initial analysis. You've correctly identified the revenue decline but I'd like to explore your thinking on distribution. What do you see as the root cause?" }
])
const [solution, setSolution] = useState({
  recommendation: "", reasoning: "",
  implementation: "", risks: ""
})
const [defenseAnswers, setDefenseAnswers] = useState([])
const [currentDefenseQ, setCurrentDefenseQ] = useState(0)
const [elapsedTime, setElapsedTime] = useState(0) // seconds
```

---

## Files to create

```
frontend/src/pages/cases/CaseAttempt.jsx
frontend/src/components/attempt/ProgressBar.jsx
frontend/src/components/attempt/Screen1Briefing.jsx
frontend/src/components/attempt/Screen2Analysis.jsx
frontend/src/components/attempt/Screen3AIChat.jsx
frontend/src/components/attempt/Screen4Solution.jsx
frontend/src/components/attempt/Screen5Defense.jsx
frontend/src/components/attempt/Screen6Evaluation.jsx
frontend/src/components/attempt/RadarChart.jsx
```

Add route in App.jsx:
```jsx
<Route path="/dashboard/case-studies/:id/attempt"
       element={<CaseAttempt />} />
```

---

## Definition of Done

- [ ] All 6 screens render without errors
- [ ] Progress bar shows correct stage on each screen
- [ ] Timer counts up from 0:00
- [ ] Screen 2 word counter works and enables button at 200 words
- [ ] Screen 3 mock AI chat sends/receives messages
- [ ] Screen 4 requires all 4 sections before enabling submit
- [ ] Screen 5 shows one question at a time
- [ ] Screen 6 radar chart renders with mock scores
- [ ] Screen 6 score label matches score range
- [ ] "Back to My Case Studies" link works
- [ ] Cannot navigate backwards between screens
