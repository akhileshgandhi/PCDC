# Deploying PCDC to Vercel (frontend + FastAPI backend, single project)

`vercel.json` at the repo root builds the Vite frontend as static files and the
FastAPI app (`backend/main.py`) as a Python serverless function. Requests to
`/api/*` (and `/capability`, `/ai`, `/notification`) hit the backend; everything
else serves the single-page app.

## 1. Import the repo
1. Vercel → **Add New… → Project** → import `akhileshgandhi/PCDC`.
2. Production branch: **`vercel_test`** (or merge to main first).
3. Framework preset: **Other**. Root directory: **`./`** (leave default — Vercel reads `vercel.json`).

## 2. Environment variables (Project → Settings → Environment Variables)

**Backend (runtime):**
| Key | Value |
|-----|-------|
| `DATABASE_URL` | your Neon **pooled** connection string (host ending in `-pooler…`) |
| `SECRET_KEY` | a long random string |
| `ALGORITHM` | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `480` |
| `AI_PROVIDER` | `gemini` |
| `GEMINI_API_KEY` | your Gemini key |
| `GEMINI_MODEL` | `gemini-flash-latest` |
| `GOOGLE_CLIENT_ID` | your Google OAuth client ID |
| `LLM_TIMEOUT_SECONDS` | `50` (keep AI calls under the function limit) |

**Frontend (build-time — Vite inlines these):**
| Key | Value |
|-----|-------|
| `VITE_API_URL` | `/api/v1` (same-origin — no CORS needed) |
| `VITE_GOOGLE_CLIENT_ID` | same Google client ID |

## 3. Google OAuth
Add your Vercel URL (e.g. `https://pcdc.vercel.app`) to **Authorized JavaScript
origins** in Google Cloud Console for this client ID.

## 4. Deploy
Click **Deploy**. The frontend builds to `frontend/dist`; the backend runs as a
serverless function.

---

## ⚠️ Serverless limitations (important)
Vercel functions are short-lived and stateless. For this app that means:

1. **Long AI calls may time out.** The evaluation and rapid-fire generation call
   Gemini (a "thinking" model) and can take 10–60s. Vercel **Hobby** caps
   function duration (10–60s); if a call exceeds it the request fails. For
   reliable AI, use **Vercel Pro** (Fluid Compute, up to 300s) or host the
   backend on a real server (Render/Railway) and point `VITE_API_URL` at it.

2. **Faculty "Generate Full Case (AI)" won't work.** It uses an in-memory
   background job that the client polls — serverless instances don't share
   memory, so the poll never resolves. Manual case entry and the synchronous
   "Generate Questions with AI" still work.

3. **Use the Neon POOLED connection string.** Each cold start opens new DB
   connections; the pooled endpoint prevents exhausting Neon's connection limit.

If AI reliability matters, the robust setup is: **frontend on Vercel + backend
on Render/Railway + DB on Neon**. Everything-on-Vercel works for a demo of the
non-AI flows and light AI usage on Pro.
