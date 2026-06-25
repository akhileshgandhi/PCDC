# PCDC — UI Simplification & Final Design Plan

Moving from the working mockup to clean, final designs. This plan defines how we simplify the UI per the requirements before building the final screens.

## 1. Why the mockup feels complicated
- Too many top-level menu items (Admin has 8) — daily tasks and rarely-used config sit together.
- One very long "Create Case Study" form shows everything at once.
- Dense tables, small text and tight spacing → weak visual hierarchy.
- Repeated, similar-looking drill-down pages.
- Mixed terminology (Domain vs Subject).

## 2. Simplification principles
- **Progressive disclosure** — show only what's needed now; advanced options behind steps/sections.
- **Separate "do" from "configure"** — group setup (Subjects, Capabilities, Marks Scheme) into one Settings area.
- **One clear primary action per screen.**
- **More whitespace, larger type, fewer table columns.**
- **Role-fit density** — Student = guided/minimal; Mentor = focused; Admin = management.
- **One consistent term: "Subject".**

## 3. Simplified navigation
| Role | Now | Proposed |
|---|---|---|
| Admin | 8 items | **5**: Dashboard · Campaigns · Mentors · Students · Settings (Subjects / Capabilities / Marks Scheme as tabs) |
| Mentor | 4 items | **3**: Dashboard · Case Studies · Students (responses inside a case study) |
| Student | 5 items | **3**: Home · My Tasks · My Progress (notifications → bell icon) |

## 4. Key screens, simplified
- **Create Case Study → 3-step wizard:** ① Content → ② Mapping & Questions (4 parameters + questions + time-limit) → ③ Assign (students + date bracket).
- **Scorecard → one focused card:** big mark /10, Q&A /7 + Rapid-Fire /3, status chip, single action (Assign another task); AI detail below.
- **Dashboards → 3 stats + one focus list.**
- **Tables → 4–5 columns max,** generous rows, status as colored chips.

## 5. Design system to lock
- **Color:** white surfaces; one blue primary (#2563EB) + 2 tints; neutral grays; green/amber/red for status only; no gradients except the student hero.
- **Type:** 3 sizes (page title / section / body) + muted caption.
- **Spacing/shape:** 8px grid, 12–14px radius, one soft shadow.
- **Components:** button (primary/ghost), card, table, status chip, stat, form field, chip-select, stepper, score card — defined once, reused.

## 6. How we produce the final designs (recommended path)
- Deliver the **final design as a polished, responsive HTML design system** (shared stylesheet + simplified screens): client-shareable as finished UI and the front-end's starting point.
- Sequence: **lock IA → design 3–4 hero screens for sign-off → roll the style across all screens.**

## 7. Decisions needed before building
1. **Design medium** — polished HTML design system (recommended) · static image mockups · Figma hand-off spec.
2. **Visual style** — clean & spacious (recommended) · compact & data-dense · bold & branded.

## Recommended defaults (if you just want to proceed)
Polished HTML design system, clean & spacious style, simplified navigation as in §3, starting with these **hero screens** for sign-off: **Admin Dashboard, Create Case Study (wizard), Student Home + Assessment, Scorecard.**
