# SPEC_09 — AI Coach Page

## Meta
- Role: Student
- Route: /dashboard/ai-coach
- Priority: 5 of 8
- Data: Mock for coach list; real Claude API for chat (optional)

---

## Layout

```
[ Page Header ]
[ Coach Selection Grid ]
[ Active Chat Panel ]
```

---

## Page Header

```
AI Coaches
Your personal development team, available 24/7.
Select a coach to start a focused conversation.
```

---

## Coach Selection Grid

6 coach cards in a 3x2 grid (desktop) / 1 col (mobile):

Each card:
```
┌──────────────────────────────┐
│  [ Icon / Avatar ]           │
│                              │
│  Capability Coach            │
│  Strengthen core thinking    │
│                              │
│  [ Start Session → ]         │
│   or [ Active ] if selected  │
└──────────────────────────────┘
```

Coaches:
```javascript
const coaches = [
  {
    id: "capability",
    name: "Capability Coach",
    tagline: "Strengthen core thinking",
    description: "I help you identify gaps in your analytical, critical, and strategic thinking through targeted exercises and questions.",
    icon: "Brain",
    color: "#0B1D3A",
    system_prompt: "You are a Capability Coach for PCDC. Your role is to help business students strengthen their analytical, critical, and strategic thinking. Ask probing questions, suggest frameworks, and guide reflection. Never give direct answers — guide the student to discover insights themselves. Keep responses under 150 words."
  },
  {
    id: "leadership",
    name: "Leadership Coach",
    tagline: "Lead with impact",
    description: "I work on your leadership presence, team management, influence, and conflict resolution skills.",
    icon: "Users",
    color: "#1D4ED8",
    system_prompt: "You are a Leadership Coach for PCDC. Help students develop leadership skills including team management, influence, and conflict resolution. Use real-world scenarios and Socratic questioning. Keep responses under 150 words."
  },
  {
    id: "communication",
    name: "Communication Coach",
    tagline: "Refine your executive voice",
    description: "I help you communicate with clarity, structure your arguments, and present ideas with executive presence.",
    icon: "MessageSquare",
    color: "#7C3AED",
    system_prompt: "You are a Communication Coach for PCDC. Help students develop clear, structured, and persuasive communication. Focus on executive presence, structured thinking (SCQA, Pyramid Principle), and clarity. Keep responses under 150 words."
  },
  {
    id: "career",
    name: "Career Coach",
    tagline: "Navigate your path",
    description: "I guide your career decisions, help you explore pathways, and align your development to your goals.",
    icon: "Compass",
    color: "#059669",
    system_prompt: "You are a Career Coach for PCDC. Help students navigate career decisions in consulting, finance, marketing, HR, entrepreneurship, and family business. Be practical, ask about their goals, and suggest relevant development actions. Keep responses under 150 words."
  },
  {
    id: "startup",
    name: "Startup Mentor",
    tagline: "Build with conviction",
    description: "I help entrepreneurial thinkers develop business models, assess opportunities, and think like founders.",
    icon: "Rocket",
    color: "#DC2626",
    system_prompt: "You are a Startup Mentor for PCDC. Help students think like entrepreneurs — opportunity recognition, business model design, risk assessment, and resourcefulness. Challenge their assumptions and push them to think beyond constraints. Keep responses under 150 words."
  },
  {
    id: "reflection",
    name: "Reflection Coach",
    tagline: "Deepen self-awareness",
    description: "I guide structured reflection after case studies to help you extract learning and build self-awareness.",
    icon: "BookOpen",
    color: "#D97706",
    system_prompt: "You are a Reflection Coach for PCDC. Help students extract deep learning from their experiences through guided reflection. Use questions like 'What would you do differently?', 'What does this reveal about your assumptions?'. Keep responses under 150 words."
  }
]
```

---

## Active Chat Panel

When a coach is selected, show full chat interface below grid:

```
┌─────────────────────────────────────────────────────┐
│  [ Coach avatar + name ]  Capability Coach          │
│  [ Coach tagline ]        Strengthen core thinking  │
│─────────────────────────────────────────────────────│
│                                                     │
│  [AI] Hello Sanjay! I'm your Capability Coach.     │
│  I've looked at your recent case performance.       │
│  Your Strategic Thinking dropped slightly this      │
│  month. Want to explore why and work on it?         │
│                                                     │
│  [Student] Yes, I think I struggle with...          │
│                                                     │
│  [AI] That's a common challenge. Let me ask         │
│  you this: when you faced the market entry          │
│  case, what framework did you instinctively         │
│  reach for first?                                   │
│                                                     │
│─────────────────────────────────────────────────────│
│  [ Type your message...                  ] [Send →] │
└─────────────────────────────────────────────────────┘

[ Start New Session ]  [ View Session History ]
```

Chat implementation:
- If Claude API key is available in frontend .env:
  use real Claude API with the coach's system_prompt
- If not: use mock responses that rotate from a list

Mock fallback responses per coach — use the 5 mockAIResponses
from SPEC_07 as fallback for all coaches initially.

Opening message per coach (shown on session start):
```javascript
const openingMessages = {
  capability: "Hello! I've reviewed your capability scores. Your Strategic Thinking dipped this month. Shall we explore why and work on strengthening it?",
  leadership: "Hi there! Leadership development is a journey. What leadership challenge are you currently facing — at college, in a project, or in life?",
  communication: "Great to connect! Communication is the multiplier of all other capabilities. What's one situation where you felt your communication fell short?",
  career: "Hello! Your career pathway shows Management Consulting. What excites you most about that path — and what worries you?",
  startup: "Hey! Entrepreneurship starts with seeing problems others ignore. Tell me — what's a problem you've noticed recently that nobody seems to be solving?",
  reflection: "Welcome. Reflection is where the real learning happens. Which of your recent case studies felt most challenging, and why?"
}
```

---

## Session History (simple list below chat)

Show last 3 sessions per coach:
```
Previous Sessions
━━━━━━━━━━━━━━━━
Jun 20, 2025  |  Capability Coach  |  12 messages  |  [ View ]
Jun 15, 2025  |  Career Coach      |  8 messages   |  [ View ]
Jun 10, 2025  |  Reflection Coach  |  15 messages  |  [ View ]
```

(Mock data only — clicking View shows alert "Coming soon")

---

## Files to create

```
frontend/src/pages/coach/AICoach.jsx
frontend/src/components/coach/CoachCard.jsx
frontend/src/components/coach/CoachChat.jsx
```

Add route in App.jsx:
```jsx
<Route path="/dashboard/ai-coach" element={<AICoach />} />
```

Add sidebar link:
- Icon: MessageSquare (Lucide)
- Label: AI Coaches
- Route: /dashboard/ai-coach

---

## Definition of Done

- [ ] Page renders at /dashboard/ai-coach
- [ ] 6 coach cards render with correct icons and descriptions
- [ ] Clicking a coach card opens the chat panel below
- [ ] Selected coach card shows active state (gold border)
- [ ] Opening message appears automatically on coach select
- [ ] Student can type and send messages
- [ ] AI responds (mock or real Claude API)
- [ ] Chat scrolls to latest message
- [ ] New session clears the chat
- [ ] Session history section renders with 3 mock entries
