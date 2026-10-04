# PromptWall — Backend Foundation (Feature 1)

PromptWall is an enterprise security system for LLM applications and AI agents.
Feature 1 establishes the communication architecture and health monitoring foundation:

```
React (Frontend)
  ↓ HTTP / WebSocket
Node.js / Express (Backend - Port 5000)
  ↓ HTTP
Python / FastAPI (Python Engine - Port 8000)
  ↓ HTTP
Node.js
  ↓ HTTP / WebSocket
React
```

## Setup & Running

### 1. Environment Configuration
Copy `.env.example` to `.env` or set environment variables:
```env
NODE_PORT=5000
PYTHON_HOST=127.0.0.1
PYTHON_PORT=8000
FRONTEND_URL=http://localhost:3000
```

### 2. Python Engine (FastAPI)
```bash
cd python-engine
pip install -r requirements.txt
python app.py
```
Python service runs at `http://127.0.0.1:8000`.
Health endpoint: `GET /health`

### 3. Node.js Backend (Express + TypeScript)
```bash
cd backend
npm install
npm run dev
```
Node service runs at `http://localhost:5000`.
Health endpoints:
- Node Health: `GET /api/health`
- Python Health via Node: `GET /api/health/python`

### 4. Frontend (React / Next.js)
```bash
cd frontend
npm install # or bun install
npm run dev
```
Frontend runs at `http://localhost:3000`.

## APIs Created
- `GET /health` (Python FastAPI) — Returns Python service status
- `GET /api/health` (Node.js Express) — Returns Node service status
- `GET /api/health/python` (Node.js Express) — Queries Python engine health and returns status
