# SPEC_17: Fix Internal Network Access (Login Fails via LAN IP)

## 1. PURPOSE

The app is being accessed by other machines on the internal network via `http://183.182.87.172:5173` (Vite dev server). The login page loads fine, but submitting login fails with:

```
Access to XMLHttpRequest at 'http://127.0.0.1:8000/api/v1/auth/login' from origin
'http://183.182.87.172:5173' has been blocked by CORS policy: The request client
is not a secure context and the resource is in more-private address space 'loopback'.
```

## 2. ROOT CAUSE

This is not fundamentally a CORS config problem, even though the browser reports it as one.

- The frontend's API base URL is hardcoded/configured to `http://127.0.0.1:8000`.
- `127.0.0.1` always resolves to "this machine." When another computer on the network loads the page from `183.182.87.172:5173` and the frontend tries to call `127.0.0.1:8000`, it's calling **that computer's own loopback address**, not the server. Nothing is listening there, so the request fails.
- Chrome's Private Network Access protection additionally blocks cross-origin requests targeting loopback addresses, which is the specific error surfaced in the console. But even without that browser protection, the request would fail regardless, since it's pointed at the wrong host entirely.
- Separately, the FastAPI/uvicorn backend must be bound to `0.0.0.0` (all interfaces), not `127.0.0.1`, or it won't accept connections from other machines on the network in the first place.

## 3. REQUIRED CHANGES

### 3.1 Frontend — fix API base URL

Locate wherever the API base URL is defined. Likely candidates (check all that exist):
- `.env` / `.env.local` / `.env.production` (look for a var like `VITE_API_BASE_URL` or `VITE_API_URL`)
- A shared API/axios config file (e.g. `src/lib/api.ts`, `src/services/api.ts`, `src/config.ts`)
- Any hardcoded `127.0.0.1` or `localhost` string in `AuthContext.tsx` (confirmed present around line 31, per console trace) or other service/context files

**Action:**
1. Search the entire frontend codebase for `127.0.0.1` and `localhost` references pointing at the backend port (8000).
2. Replace all such references with the server's LAN IP: `http://183.182.87.172:8000`.
3. Prefer centralizing this into a single environment variable (`VITE_API_BASE_URL`) if it isn't already, rather than leaving hardcoded strings scattered across files — reduces future maintenance risk when the IP changes.
4. After changing `.env` values, **restart the Vite dev server** (`npm run dev` / equivalent) — Vite bakes env vars in at server start, so a browser refresh alone will not pick up the change.

### 3.2 Backend — bind uvicorn to all interfaces

Confirm how the FastAPI app is being run. If it's started with:

```
uvicorn main:app --host 127.0.0.1 --port 8000
```

or with no `--host` flag (uvicorn defaults to `127.0.0.1`), change it to:

```
uvicorn main:app --host 0.0.0.0 --port 8000
```

**Action:**
1. Check the uvicorn run command — in a startup script, `Procfile`, `docker-compose.yml`, VS Code launch config, or wherever the dev server is invoked.
2. Update the `--host` flag to `0.0.0.0`.
3. Restart the backend server.
4. If a firewall is active on the host machine, confirm port 8000 (and 5173 for the frontend) is allowed for inbound connections from the LAN.

### 3.3 CORS config — verify, no change expected

The existing CORS middleware in `main.py` already includes `183.182.87.172:5173` in `allow_origins`, so no change should be needed here once 3.1 and 3.2 are done:

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://183.182.87.172:5173", "*", "https://183.182.87.172:5173", "http://183.182.87.172:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

Note: `allow_origins` currently mixes explicit origins with a wildcard `"*"`. This is redundant (the wildcard alone would cover the explicit ones) and, combined with `allow_credentials=True`, is invalid per the CORS spec in some browsers/strict setups (a wildcard origin cannot be combined with credentialed requests). **Recommended cleanup:** remove the `"*"` entry and keep only the explicit origins needed (localhost for local dev + the LAN IP), to avoid inconsistent browser behavior.

## 4. VERIFICATION STEPS (after applying fixes)

1. On the server machine, confirm backend is listening on `0.0.0.0:8000` (e.g. `netstat -an | findstr 8000` on Windows, should show `0.0.0.0:8000` not `127.0.0.1:8000`).
2. From a **different machine** on the network:
   - Load `http://183.182.87.172:5173/login`.
   - Open DevTools → Network tab, submit login.
   - Confirm the request goes to `http://183.182.87.172:8000/api/v1/auth/login` (not `127.0.0.1`).
   - Confirm no CORS error and a successful response.
3. Repeat from at least one more device to confirm it's not machine-specific.

## 5. BUILD ORDER

1. Search codebase for all `127.0.0.1` / `localhost:8000` references in the frontend.
2. Centralize into a single `VITE_API_BASE_URL` env var if not already; set it to `http://183.182.87.172:8000`.
3. Restart Vite dev server.
4. Update uvicorn startup command to `--host 0.0.0.0`.
5. Restart backend server.
6. Clean up `allow_origins` in CORS middleware (remove redundant `"*"` alongside explicit origins, per Section 3.3).
7. Run verification steps in Section 4 from a second machine on the network.

## 6. OUT OF SCOPE

- Exposing the app outside the internal network (no public/internet access, reverse proxy, or HTTPS setup covered here).
- Production deployment configuration — this spec addresses internal-network dev/testing access only.
