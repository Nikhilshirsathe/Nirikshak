# Nirikshak AI

**Enterprise AML Platform — Mule Account Detection & Fraud Prevention**

An AI-powered web application that detects Mule Accounts and Suspicious Transactions using Machine Learning, Explainable AI (SHAP), Risk Scoring, and Fraud Analytics.

## Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Frontend   │────▶│     Backend      │────▶│   ML Models     │
│  Next.js 14  │     │    FastAPI       │     │  XGBoost + SHAP │
│  React 18    │     │    Python 3.11   │     │  124 Features   │
│  Tailwind    │     │    Groq LLM      │     │  .pkl artifacts │
└─────────────┘     └──────────────────┘     └─────────────────┘
       │                     │
       ▼                     ▼
┌─────────────┐     ┌──────────────────┐
│   Supabase   │     │     Railway      │
│   Auth (JWT) │     │   (Deployment)   │
└─────────────┘     └──────────────────┘
```

## Features

- **CSV/Excel Dataset Upload** — Drop files, instant ML scoring
- **XGBoost Model Inference** — 124-feature mule account classifier
- **Risk Scoring & Categorization** — High Velocity Mule, Layering, Smurfing
- **SHAP Explainability** — Feature-importance breakdowns for every prediction
- **AI Chatbot (Groq LLM)** — Ask questions about your dataset
- **Audit Report Generation** — LLM-powered summaries with PII redaction
- **Interactive Dashboards** — Risk distribution, category, and status charts
- **Account Risk Analysis** — Search and inspect individual accounts
- **Alert Management** — Active alert tracking and resolution
- **URL-Based Routing** — Page state persists across refreshes
- **Supabase Authentication** — JWT-based secure access

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14, React 18, TypeScript, Tailwind CSS |
| Backend | FastAPI, Python 3.11, Pydantic |
| ML | XGBoost, SHAP, scikit-learn, Pandas, NumPy |
| LLM | Groq (Llama 3.3 70B) |
| Auth | Supabase (JWT verification) |
| Deployment | Railway (backend), Vercel (frontend) |

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- A Supabase project
- A Groq API key

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp ../.env.example .env
# Edit .env with your Supabase JWT secret and Groq API key

# Run server
uvicorn app.main:app --reload --port 8000
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase URL, anon key, and API URL

# Run dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

### Backend (.env)

| Variable | Required | Description |
|----------|----------|-------------|
| `APP_ENV` | No | `development` or `production` |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins |
| `SUPABASE_JWT_SECRET` | Yes | From Supabase Dashboard → Settings → API |
| `GROQ_API_KEY` | Yes | From https://console.groq.com/keys |
| `MODEL_DIR` | No | Path to Models/ directory |
| `UPLOAD_DIR` | No | Path to data/uploads/ directory |
| `MAX_UPLOAD_SIZE_MB` | No | Max upload size (default: 10MB) |

### Frontend (.env.local)

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Yes | Backend API URL |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key |

## Deployment

### Railway (Backend)

1. Push to GitHub
2. Connect repo to Railway
3. Set root directory to `backend/`
4. Railway auto-detects Dockerfile
5. Set environment variables in Railway dashboard
6. Deploy

### Vercel (Frontend)

1. Connect repo to Vercel
2. Set root directory to `frontend/`
3. Set environment variables in Vercel dashboard
4. Deploy

See [DEPLOYMENT_AUDIT.md](DEPLOYMENT_AUDIT.md) for detailed deployment steps.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/upload/` | Upload CSV/Excel dataset |
| GET | `/prediction/results` | Get latest prediction results |
| GET | `/explain/{tx_id}` | Get SHAP explanation for transaction |
| POST | `/reports/generate` | Generate audit report with LLM summary |
| POST | `/chat/` | Ask AI questions about dataset |
| GET | `/alerts` | List alerts |
| PATCH | `/alerts/{id}/resolve` | Resolve an alert |
| POST | `/account/analyze` | Analyze single account |
| GET | `/session/me` | Get current session info |
| POST | `/session/logout` | Clear session data |

## Project Structure

```
NIRIKSHAK-AI/
├── backend/                  # FastAPI backend
│   ├── app/
│   │   ├── main.py          # App entry point
│   │   ├── config.py        # Centralized configuration
│   │   ├── auth.py          # JWT authentication
│   │   ├── state.py         # In-memory session store
│   │   ├── routes/          # API route handlers
│   │   └── services/        # Business logic (ML, SHAP, LLM)
│   ├── Models/              # XGBoost model artifacts (.pkl)
│   ├── Dockerfile           # Container build
│   └── requirements.txt     # Python dependencies
├── frontend/                 # Next.js frontend
│   ├── src/
│   │   ├── app/             # Next.js app router
│   │   ├── components/      # React components
│   │   ├── pages/           # Page views
│   │   ├── services/        # API client
│   │   └── utils/           # Types and helpers
│   └── package.json
├── Models/                   # Model artifacts (committed to git)
├── ml/                       # Training notebooks and scripts
├── data/                     # Upload storage
├── .env.example              # Environment variable template
├── railway.json              # Railway deployment config
└── DEPLOYMENT_AUDIT.md       # Full deployment audit report
```

## License

Private — Nirikshak AI Team