# ThinkForge

AI-powered argumentation assistant and critical thinking tool.

```
thinkforge/
├── frontend/   # React + Vite + Tailwind
└── backend/    # FastAPI
```

## Backend (FastAPI)

```bash
cd thinkforge/backend
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # then fill in ANTHROPIC_API_KEY when ready
uvicorn main:app --reload --port 8000
```

Server runs at <http://localhost:8000>. Try:

```bash
curl http://localhost:8000/health
curl -X POST http://localhost:8000/analyze \
  -H "Content-Type: application/json" \
  -d '{"argument": "Remote work increases productivity."}'
```

Interactive docs: <http://localhost:8000/docs>

## Frontend (React + Vite + Tailwind)

```bash
cd thinkforge/frontend
npm install
npm run dev
```

App runs at <http://localhost:5173>. Vite proxies `/api/*` → `http://localhost:8000/*`,
so the frontend calls `fetch('/api/analyze')` and CORS just works in dev.

## Run both at once

Open two terminals:

```bash
# Terminal 1 — backend
cd thinkforge/backend && source .venv/bin/activate && uvicorn main:app --reload --port 8000

# Terminal 2 — frontend
cd thinkforge/frontend && npm run dev
```
