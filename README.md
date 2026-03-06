# Claim Sight

An LLM-powered healthcare claims adjudication system. Users upload claim forms and invoices through a web interface; the backend pipeline extracts structured data, computes fraud-risk features across five dimensions, and returns a PASS / FLAG / FAIL decision.

This repository contains both the backend pipeline and the frontend UI, with a unified Docker Compose setup to run everything together.

## Repository Structure

```
claim-sight/
├── claim_sight/          # Backend — LangGraph claims processing pipeline (Python)
├── clain_sight_ui/       # Frontend — Next.js web interface (TypeScript)
├── docker-compose.yml    # Production Docker setup (all services)
├── docker-compose.dev.yml# Development Docker setup (hot reload)
├── .env.example          # Environment variable template
└── README.md             # This file
```

| Package | Description | Tech |
|---------|-------------|------|
| [`claim_sight/`](./claim_sight/) | Claims adjudication pipeline — extracts details, computes risk features, scores claims | Python 3.13, LangGraph, LangChain, OpenAI, FastAPI |
| [`clain_sight_ui/`](./clain_sight_ui/) | Web UI for uploading documents, chatting with the agent, and viewing claim decisions | Next.js 16, React 19, Tailwind CSS, LangGraph SDK |

## How It Works

1. A user uploads healthcare documents (claim forms, invoices) through the web UI
2. The frontend sends the documents to the LangGraph backend via the LangGraph SDK
3. The backend pipeline processes the documents through four stages:

```
  extract_details          Parse documents, extract fields, group by member ID
        │
        ▼
  request_missing_details  Check completeness — ask for missing docs or continue
        │
        ▼
  compute_features         Compute 5 risk dimensions against reference data
        │
        ▼
  score_claim              Weighted scoring → PASS / FLAG / FAIL decision
```

4. Results stream back to the UI in real time, showing pipeline progress and the final decision

## Getting Started

### Prerequisites

- **Docker & Docker Compose**
- An **OpenAI API key**

### 1. Clone and configure

```bash
git clone <repository-url>
cd claim-sight
cp .env.example .env
```

Edit `.env` and add your API keys:

```env
OPENAI_API_KEY=sk-...

# Optional: LangSmith tracing
LANGSMITH_API_KEY=lsv2_pt_...
LANGSMITH_ENDPOINT=https://api.smith.langchain.com
LANGSMITH_TRACING=true
LANGSMITH_PROJECT=claim_sight
```

### 2. Run with Docker Compose

**Production** (optimized builds):

```bash
docker compose up --build
```

**Development** (hot reload — source code is volume-mounted):

```bash
docker compose -f docker-compose.dev.yml up --build
```

In development mode, changes to frontend code (`clain_sight_ui/`) and backend source (`claim_sight/src/`) are reflected automatically without rebuilding.

### Services

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | Next.js web UI |
| Backend API | http://localhost:8120 | LangGraph pipeline server |
| PostgreSQL | localhost:5440 | LangGraph checkpointer |
| Redis | (internal) | LangGraph state persistence |

### Local Development (without Docker)

**Backend:**

```bash
cd claim_sight
uv sync
langgraph dev
```

**Frontend:**

```bash
cd clain_sight_ui
npm install
npm run dev
```

## Scoring

Claims are scored using weighted risk features:

| Feature | Weight | What it analyses |
|---------|--------|------------------|
| Amount Deviation | 35% | Line items compared against the approved tariff schedule |
| Duplicate Detection | 25% | Exact and near-duplicate claim checks |
| Provider Risk | 20% | Historical overbilling and rejection rates |
| Claim Frequency | 12% | Anomalous claim submission patterns |
| Member Utilization | 8% | YTD spend vs benefit limit, spend acceleration |

**Decision thresholds:**
- **PASS** (0.00 - 0.30) — Low risk, approve
- **FLAG** (0.30 - 0.70) — Medium risk, manual review required
- **FAIL** (0.70 - 1.00) — High risk, reject

See individual package READMEs for detailed documentation:
- [Backend (claim_sight) README](./claim_sight/README.md)
- [Frontend (clain_sight_ui) README](./clain_sight_ui/README.md)
