"""Static AI stub behind a simple provider interface.

The real system swaps this for Llama/Gemini without changing the routers or UI:
just implement the same three functions. For now everything is canned/heuristic
so the whole assessment loop works end-to-end with no API key.
"""
import hashlib
import random

RF_BANK = {
    "Finance": ["What is the single biggest risk in your plan?", "How would you fund it?", "Which metric would you watch weekly?"],
    "Marketing": ["Who is your primary target segment and why?", "How do you measure early traction?", "State your differentiation in one line."],
    "HR": ["What leading indicator would you track?", "How do you get manager buy-in?", "What would you pilot first?"],
    "Operations": ["Where is the critical bottleneck?", "How do you de-risk it?", "What is your fallback plan?"],
}
GENERIC_RF = ["What assumption is your plan most sensitive to?", "What would you do differently with half the budget?", "How would you measure success in 90 days?"]
STRENGTHS = ["Clear problem framing", "Good use of evidence", "Structured, logical reasoning",
             "Practical, sequenced plan", "Strong awareness of trade-offs", "Considered stakeholder impact"]
IMPROVE = ["Quantify the expected impact", "Make assumptions explicit", "Address downside risks",
           "Prioritise the recommendations", "Tighten the summary", "Add metrics to track"]
SUGGEST = ["Lead with a one-line recommendation before the detail.",
           "Tie each action to a measurable outcome and an owner.",
           "Stress-test the plan against a worst-case scenario.",
           "Separate quick wins from structural changes."]


def _rng(*parts) -> random.Random:
    seed = int(hashlib.md5("|".join(str(p) for p in parts).encode()).hexdigest(), 16) % (2**32)
    return random.Random(seed)


def _answer_quality(answers: list[dict]) -> float:
    """0..1 heuristic: rewards substantive, multi-point answers (word count, capped)."""
    if not answers:
        return 0.0
    scores = []
    for a in answers:
        words = len((a.get("a") or "").split())
        scores.append(min(words / 45.0, 1.0))   # ~45 words ≈ full marks for an answer
    return sum(scores) / len(scores)


def rapid_fire(department: str, answers: list[dict]) -> list[str]:
    """3 probing follow-up questions (canned per department)."""
    return (RF_BANK.get(department) or GENERIC_RF)[:3]


def suggestions(answers: list[dict]) -> list[str]:
    rng = _rng("sg", len(answers), _answer_quality(answers))
    return rng.sample(SUGGEST, 2)


def evaluate(department: str, title: str, capability_names: list[str],
             answers: list[dict], rapidfire: list[dict], revised: bool) -> dict:
    """Produce score (0..100), per-capability scores and a report card."""
    rng = _rng(title, department, len(answers))
    base = _answer_quality(answers) * 70 + 15          # 15..85 from content depth
    rf_bonus = _answer_quality(rapidfire) * 12          # up to +12 from rapid-fire
    revise_bonus = 4 if revised else 0
    score = int(max(0, min(100, base + rf_bonus + revise_bonus + rng.randint(-5, 5))))

    cap_scores = {c: int(max(0, min(100, score + rng.randint(-8, 8)))) for c in capability_names}
    result = "Pass" if score >= 75 else "Needs improvement" if score >= 70 else "Below threshold"

    rf_report = []
    for rf in rapidfire:
        q = min(len((rf.get("a") or "").split()) / 20.0, 1.0) + rng.random() * 0.3
        verdict = "Solid" if q > 0.7 else "Partial" if q > 0.35 else "Weak"
        rf_report.append({"q": rf.get("q"), "a": rf.get("a"), "assessment": verdict})

    return {
        "score": score,
        "capability_scores": cap_scores,
        "result": result,
        "report": {
            "result": result,
            "summary": (f"A {'strong' if score >= 80 else 'competent' if score >= 70 else 'limited'} "
                        f"response to '{title}'. "
                        f"{'Recommendation is well-justified.' if score >= 75 else 'Add more depth and evidence.'}"),
            "strengths": rng.sample(STRENGTHS, 2 if score < 75 else 3),
            "improvements": rng.sample(IMPROVE, 1 if score >= 80 else 3),
            "rapid_fire": rf_report,
            "suggestions": rng.sample(SUGGEST, 2),
        },
    }
