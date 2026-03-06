# Claim Sight — LangGraph Pipeline

The backend claims processing pipeline for Claim Sight. Built with [LangGraph](https://langchain-ai.github.io/langgraph/), it receives healthcare documents, extracts structured data using an LLM, computes fraud-risk features against reference data, and produces a scored adjudication decision.

## Pipeline Overview

The pipeline processes healthcare documents through four nodes:

1. **Extract Details** — Parses uploaded documents (claim forms, invoices), extracts structured fields, and groups related documents together by member ID. Flags missing documents.
2. **Request Missing Details** — Checks if any claims are incomplete. If documents are missing, uses the LLM to generate a user-facing message and halts. If complete, proceeds.
3. **Compute Features** — For each complete claim, loads reference data (tariffs, member history, provider records) and computes five risk features.
4. **Score Claim** — Weighs the computed features and produces a final risk score, decision (PASS/FLAG/FAIL), confidence level, and human-readable reason.

### Flow

```
           ┌───────────┐
           │   START    │
           └─────┬─────┘
                 │
                 ▼
     ┌───────────────────────┐
     │   extract_details     │  ← Parse documents, extract fields, group by member ID
     └───────────┬───────────┘
                 │
                 ▼
     ┌───────────────────────┐
     │ request_missing_      │  ← Check completeness (uses Command routing)
     │ details               │
     └───────────┬───────────┘
           ┌─────┴──────┐
    all    │             │  documents
  complete │             │  missing
           ▼             ▼
  ┌────────────┐    ┌───────┐
  │ compute_   │    │  END  │  ← AI message asking user for missing docs
  │ features   │    └───────┘
  └─────┬──────┘
        │
        ▼
  ┌────────────┐
  │ score_     │  ← Weighted scoring → PASS / FLAG / FAIL
  │ claim      │
  └─────┬──────┘
        │
        ▼
   ┌────────┐
   │  END   │
   └────────┘
```

- **Complete path:** `extract_details` → `request_missing_details` → `compute_features` → `score_claim` → END
- **Incomplete path:** `extract_details` → `request_missing_details` → END (with an AI message asking for missing documents)

## State

The pipeline uses `MessagesState` (see `src/pipeline/state/state.py`):

| Field | Type | Description |
|---|---|---|
| `messages` | `list[AnyMessage]` | Conversation messages (appended via reducer) |
| `claims` | `list[Claim]` | Claim objects carrying details, features, and scores through the pipeline. Uses a custom reducer supporting both append and replace semantics |

Each `Claim` object (`src/pipeline/state/schema.py`) contains:

| Field | Type | Set by |
|---|---|---|
| `details` | `ClaimDetails` | extract_details |
| `features` | `Features` (optional) | compute_features |
| `score` | `Score` (optional) | score_claim |

### ClaimDetails

Groups a claim form with its matching invoice for a single patient encounter:

| Field | Type | Description |
|---|---|---|
| `claim_form` | `ClaimFormSchema` (optional) | Extracted claim form data (patient info, visit, practitioner, diagnosis, services) |
| `invoice` | `InvoiceSchema` (optional) | Extracted invoice data (patient, hospital, services, total) |
| `status` | `complete` / `missing_invoice` / `missing_claim_form` | Whether both documents are present |
| `match_reason` | `str` | Why documents were grouped (shared member ID, patient name, date, facility) |

The extract_details node merges documents across invocations — if a user uploads a claim form first and the invoice later, the node matches them by member ID and fills in the missing side.

## Nodes

### `extract_details`

**File:** `src/pipeline/nodes/step_1_extract_details/node.py`

Receives uploaded document content, uses the LLM with structured output to extract all available fields, and groups related claim forms and invoices together.

**Key behaviour:**
- Identifies document types (claim form vs invoice) from content markers
- Extracts patient info, visit details, practitioner, diagnosis, and service line items from claim forms
- Extracts patient, hospital, invoice metadata, and service line items from invoices
- Groups related documents by shared identifiers (member ID, patient name, date, facility)
- Merges new documents into existing incomplete claim groups in state
- Sets `status` to flag missing documents

**Output:** Creates/updates `Claim` objects in `state["claims"]` with `details` populated, `features=None`, `score=None`.

### `request_missing_details`

**File:** `src/pipeline/nodes/request_missing_details/node.py`

Checks whether all claim groups are complete. Uses LangGraph's `Command` to dynamically route:

- **If any claims are incomplete** — Builds a context listing which members are missing which documents, invokes the LLM to generate a polite user-facing message, and routes to END.
- **If all claims are complete** — Routes directly to `compute_features` with no state changes.

**Output:** When incomplete, appends an `AIMessage` to `state["messages"]` explaining what's missing.

### `compute_features`

**File:** `src/pipeline/nodes/step_2_compute_features/node.py`

For each complete claim (status = `complete`, features not yet computed), loads reference data from `src/database/` and sends it to the LLM to compute five risk features:

| Feature | What it analyses |
|---------|-----------------|
| **Amount Deviation** | Compares each line item against the tariff schedule. Flags items >30% above tariff |
| **Claim Frequency Anomaly** | Checks if the member's recent claim rate exceeds 2x baseline or >3 outpatient claims in 30 days |
| **Provider Risk Score** | Evaluates the provider's historical overbilling rate, rejection rate, derives a 0-1 score |
| **Member Utilization Trend** | Checks YTD spend vs benefit limit, detects spend acceleration/spikes |
| **Duplicate Detection** | Checks for exact and near-duplicates (same procedure at different providers within 30 days) |

**Context passed to the LLM:**
- Current claim details (claim form + invoice data)
- Approved tariff schedule (`tariffs.json`)
- Member record (`members.json`)
- Member's past claims history (`claims.json`, filtered by member ID)
- Providers database (`providers.json`)

### `score_claim`

**File:** `src/pipeline/nodes/step_3_score_claim/node.py`

Produces a final adjudication decision using weighted scoring:

| Feature | Weight |
|---------|--------|
| Amount deviation | 35% |
| Duplicate detection | 25% |
| Provider risk | 20% |
| Claim frequency | 12% |
| Member utilization | 8% |

**Decision thresholds:** 0.00-0.30 = PASS, 0.30-0.70 = FLAG, 0.70-1.00 = FAIL

## Reference Data

Sample reference data lives in `src/database/`. The compute_features node loads these files to provide historical context to the LLM.

| File | Contents |
|------|----------|
| `members.json` | Member profiles — demographics, claim frequency, benefit limits, YTD spend |
| `claims.json` | Historical claims — for duplicate detection and frequency analysis |
| `providers.json` | Provider records — flag rates, overbilling rates, risk tiers |
| `tariffs.json` | Approved tariff schedule — procedure codes, descriptions, approved amounts |

## Setup

### Prerequisites

- **Python 3.13+**
- **[uv](https://docs.astral.sh/uv/)** — package manager
- An **OpenAI API key**

### Development

```bash
uv sync
langgraph dev
```

The LangGraph Studio UI opens automatically. The API is available at the URL shown in the terminal.

### Docker

From the monorepo root:

```bash
docker compose up --build
```

The API is available at http://localhost:8120.

### Invoking the Pipeline

```python
from langgraph_sdk import get_client

client = get_client(url="http://localhost:8120")

thread = await client.threads.create()

result = await client.runs.create(
    thread["thread_id"],
    "pipeline",
    input={
        "messages": [
            {
                "role": "human",
                "content": "Process these claim documents.",
            }
        ]
    },
)
```

## Project Layout

| Path | Purpose |
|------|---------|
| `src/pipeline/graph.py` | StateGraph definition — nodes, edges, compilation |
| `src/pipeline/state/state.py` | `MessagesState` with custom claims reducer |
| `src/pipeline/state/schema.py` | `Claim` model (details + features + score) |
| `src/pipeline/state/claim_schema.py` | `ClaimDetails`, `ClaimFormSchema`, `InvoiceSchema` |
| `src/pipeline/state/features_schema.py` | `Features` and five risk dimension models |
| `src/pipeline/state/score_schema.py` | `Score` (risk_score, decision, confidence, reason) |
| `src/pipeline/config/llm.py` | LLM instance configuration |
| `src/pipeline/nodes/step_1_extract_details/` | Document extraction, grouping, merge logic |
| `src/pipeline/nodes/request_missing_details/` | Completeness check and missing document request |
| `src/pipeline/nodes/step_2_compute_features/` | Five-dimension risk feature computation |
| `src/pipeline/nodes/step_3_score_claim/` | Weighted scoring and adjudication decision |
| `src/database/` | Reference data (JSON) |
| `langgraph.json` | LangGraph server configuration |
| `Dockerfile` | Container build for the LangGraph API server |
