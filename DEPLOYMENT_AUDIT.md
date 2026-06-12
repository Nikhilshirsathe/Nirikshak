# Nirikshak AI — Production Audit & Deployment Guide

## Phase 1: Project Audit

### Architecture Overview
- **Frontend**: Next.js 14 + React 18 + TypeScript + Tailwind CSS + Supabase Auth
- **Backend**: FastAPI + Python 3.11+ + SHAP + XGBoost + Groq LLM
- **ML Models**: XGBoost classifier with 124 features, stored as .pkl files
- **Auth**: Supabase JWT verification
- **Deployment Target**: Railway (backend) + Vercel (frontend)

### Current File Structure
```
NIRIKSHAK-AI/
├── backend/
│   ├── .env                    ⚠️ SECRETS EXPOSED
│   ├── requirements.txt        ⚠️ MISSING groq dependency
│   └── app/
│       ├── main.py             ⚠️ CORS hardcoded to localhost
│       ├── auth.py
│       ├── state.py            ⚠️ In-memory sessions
│       ├── database/
│       ├── routes/
│       │   ├── upload.py       ⚠️ Relative upload path
│       │   ├── prediction.py
│       │   ├── explain.py
│       │   ├── alerts.py       ⚠️ Hardcoded demo data
│       │   ├── reports.py
│       │   ├── account.py
│       │   ├── session.py
│       │   └── chat.py
│       └── services/
│           ├── predictor.py    ⚠️ Relative model path
│           ├── shap_service.py
│           ├── groq_service.py ⚠️ Missing in requirements.txt
│           ├── report_service.py
│           └── feature_engineering.py
├── frontend/
│   ├── package.json
│   ├── next.config.js          ⚠️ Missing env vars config
│   ├── tailwind.config.ts
│   └── src/
│       ├── app/
│       │   ├── layout.tsx
│       │   └── page.tsx
│       ├── lib/supabase.ts     ⚠️ Missing env vars
│       ├── services/api.ts
│       ├── utils/types.ts
│       ├── components/
│       └── pages/
├── Models/                     ⚠️ NOT IN GIT (.gitignore excludes .pkl)
│   ├── nirikshak_ai_model.pkl
│   ├── preprocessor.pkl
│   ├── feature_list.pkl
│   ├── threshold.pkl
│   └── feature_importance.csv
├── data/
│   ├── uploads/
│   └── processed/
├── ml/
│   ├── models/
│   ├── notebooks/
│   ├── training/
│   └── explainability/
└── .gitignore                  ⚠️ Excludes .pkl model files
```

---

## Phase 2: Identified Issues

### 🔴 CRITICAL (Deployment Will Fail)

| # | Issue | File | Impact |
|---|-------|------|--------|
| 1 | CORS hardcoded to `http://localhost:3000` | main.py:13 | Frontend on Vercel will be blocked by CORS |
| 2 | Model path is relative (`../../Models/`) | predictor.py:6 | Model files won't be found on Railway |
| 3 | Upload dir is relative (`../../data/uploads`) | upload.py:16 | Upload directory won't exist on Railway |
| 4 | `groq` package missing from requirements.txt | requirements.txt | `from groq import Groq` will fail on import |
| 5 | Model .pkl files excluded from git | .gitignore | Models won't be available on Railway |
| 6 | `NEXT_PUBLIC_API_URL` not set anywhere | frontend | Frontend can't reach backend |
| 7 | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` not set | frontend | Supabase auth will crash |
| 8 | No Procfile or railway.json for backend | root | Railway won't know how to start the app |
| 9 | No `Dockerfile` or build configuration | root | Railway build may fail |

### 🟡 HIGH (Security / Production Readiness)

| # | Issue | File | Impact |
|---|-------|------|--------|
| 10 | Supabase JWT secret hardcoded in .env | backend/.env | Secret leaked to anyone with repo access |
| 11 | Groq API key hardcoded in .env | backend/.env | API key leaked |
| 12 | Auth falls back to "anonymous" on invalid token | auth.py:56-61 | Any request without valid JWT still gets access |
| 13 | In-memory session store loses all data on restart | state.py | Users lose uploaded data on server restart |
| 14 | Upload dir created relative to source code | upload.py:17 | May fail with permission errors |
| 15 | No rate limiting on any endpoint | main.py | Vulnerable to abuse |
| 16 | No input validation on upload file size | upload.py | Large files can crash server |
| 17 | `datetime.utcnow()` deprecated in Python 3.12+ | reports.py:137 | Will cause warnings |

### 🟢 MEDIUM (Code Quality / Best Practices)

| # | Issue | File | Impact |
|---|-------|------|--------|
| 18 | No structured logging anywhere | all | No debugging capability in production |
| 19 | No error tracking / monitoring | all | Can't detect issues in production |
| 20 | Alerts are hardcoded demo data | alerts.py:8-13 | Not real functionality |
| 21 | `report_service.py` is a stub (never used) | report_service.py | Dead code |
| 22 | `feature_engineering.py` never imported | feature_engineering.py | Dead code |
| 23 | No graceful shutdown handling | main.py | Data loss on deploy |
| 24 | No request ID / correlation tracking | all | Can't trace requests |
| 25 | `shap==0.52.0` is very heavy for production | requirements.txt | Large Docker image, slow cold start |

---

## Phase 3: Required Changes

### Backend Changes

#### 1. Fix CORS (main.py)
```python
# ALLOWED_ORIGINS should come from environment
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

#### 2. Fix Model Path (predictor.py)
```python
# Use environment variable or resolve relative to project root
BASE = Path(os.getenv("MODEL_DIR", Path(__file__).resolve().parent.parent.parent / "Models"))
```

#### 3. Fix Upload Path (upload.py)
```python
UPLOAD_DIR = os.getenv("UPLOAD_DIR", os.path.join(os.path.dirname(__file__), "..", "..", "..", "data", "uploads"))
```

#### 4. Add Missing Dependency (requirements.txt)
```
groq>=0.4.0
```

#### 5. Fix Auth for Production (auth.py)
In production, reject invalid tokens instead of falling back to anonymous.

#### 6. Add Environment-Based Configuration
```python
# config.py
import os
class Settings:
    ENVIRONMENT = os.getenv("APP_ENV", "development")
    CORS_ORIGINS = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")
    MODEL_DIR = os.getenv("MODEL_DIR", "../Models")
    UPLOAD_DIR = os.getenv("UPLOAD_DIR", "../data/uploads")
    JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET", "")
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
```

### Frontend Changes

#### 1. Add Environment Variables
Create `.env.local`:
```
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

#### 2. Update next.config.js
```js
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  // ... existing config
};
```

---

## Phase 4: Production Folder Structure

### Railway Backend Structure
```
backend/
├── Dockerfile
├── requirements.txt
├── Procfile
├── railway.json
├── app/
│   ├── __init__.py
│   ├── config.py          (NEW - centralized config)
│   ├── main.py
│   ├── auth.py
│   ├── state.py
│   ├── routes/
│   └── services/
├── Models/                 (MUST be in git for Railway)
│   ├── nirikshak_ai_model.pkl
│   ├── preprocessor.pkl
│   ├── feature_list.pkl
│   ├── threshold.pkl
│   └── feature_importance.csv
└── data/
    └── uploads/
```

### Vercel Frontend Structure
```
frontend/
├── vercel.json
├── .env.local             (Vercel environment variables)
├── package.json
├── next.config.js
└── src/
```

---

## Phase 5: GitHub Preparation

### Updated .gitignore
```gitignore
# Frontend
frontend/node_modules/
frontend/.next/
frontend/.env.local
frontend/.env*.local

# Backend
backend/__pycache__/
backend/**/__pycache__/
backend/.env
backend/venv/
backend/.venv/

# DO NOT ignore ML models (needed for deployment)
# Models/*.pkl    ← REMOVE THIS LINE

# Data uploads (ephemeral)
data/uploads/*
!data/uploads/.gitkeep

# OS
.DS_Store
Thumbs.db
*.swp
*.swo

# IDE
.vscode/
.idea/

# Python
*.pyc
*.pyo
__pycache__/
*.egg-info/
dist/
build/
```

### .env.example (Root)
```env
# Backend Environment Variables
APP_ENV=production
ALLOWED_ORIGINS=https://your-app.vercel.app,http://localhost:3000
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
GROQ_API_KEY=your-groq-api-key
MODEL_DIR=./Models
UPLOAD_DIR=./data/uploads

# Frontend Environment Variables (NEXT_PUBLIC_*)
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

---

## Phase 6: Railway Deployment Steps

### Step 1: Fix .gitignore
Remove `ml/models/*.pkl` and `Models/*.pkl` from .gitignore so model files are committed.

### Step 2: Commit Model Files
```bash
git add Models/
git commit -m "Add ML model artifacts for production deployment"
```

### Step 3: Create Backend Dockerfile
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for shap/xgboost
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create upload directory
RUN mkdir -p data/uploads

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Step 4: Create railway.json
```json
{
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "backend/Dockerfile"
  },
  "deploy": {
    "startCommand": "uvicorn app.main:app --host 0.0.0.0 --port $PORT",
    "healthcheckPath": "/health",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 3
  }
}
```

### Step 5: Set Railway Environment Variables
```bash
railway variables set APP_ENV=production
railway variables set ALLOWED_ORIGINS="https://your-app.vercel.app"
railway variables set SUPABASE_JWT_SECRET="your-secret"
railway variables set GROQ_API_KEY="your-key"
railway variables set MODEL_DIR="./Models"
railway variables set UPLOAD_DIR="./data/uploads"
```

### Step 6: Deploy to Railway
```bash
railway login
railway init
railway up
```

### Step 7: Deploy Frontend to Vercel
```bash
cd frontend
vercel --prod
```
Set environment variables in Vercel dashboard:
- `NEXT_PUBLIC_API_URL` → your Railway backend URL
- `NEXT_PUBLIC_SUPABASE_URL` → your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` → your Supabase anon key

---

## Phase 7: Post-Deployment Testing

### Backend Tests
1. `GET /health` → should return `{"status": "ok"}`
2. Upload a CSV file → should return predictions
3. `GET /prediction/results` → should return stored results
4. `GET /explain/{tx_id}` → should return SHAP values
5. `POST /reports/generate` → should return report with LLM summary
6. `POST /chat/` → should answer questions about the data

### Frontend Tests
1. Auth page loads → Supabase login works
2. Upload dataset → redirects to dashboard
3. Dashboard shows risk charts
4. Click "Inspect AI" → SHAP explainability loads
5. Generate report → report preview renders
6. Download report → HTML file downloads
7. Refresh page → state persists (URL routing)

---

## Security Improvements Summary

| Area | Current | Recommended |
|------|---------|-------------|
| CORS | Hardcoded localhost | Environment-based origins |
| Auth | Falls back to anonymous | Reject invalid tokens in production |
| Secrets | In .env file | Railway/Vercel environment variables |
| Rate Limiting | None | Add `slowapi` or Railway middleware |
| File Upload | No size limit | Add 10MB max file size |
| Input Validation | Minimal | Add Pydantic validators |
| Logging | None | Add structlog or loguru |

## Performance Optimizations

| Area | Current | Recommended |
|------|---------|-------------|
| Model Loading | Lazy load on first request | Load at startup (avoid cold start) |
| SHAP | Creates TreeExplainer per request | Cache explainer instance |
| Upload Dir | Created per request | Create at startup |
| Session Store | In-memory dict | Redis (Railway add-on) for persistence |
| Static Files | N/A | Serve via CDN (Vercel) |

## Logging Improvements

```python
import logging
import sys

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)],
)
logger = logging.getLogger("nirikshak")
```

Add request ID middleware for tracing:
```python
import uuid
from starlette.middleware.base import BaseHTTPMiddleware

class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        request_id = str(uuid.uuid4())[:8]
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response