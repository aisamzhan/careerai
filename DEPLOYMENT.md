# Deploy CareerAI (Public Website)

This repo is a simple monorepo:

- `frontend/` React + Vite (static site)
- `backend/` Node.js + Express API (OpenAI calls happen here)

Recommended deployment for a first public release:

- Frontend: Vercel
- Backend: Render (or Railway/Fly). The backend needs long-lived Node + file upload support.

## 1) Put The Project On GitHub

1. Create a new GitHub repository.
2. Upload `frontend/` and `backend/` folders.
3. Make sure you **do not** commit secrets:
   - `backend/.env` is already ignored by `backend/.gitignore`.

## 2) Deploy Backend (Render)

1. Create a new **Web Service** on Render from your GitHub repo.
2. Root directory: `backend`
3. Build command: `npm ci`
4. Start command: `node server.js`
5. Environment variables (Render dashboard):
   - `OPENAI_API_KEY` = your OpenAI key
   - `OPENAI_MODEL` = `gpt-4o-mini`
   - `OPENAI_MAX_OUTPUT_TOKENS` = `240` (optional)
   - `CORS_ORIGIN` = your Vercel URL (set after frontend deploy). Example:
     - `https://careerai-yourname.vercel.app`
6. Deploy and copy your backend public URL, for example:
   - `https://careerai-backend.onrender.com`

Check:
- `GET /api/health` should return `{ ok: true, ... }`

## 3) Deploy Frontend (Vercel)

1. Create a new Vercel project from the same GitHub repo.
2. In Vercel settings:
   - **Root Directory**: `frontend`
   - Build command: `npm run build`
   - Output directory: `dist`
3. Add Environment Variable:
   - `VITE_API_BASE` = your backend URL from Render
4. Deploy.

Notes:
- `frontend/vercel.json` includes a rewrite so React Router pages work on refresh.

## 4) Lock Down CORS (Recommended)

After you have the frontend URL, set:

- `CORS_ORIGIN=https://your-vercel-app.vercel.app`

Then redeploy/restart backend.

## What You Get (MVP)

- Public site users can register/login (stored in browser localStorage).
- Career analysis and AI chat works.
- DOCX resume import works (server-side).

## Known MVP Limitations (Normal For Early Release)

- Users are stored in `localStorage` (not a real database). Accounts do not sync between devices.
- Feedback is stored in `backend/data/feedback.jsonl` and may reset depending on hosting.
- PDF resume import is not supported yet (DOCX only).

