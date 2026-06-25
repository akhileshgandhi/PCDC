# PCDC — AI Costing & Plan (UAT → Go-Live)

> Covers the AI/LLM cost model for the AI-evaluation engine: a **free plan for UAT** (with non-expiring fallbacks), a **cost-optimal go-live approach** for live data, and **average monthly cost** at expected student volumes.
> 🔶 Non-Claude prices and free-tier limits change frequently — verify before committing. Claude prices are current as of this draft.

## 1. How the AI cost is driven
The cost scales **per student, per attempt** — every student uses the AI, and a launched campaign creates **concurrency spikes** (a class doing it together). Each attempt = **3 LLM calls**:
1. Analyse answer → generate 3–4 rapid-fire questions
2. Grade rapid-fire → suggestions
3. Final scoring (6 dimensions → marks /10)

**Tokens per attempt:** ~**7,000 input + ~1,300 output** (the case study + rubric dominate input — and they are **identical for every student in a campaign**, which is the main saving via caching).

## 2. Free plan for UAT (tokens that don't expire)

**Principle:** use **perpetually-free tiers** (rate-limited but always free), **not** promotional trial credits (e.g. a $5 OpenAI/Anthropic credit that **expires** in 30–90 days). Perpetual free tiers never "expire" — they reset their limits daily.

| Provider (free tier) | Model | Nature | Good for UAT? |
|---|---|---|---|
| **Groq** (free) | **Llama 3.3 70B** (your mandated model) | Always-free, per-min/per-day rate limits | ✅ Primary |
| **Google AI Studio / Gemini** (free) | Gemini Flash | Always-free, daily limits | ✅ Secondary |
| **OpenRouter** (free models) | Various incl. Llama | Always-free, daily caps | ✅ Tertiary |
| **Cerebras** (free) | Llama 3.3 | Always-free, fast | ✅ Quaternary |
| OpenAI / Anthropic trial credit | — | **Expires** | ❌ Avoid for UAT |

**Fallback chain so UAT never runs dry:**
```
Groq (Llama 3.3 70B)  → on daily-limit/429 →
Gemini Flash          → on limit →
OpenRouter free       → on limit →
Cerebras free         → on limit →
Queue + retry (and, if all exhausted, mentor manual review)
```
Because each provider's free tier **resets daily** and the chain rotates across providers, **tokens effectively never expire and UAT is never blocked**.

**UAT operating notes:** free tiers can't sustain a full class at once — run UAT in **small batches** (a handful of students), and lean on the **Think-First gate** (students type for minutes before the AI engages), which naturally staggers calls under the rate limits.

## 3. Go-live: cost-optimal approach for live data
At production volume, **concurrency and per-student cost** both matter. The cost-optimal design:

1. **Prompt-cache the campaign's case study + rubric** — identical for every student, so after the first student it's read at ~**0.1× cost** → up to **80–90% off input tokens**.
2. **Tier the models by task:**
   - Rapid-fire generation + suggestions (high volume, forgiving) → **Llama 3.3 70B** (Groq/Cerebras) or **Gemini Flash**.
   - Final scoring (affects marks) → a **stronger model** (Llama 3.3 405B, Claude Sonnet 4.6, or GPT-4o).
3. **Batch the scoring** — it isn't real-time (marks shown after), so route it through a **batch lane (~50% cheaper)**.
4. **Queue + global concurrency cap** sized to the provider's rate limits → no 429 storms when a class hits together.
5. **Fallback chain** (paid primary → secondary → **mentor manual review**) so a peak or outage degrades gracefully, never failing a student.
6. **Cap output tokens + structured JSON** — scoring output is small; no waste, no re-tries.

> **Self-hosting Llama 3.3?** A dedicated GPU (A100/H100) costs ~$700–1,500/month running 24/7 — only cheaper than API at **very high, steady** volume. At the volumes below, **hosted API is cheaper and simpler**. Revisit only if monthly attempts grow large.

## 4. Average monthly cost (by student volume)

**Assumptions** (🔶 adjust to actuals):
- Attempts per student per month: **~10**
- Tokens/attempt: ~7k in + 1.3k out, **with caching of the shared case study**
- Three approaches (per-attempt cost after caching):

| Approach | Models | ~Cost / attempt 🔶 |
|---|---|---|
| **Budget** | Gemini Flash for all 3 calls | ~$0.0015 |
| **Cost-optimal (recommended)** | Llama 3.3 70B for all 3 calls | ~$0.005 |
| **Quality blend** | Flash (gen) + Sonnet 4.6 (scoring), cached | ~$0.016 |

**Monthly cost = active students × 10 attempts × cost/attempt:**

| Active students / month | Budget | Cost-optimal | Quality blend |
|---|---|---|---|
| 1,000 | ~$15 | ~$50 | ~$160 |
| 2,500 | ~$38 | ~$125 | ~$400 |
| **4,000 (full cohort)** | **~$60** | **~$200** | **~$640** |

**Recommended planning figure:** for the full **4,000-student cohort**, budget **~$200–$650 / month** depending on the scoring-quality tier — with **~$200/month (Llama 3.3 70B + caching + batching)** as the cost-optimal target, and the quality blend (~$640) if you want a premium model on the final mark.

## 5. Notes & risks
- Prices/limits 🔶 are approximate — confirm on each provider's current pricing page before signing off.
- Caching savings assume students in a campaign share one case study (true in the current design).
- Concurrency, not cost, is the binding constraint during launches — size paid rate limits to **peak concurrent students**, not the monthly total.
- Keep the **mentor-review fallback** as the final safety net so AI cost/limits never block a student's progress.
