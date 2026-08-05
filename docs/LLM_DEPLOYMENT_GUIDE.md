# LLM Deployment Guide — PCDC Platform
**Server: Intel i9-14900K | 32 GB DDR5 | RTX 4060 Ti 8 GB | Windows 11 Pro**

---

## Section 1 — Current Hardware: Concurrent User Capacity

### Hard Limits on RTX 4060 Ti 8 GB

Only models that fully fit within 8 GB VRAM can run at acceptable speed.
Any model exceeding 8 GB will spill to RAM, dropping speed to unusable levels (~5 t/s).

| Model | VRAM Used | Fits in 8 GB | Speed (tokens/sec) | One Evaluation Time | Max Comfortable Concurrent Users |
|-------|-----------|-------------|-------------------|--------------------|---------------------------------|
| `qwen2.5:7b-instruct-q4_K_M` | ~4.5 GB | ✅ Yes | ~65–75 t/s | ~6–8 sec | **15–20** |
| `llama3.1:8b-instruct-q4_K_M` | ~5.0 GB | ✅ Yes | ~60–70 t/s | ~7–9 sec | **12–18** |
| `phi3.5-mini-instruct` | ~2.5 GB | ✅ Yes | ~100–120 t/s | ~4–5 sec | **20–25** |
| `qwen2.5:14b-instruct-q4_K_M` | ~8.5 GB | ❌ No | ~5–8 t/s (RAM spill) | ~60–90 sec | **Not viable** |

> **Recommended Model for Current Hardware: `qwen2.5:7b-instruct-q4_K_M`**

**How "Concurrent Users" is calculated:**
- Each evaluation generates ~400–600 output tokens
- At 70 t/s: one evaluation takes ~7 seconds
- With async queue, 15 users get results within 2 minutes
- Beyond 20 simultaneous submissions, queue wait becomes noticeable (3+ minutes)

---

## Section 2 — Output Quality Comparison

### What Changes Between Models

| Capability | `phi3.5-mini` | `qwen2.5:7b` | `qwen2.5:14b` | GPT-4o |
|-----------|--------------|-------------|--------------|--------|
| Structured JSON output (scores, grades) | ⚠ Occasional errors | ✅ Reliable | ✅ Very reliable | ✅ Excellent |
| Per-question feedback depth | Basic 1–2 lines | Good 2–3 lines | Detailed 3–5 lines | Comprehensive |
| Rubric interpretation accuracy | Moderate | Good | Very good | Excellent |
| Improvement suggestions quality | Generic | Relevant | Specific | Highly specific |
| Grade consistency across runs | ⚠ Variable | ✅ Mostly consistent | ✅ Consistent | ✅ Very consistent |
| Handling of weak student answers | Sometimes too lenient | Balanced | Well-calibrated | Well-calibrated |
| Language fluency in feedback | Good | Very good | Excellent | Excellent |
| Hindi/Indic context awareness | Low | Moderate | Good | Good |

### Practical Impact on PCDC Evaluation

**`phi3.5-mini`** (fastest):
- Feedback tends to be short and generic ("Good analysis. Consider adding more details.")
- JSON occasionally malformed — requires retry logic in code
- Acceptable for quick formative feedback, not ideal for graded report cards

**`qwen2.5:7b`** (recommended for current hardware):
- Produces coherent, contextually relevant feedback per question
- Structured JSON output is reliable 90–95% of the time
- Grade distribution is reasonable (doesn't give everyone A)
- Improvement tips are actionable and specific to the case context
- **Best balance of speed and quality on 8 GB VRAM**

**`qwen2.5:14b`** (requires 16 GB VRAM):
- Noticeably deeper analysis, catches nuances in student reasoning
- Near-GPT-4 quality for business case evaluation
- Much more consistent grading across similar-quality answers
- Worth upgrading hardware for if evaluation quality is a priority

---

## Section 3 — Achieving 100 Concurrent Users on Current Hardware

### The Problem

100 students submitting evaluations simultaneously on current hardware:
- Queue depth: 100 jobs
- Processing rate: ~8–10 evaluations/minute (qwen2.5:7b)
- Last student wait time: **10–12 minutes** at peak

This is only acceptable with an **async queue architecture** — students submit and check back.

### Required Software Changes (No Hardware Cost)

**1. Install Redis for Windows**
```powershell
winget install Redis.Redis
# or use Docker Desktop with Redis container
```

**2. Add Celery to backend**
```
pip install celery redis
```

**3. Architecture change**
```
Student submits → FastAPI returns job_id immediately
                ↓
          Redis Queue
                ↓
     Celery Worker (1 worker, sequential)
                ↓
     Ollama qwen2.5:7b evaluation
                ↓
     Save to DB
                ↓
Frontend polls every 10s → shows report card when ready
```

**4. Queue position display on frontend**
- Students see: "Evaluation in progress — Position 3 in queue (~1 min)"
- Auto-refreshes and shows report card when complete

### Required Hardware Upgrades for True 100-User Comfort

| Upgrade | Cost (approx) | New Capacity | Notes |
|---------|--------------|-------------|-------|
| RAM: 32 → 64 GB DDR5 | ₹8,000–12,000 | Reduces system strain | Do first, cheapest |
| Add second RTX 4060 Ti 8 GB (used) | ₹25,000–35,000 | 2× throughput | Needs Ubuntu Server + vLLM |
| Replace with RTX 4070 Ti Super 16 GB | ₹72,000–80,000 | Unlocks 14B model, 90 t/s | Best single-GPU upgrade |
| Switch OS to Ubuntu Server 22.04 | ₹0 | Enables vLLM, frees 6–8 GB RAM | Required for multi-GPU vLLM |
| RTX 4090 24 GB | ₹1,75,000–1,90,000 | Runs 32B model, 120 t/s | Maximum performance option |

### Minimum Viable Upgrade for 100 Users Comfortably

**Option A — Budget (~₹33,000–47,000)**
- RAM to 64 GB + second RTX 4060 Ti (used) + Ubuntu Server
- Result: 2 parallel `qwen2.5:7b` instances via vLLM
- Throughput: ~16–18 evaluations/minute
- Peak 100-user queue: ~6 minutes

**Option B — Performance (~₹80,000–95,000)**
- RAM to 64 GB + RTX 4070 Ti Super 16 GB + Ubuntu Server
- Result: Single GPU running `qwen2.5:14b`, better quality
- Throughput: ~12 evaluations/minute but higher quality output
- Peak 100-user queue: ~8–9 minutes with better report cards

---

## Section 4 — Paid API Option (Cloud LLM)

### When to Use Paid API

- Client does not want to manage local infrastructure
- System needs to scale beyond 100 users
- Evaluation quality must be highest possible
- Zero hardware investment preference

### Recommended Models and Pricing

#### OpenAI

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Quality | Best For |
|-------|----------------------|----------------------|---------|----------|
| `gpt-4o-mini` | $0.15 | $0.60 | Very good | Cost-efficient, high volume |
| `gpt-4o` | $2.50 | $10.00 | Excellent | Premium evaluations |
| `gpt-4.1` | $2.00 | $8.00 | Excellent | Best overall currently |

#### Google Gemini

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Quality | Best For |
|-------|----------------------|----------------------|---------|----------|
| `gemini-2.0-flash` | $0.10 | $0.40 | Very good | Cheapest reliable option |
| `gemini-2.5-pro` | $1.25 | $10.00 | Excellent | Complex reasoning |

#### Anthropic Claude

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Quality | Best For |
|-------|----------------------|----------------------|---------|----------|
| `claude-haiku-3.5` | $0.80 | $4.00 | Good | Mid-range cost |
| `claude-sonnet-4.5` | $3.00 | $15.00 | Excellent | Best feedback quality |

---

### Cost Estimate for PCDC at Scale

**Per evaluation token usage (approx):**
- Input tokens (prompt + case content + answers): ~2,000–3,000 tokens
- Output tokens (evaluation JSON + feedback): ~600–800 tokens

**Cost per evaluation:**

| Model | Input Cost | Output Cost | Total per Evaluation |
|-------|-----------|------------|---------------------|
| `gemini-2.0-flash` | $0.00025 | $0.00028 | **~$0.0005 (~₹0.04)** |
| `gpt-4o-mini` | $0.00038 | $0.00042 | **~$0.0008 (~₹0.07)** |
| `gpt-4.1` | $0.0050 | $0.0056 | **~$0.011 (~₹0.92)** |
| `gpt-4o` | $0.0063 | $0.0070 | **~$0.013 (~₹1.09)** |
| `claude-sonnet-4.5` | $0.0075 | $0.0105 | **~$0.018 (~₹1.50)** |

**Monthly cost at different usage volumes:**

| Students/Month | Evaluations/Month | `gemini-flash` | `gpt-4o-mini` | `gpt-4o` |
|---------------|------------------|---------------|--------------|---------|
| 100 | 300 | ~₹12 | ~₹21 | ~₹327 |
| 500 | 1,500 | ~₹60 | ~₹105 | ~₹1,635 |
| 1,000 | 3,000 | ~₹120 | ~₹210 | ~₹3,270 |
| 5,000 | 15,000 | ~₹600 | ~₹1,050 | ~₹16,350 |

> Assumes ~3 evaluations per student per month (3 case attempts)

---

### Recommended Paid API Strategy

**For PCDC at current/near-term scale:**
Use **`gemini-2.0-flash`** (Google AI Studio / Vertex AI)
- Near-zero cost even at 5,000 students/month
- OpenAI-compatible API — one line change in backend
- Very reliable structured JSON output
- Google AI Studio free tier: 1,500 requests/day free

**For premium quality (if client is willing to pay):**
Use **`gpt-4o-mini`** as default with **`gpt-4o`** or **`gpt-4.1`** as fallback for high-stakes evaluations

---

## Section 5 — Decision Summary

| Scenario | Recommended Approach | Cost |
|----------|---------------------|------|
| ≤ 20 concurrent, current hardware | Ollama + qwen2.5:7b + Windows | ₹0 |
| 20–50 concurrent, current hardware | Above + async Redis/Celery queue | ₹0 software only |
| 100 concurrent, budget upgrade | 64 GB RAM + second 4060 Ti + Ubuntu | ₹33–47K |
| 100 concurrent, quality upgrade | 64 GB RAM + 4070 Ti Super + Ubuntu | ₹80–95K |
| Any scale, no hardware management | Gemini 2.0 Flash API | ₹120–600/month |
| Premium quality, any scale | GPT-4o-mini API | ₹210–1,050/month |

---

*Document prepared: August 2026 | Prices are approximate and subject to change*
