import json
from pathlib import Path

from langchain_core.messages import AIMessage, HumanMessage, SystemMessage

from src.pipeline.config.llm import llm
from src.pipeline.nodes.step_2_compute_features.prompt import SYSTEM_PROMPT
from src.pipeline.state.features_schema import Features
from src.pipeline.state.schema import Claim
from src.pipeline.state.state import MessagesState

structured_llm = llm.with_structured_output(Features)

_DATABASE_DIR = Path(__file__).resolve().parent.parent.parent.parent / "database"


def _load_json(name: str) -> list | dict:
    path = _DATABASE_DIR / name
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def _get_member_by_id(members: list, member_id: str) -> dict | None:
    for m in members:
        if str(m.get("member_id")) == str(member_id):
            return m
    return None


def _get_member_id(claim: Claim) -> str | None:
    """Extract member_id from the claim details."""
    details = claim.details
    if details.claim_form and details.claim_form.member_id:
        return details.claim_form.member_id
    if details.invoice and details.invoice.member_id:
        return details.invoice.member_id
    return None


def compute_features(state: MessagesState) -> MessagesState:
    """Compute features for each claim and write them back into the Claim objects."""
    members_db = _load_json("members.json")
    providers_db = _load_json("providers.json")
    tariffs_db = _load_json("tariffs.json")
    claims_db = _load_json("claims.json")

    claims = state.get("claims", [])
    updated: list[Claim] = []
    user_messages: list[str] = []

    for claim in claims:
        # Skip claims that already have features or are incomplete
        if claim.features is not None:
            updated.append(claim)
            continue

        if claim.details.status != "complete":
            updated.append(claim)
            continue

        member_id = _get_member_id(claim)
        member_record = _get_member_by_id(members_db, member_id) if member_id else None

        member_claims_history = [
            c for c in claims_db
            if str(c.get("member_id")) == str(member_id)
        ] if member_id else []

        # Serialize claim details for the LLM
        claim_data = claim.details.model_dump(mode="json")

        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(
                content=(
                    "Compute all the required features using the following context.\n\n"
                    "Current claim (extracted details):\n"
                    f"{json.dumps(claim_data, indent=2)}\n\n"
                    "Approved tariff schedule:\n"
                    f"{json.dumps(tariffs_db, indent=2)}\n\n"
                    "Member record:\n"
                    f"{json.dumps(member_record, indent=2) if member_record else 'Not found'}\n\n"
                    "Member's past claims history:\n"
                    f"{json.dumps(member_claims_history, indent=2) if member_claims_history else 'No prior claims found'}\n\n"
                    "Providers database:\n"
                    f"{json.dumps(providers_db, indent=2)}"
                )
            ),
        ]

        features = structured_llm.invoke(messages)
        updated.append(claim.model_copy(update={"features": features}))
        user_messages.append(features.user_message)

    return {
        "claims": {"replace": updated},
        "messages": [AIMessage(content="\n\n".join(user_messages))] if user_messages else [],
    }
