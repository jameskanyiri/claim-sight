# Claim Sight

An AI-powered healthcare claims adjudication system built for real-time fraud detection and claims validation. Users upload claim forms and invoices through a web interface; the backend pipeline extracts structured data, engineers fraud-risk features across five dimensions, and produces an adjudication decision: **PASS**, **FLAG**, or **FAIL**.

This system simulates a core component of embedded health claims intelligence — ingesting claims data, extracting structured information from documents, scoring claims using ML-driven analysis, and outputting clear decision classifications with explainable reasoning.

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Docker Compose                             │
│                                                                     │
│  ┌──────────────┐       ┌──────────────────────────────────────┐   │
│  │              │       │         LangGraph API (:8120)         │   │
│  │   Next.js    │ HTTP  │                                      │   │
│  │   Frontend   │──────▶│  ┌──────────┐   ┌──────────────┐    │   │
│  │   (:3000)    │  SDK  │  │ extract  │──▶│ request      │    │   │
│  │              │◀──────│  │ details  │   │ missing      │    │   │
│  │  - Chat UI   │stream │  └──────────┘   │ details      │    │   │
│  │  - File      │       │                 └──────┬───────┘    │   │
│  │    upload    │       │          ┌─────────────┤            │   │
│  │  - Claim     │       │          ▼             ▼            │   │
│  │    panel     │       │  ┌──────────┐     ┌────────┐       │   │
│  │              │       │  │ compute  │     │  END   │       │   │
│  └──────────────┘       │  │ features │     │(ask for│       │   │
│                         │  └────┬─────┘     │ docs)  │       │   │
│                         │       ▼           └────────┘       │   │
│                         │  ┌──────────┐                      │   │
│                         │  │  score   │──▶ PASS/FLAG/FAIL    │   │
│                         │  │  claim   │                      │   │
│                         │  └──────────┘                      │   │
│                         │       │                             │   │
│                         │       ▼                             │   │
│                         │   OpenAI API (GPT-5.2)             │   │
│                         └──────────────────────────────────────┘   │
│                                    │    │                          │
│                         ┌──────────┘    └──────────┐              │
│                         ▼                          ▼              │
│                  ┌────────────┐            ┌────────────┐         │
│                  │   Redis    │            │ PostgreSQL │         │
│                  │  (state)   │            │(checkpoint)│         │
│                  └────────────┘            └────────────┘         │
└─────────────────────────────────────────────────────────────────────┘
```

| Component | Role |
|-----------|------|
| **Next.js Frontend** | Chat-based UI for uploading claim documents (PDF, images) and viewing adjudication results in real time |
| **LangGraph API** | Stateful pipeline server — orchestrates the four processing nodes, manages conversation threads |
| **OpenAI GPT-5.2** | LLM used for document extraction, feature computation, and scoring with structured outputs |
| **Redis** | In-memory state persistence for LangGraph pipeline state between requests |
| **PostgreSQL** | Durable checkpoint storage for conversation threads and pipeline state |

The frontend communicates with the backend using the `@langchain/langgraph-sdk`. Documents are sent as messages; pipeline state (claims, features, scores) streams back in real time so the user sees each processing stage as it completes.

## Model Explanation

### Approach: Hybrid LLM + Rule-Based Scoring

This system uses a **hybrid approach** combining LLM-driven analysis with deterministic weighted scoring:

- **LLM (GPT-5.2)** handles data extraction and feature computation — tasks that require understanding unstructured documents and reasoning across multiple data sources
- **Deterministic weighted scoring** handles the final decision — fixed weights and thresholds ensure consistent, auditable adjudication

This is a deliberate choice over traditional ML models (XGBoost, Random Forest, etc.) for this use case:

| Consideration | Traditional ML | LLM-Based (this system) |
|---------------|---------------|------------------------|
| **Training data** | Requires labelled claims dataset | Works zero-shot with domain knowledge in prompts |
| **Document extraction** | Needs separate OCR/NLP pipeline | Handles extraction and reasoning in one pass |
| **Feature engineering** | Features computed by code from structured input | Features computed by reasoning over structured + reference data |
| **Explainability** | Feature importance from model (SHAP, etc.) | Natural-language reasoning per feature + per decision |
| **Adaptability** | Retrain on new data | Update prompts for new patterns |
| **Cold start** | Cannot operate without training data | Fully functional from day one |

For a production system processing millions of claims, a traditional ML model trained on historical adjudication data would be more cost-effective and deterministic. The LLM approach was chosen here because it produces a working, explainable system without requiring a labelled training dataset — ideal for a prototype demonstrating the full pipeline.

### How the LLM is Used at Each Step

| Pipeline Step | LLM Task | Output |
|---------------|----------|--------|
| **extract_details** | Receives raw document content (claim forms, invoices). Uses structured output to extract typed fields into Pydantic schemas. Identifies document types and groups related documents by member ID. | `ClaimDetails` — patient info, services, amounts, codes, document status |
| **request_missing_details** | Given incomplete claims, generates a natural-language message explaining which documents are missing. | `AIMessage` asking user to upload specific missing documents |
| **compute_features** | Receives extracted claim data alongside reference data (tariffs, member history, provider records, past claims). Reasons across all sources to compute five risk dimensions. | `Features` — numeric scores + reasoning per dimension |
| **score_claim** | Takes computed features, applies weighted scoring, and produces a final adjudication. | `Score` — risk_score (0-1), decision (PASS/FLAG/FAIL), confidence, explanation |

## Feature Engineering

Five risk features are computed for each claim. Each feature was chosen because it targets a specific, well-documented fraud or misbilling pattern in healthcare claims:

### 1. Amount Deviation (Weight: 35%)

**What:** Compares each line item's claimed amount against the approved tariff schedule. Flags items >30% above the approved rate.

**Why this feature:** Overbilling is the most common form of healthcare fraud. Providers may inflate charges for standard procedures, unbundle services to charge separately, or bill for higher-cost procedures than performed (upcoding). Comparing against a tariff schedule catches these patterns directly.

**Inputs:** Claim service line items, tariff schedule (`tariffs.json`)

### 2. Duplicate Detection (Weight: 25%)

**What:** Checks for exact duplicates (same claim submitted twice) and near-duplicates (same procedure at different providers within 30 days).

**Why this feature:** Duplicate billing — submitting the same claim multiple times or getting the same procedure at multiple facilities — is a high-confidence fraud signal. Near-duplicate detection catches "provider shopping" where a patient visits multiple facilities for the same treatment.

**Inputs:** Current claim details, historical claims (`claims.json`)

### 3. Provider Risk Score (Weight: 20%)

**What:** Evaluates the provider's historical overbilling rate, rejection rate, and derives a composite 0-1 risk score.

**Why this feature:** Fraud tends to concentrate at specific providers. A provider with a history of flagged claims, high rejection rates, or consistent overbilling is more likely to submit fraudulent claims. This feature enables network-level fraud detection.

**Inputs:** Provider ID, provider database (`providers.json`)

### 4. Claim Frequency Anomaly (Weight: 12%)

**What:** Checks if the member's recent claim rate exceeds 2x their historical baseline or >3 outpatient claims in 30 days.

**Why this feature:** Sudden spikes in claim frequency can indicate fraud rings, phantom billing, or a member being used as a front for fraudulent claims. Comparing against the member's own baseline makes this adaptive to legitimate high-utilization members.

**Inputs:** Member claim history, member profile (`members.json`, `claims.json`)

### 5. Member Utilization Trend (Weight: 8%)

**What:** Checks YTD spend vs benefit limit, detects spend acceleration/spikes, and identifies the dominant spend category.

**Why this feature:** Members approaching their benefit limit may submit inflated claims to maximize payouts. Spend acceleration (increasing claim amounts over time) can indicate escalating fraudulent behaviour. Category concentration flags unusual patterns (e.g., a member suddenly submitting pharmacy claims when historically all claims were outpatient).

**Inputs:** Member profile, benefit limits, historical claims (`members.json`, `claims.json`)

### Weight Rationale

Weights reflect the confidence and severity of each signal:
- **Amount deviation (35%)** and **duplicate detection (25%)** are high-confidence, high-severity signals — they directly indicate financial irregularity
- **Provider risk (20%)** is a strong contextual signal but shouldn't reject claims solely based on provider history
- **Claim frequency (12%)** and **member utilization (8%)** are softer signals that strengthen a case but have more legitimate explanations

## Decision Engine

The final decision combines ML-driven feature scores with deterministic rules:

1. **Feature computation** (LLM) — Each feature produces a numeric score (0-1) with natural-language reasoning explaining why that score was assigned
2. **Weighted aggregation** (deterministic) — Features are combined using fixed weights into a single risk score
3. **Threshold mapping** (deterministic) — The risk score maps to a decision:

| Risk Score | Decision | Action |
|------------|----------|--------|
| 0.00 - 0.30 | **PASS** | Low risk — approve automatically |
| 0.30 - 0.70 | **FLAG** | Medium risk — route to manual review |
| 0.70 - 1.00 | **FAIL** | High risk — reject |

4. **Explainability** — Every decision includes:
   - The overall risk score and confidence level
   - A human-readable reason summarizing why the claim was scored this way
   - Per-feature reasoning explaining what was detected in each dimension
   - The specific data points that triggered each feature (e.g., "claimed amount $450 vs approved tariff $200 — 125% deviation")

This hybrid approach ensures the scoring is **auditable and consistent** (same weights and thresholds every time) while leveraging the LLM's ability to **reason across complex, multi-source data** for feature computation.

## Assumptions & Trade-offs

### Assumptions

- **Reference data is static:** Member records, provider databases, tariff schedules, and claims history are stored as JSON files in `src/database/`. In production, these would connect to a live database with real-time updates.
- **Document grouping by member ID:** The pipeline matches claim forms to invoices primarily by member ID, assuming each member submits one claim form and one invoice per encounter.
- **Single LLM provider:** The system assumes access to OpenAI's API. The model is configured in a single file (`src/pipeline/config/llm.py`) and can be swapped to any LangChain-supported model.

### Trade-offs

| Decision | Trade-off |
|----------|-----------|
| **LLM for feature computation** vs deterministic rules | More flexible with unstructured data and edge cases, but introduces non-determinism and higher latency/cost per claim. A production system at scale would use the LLM to generate training data, then distill into a traditional ML model. |
| **Single model for all steps** vs specialised models | Simpler to maintain and deploy. A production system could use a smaller model for extraction and a reasoning model for scoring to reduce cost. |
| **LangGraph Platform** vs plain FastAPI | Provides built-in state persistence, streaming, thread management, and checkpointing. Trade-off is dependency on the LangGraph ecosystem. |
| **JSON file database** vs real database | Fast to prototype and easy to understand. Not suitable for production — no concurrent access, no querying, no updates. |
| **Fixed scoring weights** vs learned weights | Simple and interpretable. A learned model could adapt weights per claim type, provider, or region, but adds training complexity and reduces explainability. |
| **Streaming UI** vs batch processing | Real-time feedback improves UX for individual claim review. Batch processing would be needed for high-volume automated adjudication. |

## Potential Improvements

### Production Readiness
- **Real database integration** — Replace JSON files with PostgreSQL/MongoDB for member records, provider data, tariffs, and claims history
- **Authentication & authorization** — Role-based access for claims adjusters, supervisors, and auditors
- **Batch processing API** — Endpoint for bulk claim ingestion via CSV/JSON alongside the interactive UI

### Model Improvements
- **Training data generation** — Use the LLM to label historical claims, then train a traditional ML model (XGBoost/Random Forest) for faster, cheaper, deterministic scoring at scale
- **Model retraining pipeline** — Periodic retraining on adjudicator feedback (approved/rejected decisions) to improve accuracy over time
- **Confidence calibration** — Calibrate the FLAG zone based on actual false-positive/false-negative rates from manual review outcomes
- **Specialised extraction model** — Fine-tune a smaller model for document extraction to reduce cost and latency

### Monitoring & MLOps
- **Decision drift monitoring** — Track PASS/FLAG/FAIL distribution over time to detect model degradation
- **Feature drift detection** — Alert when input distributions shift (e.g., sudden increase in high-amount claims)
- **A/B testing framework** — Compare different scoring weights or model versions against adjudicator agreement rates
- **LangSmith integration** — Already supported for tracing and debugging LLM calls in production

### Scalability
- **Async processing** — Queue-based architecture (Redis/Kafka) for handling high claim volumes
- **Horizontal scaling** — Multiple LangGraph API instances behind a load balancer
- **Caching** — Cache provider risk scores and tariff lookups to reduce redundant computation
- **Regional deployment** — Deploy across regions to support emerging market expansion with local data residency

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

## Getting Started

### Prerequisites

- **Docker & Docker Compose**
- An **OpenAI API key**

### 1. Clone and configure

```bash
git clone git@github.com:jameskanyiri/claim-sight.git
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

See individual package READMEs for detailed documentation:
- [Backend Pipeline README](./claim_sight/README.md) — node details, state schema, reference data
- [Frontend UI README](./clain_sight_ui/README.md) — component architecture, LangGraph SDK integration
