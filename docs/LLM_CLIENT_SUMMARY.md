# AI Engine Options for PCDC Platform

### Simple Guide for Client Decision Making

---

## What is the AI doing in this system?

When a student completes a case study, the AI reads their answers, compares them with the correct answer and marking rubric, and generates a report card with scores, feedback, and improvement suggestions.

**The quality of this report card depends entirely on which AI model is used.**

---

## Think of it like this

Imagine hiring a teacher to evaluate student answers.

| Option                           | Equivalent to                                | Quality                                   |
| -------------------------------- | -------------------------------------------- | ----------------------------------------- |
| Small local AI (Qwen 7B)         | A junior intern with limited knowledge       | Basic, often generic feedback             |
| Medium local AI (Qwen 14B)       | A trained teacher                            | Good, relevant feedback                   |
| Premium AI API (GPT-4o / Gemini) | An expert professor with years of experience | Detailed, specific, high-quality feedback |

---

## Option 1 — Run AI on Your Own Server (Local)

The server you have has a graphics card (GPU) with 8 GB memory. This limits which AI models can run on it.

### The only model that fits: Qwen 7B

**Important: Even with Qwen 7B, the output quality will NOT be good enough for academic use.**

Here is what you will actually see in student report cards with Qwen 7B:

> *"Good analysis. The student has identified the key issues. Consider exploring more solutions."*

- Feedback is short and generic — same type of feedback for every student
- Marks awarded are often inconsistent — a weak answer and a strong answer may get similar scores
- The AI sometimes misreads the rubric and gives wrong marks
- Improvement suggestions are vague — not helpful to the student
- Structured scoring (marks per question) occasionally breaks or gives incorrect numbers
- Students will quickly notice the feedback feels copy-pasted and loses trust in the system

**This is not a software problem — it is a hardware limitation. The model is simply not powerful enough for the complexity of business case evaluation.**

### How many students can use it at one time?

Even with this limited quality:

| Students submitting at the same time | Wait time for report card |
| ------------------------------------ | ------------------------- |
| Up to 15 students                    | ~1–2 minutes             |
| 15 to 50 students                    | ~3–8 minutes             |
| 50 to 100 students                   | ~10–15 minutes           |

Students would need to wait and refresh — the report card does not appear instantly.

---

## Option 2 — Use a Paid AI Service (Cloud API)

Instead of running AI on your server, you send the student's answers to a world-class AI service over the internet and get back a high-quality evaluation.

**This is exactly how tools like ChatGPT, Google Gemini, and Claude work.**

### What the report card looks like with a paid AI (GPT-4o or Gemini):

> *"In Question 2, the student correctly identified that declining profits are linked to rising input costs, however the analysis does not account for the impact of competitor pricing. The recommended action to cut marketing spend is risky given the current market share situation — a more balanced approach would be to first analyse customer retention data before reducing spend. Score: 6/10."*

- Every student gets personalised, specific feedback
- Marks are consistent and match the rubric accurately
- Improvement suggestions are practical and case-specific
- Students trust and learn from the evaluation

### Cost — Much less than expected

|  |  |  |
| - | - | - |

| Number of Students Using the System Per Month | Assumption (Average Monthly Usage)                                              |  Monthly Cost (Gemini Flash*) |     Monthly Cost (GPT-4o mini) |
| --------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------: | -----------------------------: |
| **100 students**                        | 12–18 AI evaluations/student + Faculty AI case generation                      |      **₹150 – ₹220** |       **₹200 – ₹300** |
| **500 students**                        | 12–18 AI evaluations/student + Faculty AI case generation                      |    **₹750 – ₹1,100** |   **₹1,000 – ₹1,500** |
| **1,000 students**                      | 12–18 AI evaluations/student + Faculty AI case generation                      |  **₹1,500 – ₹2,200** |   **₹2,000 – ₹3,000** |
| **3,000 students**                      | 12–18 AI evaluations/student + 200–500 AI-generated cases/month by 50 faculty |  **₹4,500 – ₹6,600** |   **₹6,000 – ₹9,000** |
| **5,000 students**                      | 12–18 AI evaluations/student + Scaled faculty AI case generation               | **₹7,500 – ₹11,000** | **₹10,000 – ₹15,000** |

> These costs are per month, for all students combined — not per student.

---

## Side-by-Side Comparison

|                                        | Local AI (Qwen 7B on your server)      | Paid API (Gemini / GPT-4o)           |
| -------------------------------------- | -------------------------------------- | ------------------------------------ |
| **Cost**                         | ₹0 per month (hardware already owned) | shared above                         |
| **Feedback quality**             | ❌ Generic, often unreliable           | ✅ Specific, accurate, professional  |
| **Marks accuracy**               | ❌ Inconsistent                        | ✅ Consistent with rubric            |
| **Student trust**                | ❌ Low — feedback feels automated     | ✅ High — feels like a real teacher |
| **Speed**                        | ⚠ 2–15 min wait per evaluation       | ✅ Under 30 seconds                  |
| **Works without internet**       | ✅ Yes                                 | ❌ Requires internet connection      |
| **Handles 100 students at once** | ⚠ Long queue, degraded experience     | ✅ No queue, instant results         |
| **Setup complexity**             | High — needs ongoing maintenance      | Low — just an API key               |

---

## Our Recommendation

**Use the paid API — specifically Google Gemini 2.0 Flash.**

Reasons:

- Quality is dramatically better — students receive genuinely useful feedback
- No queue, no waiting, no hardware maintenance
- If internet goes down temporarily, a fallback to local AI can be added later
- Google offers 1,500 free evaluations per day — enough for testing and low-volume use at zero cost

**The local AI option saves money on paper but delivers a product that students will not find valuable. For an education platform, evaluation quality is the core of the product — it should not be compromised.**

---

## If Internet Access is a Strict Requirement

If the system must work fully offline (no internet at all), then the minimum hardware upgrade needed to get acceptable quality is:

- Replace the current graphics card (RTX 4060 Ti 8 GB) with RTX 4070 Ti Super (16 GB VRAM)
- Estimated cost: ₹72,000 – ₹80,000
- This allows running Qwen 14B — a significantly better model
- Quality will still not match GPT-4o but will be usable for academic evaluation

---

*Prepared for client review — August 2026*
