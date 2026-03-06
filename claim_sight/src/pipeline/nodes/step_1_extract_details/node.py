from src.pipeline.state.state import MessagesState
from src.pipeline.nodes.step_1_extract_details.schema import ExtractDetailsSchema
from src.pipeline.state.claim_schema import ClaimDetails
from src.pipeline.state.schema import Claim
from src.pipeline.nodes.step_1_extract_details.prompt import EXTRACT_DETAILS_SYSTEM_PROMPT
from src.pipeline.config.llm import llm

from langchain_core.messages import AIMessage, SystemMessage


def _get_member_id(details: ClaimDetails) -> str | None:
    """Extract member_id from whichever side of the group is present."""
    if details.claim_form and details.claim_form.member_id:
        return details.claim_form.member_id
    if details.invoice and details.invoice.member_id:
        return details.invoice.member_id
    return None


def _merge_into_existing(
    existing: list[Claim], new_groups: list[ClaimDetails]
) -> list[Claim]:
    """Merge new extraction groups into existing claims by member_id.

    If an existing claim is incomplete and a new group has the missing side
    with the same member_id, fill it in rather than creating a duplicate.
    Otherwise create a new Claim entry.
    """
    by_member: dict[str, int] = {}
    merged = [c.model_copy(deep=True) for c in existing]

    for i, claim in enumerate(merged):
        mid = _get_member_id(claim.details)
        if mid:
            by_member[mid] = i

    for new_group in new_groups:
        new_mid = _get_member_id(new_group)

        if new_mid and new_mid in by_member:
            idx = by_member[new_mid]
            target = merged[idx].details

            # Fill in the missing invoice
            if target.status == "missing_invoice" and new_group.invoice:
                merged[idx] = merged[idx].model_copy(
                    update={
                        "details": target.model_copy(
                            update={
                                "invoice": new_group.invoice,
                                "status": "complete",
                                "match_reason": (
                                    f"Invoice matched by member_id '{new_mid}'."
                                ),
                            }
                        )
                    }
                )
                continue

            # Fill in the missing claim form
            if target.status == "missing_claim_form" and new_group.claim_form:
                merged[idx] = merged[idx].model_copy(
                    update={
                        "details": target.model_copy(
                            update={
                                "claim_form": new_group.claim_form,
                                "status": "complete",
                                "match_reason": (
                                    f"Claim form matched by member_id '{new_mid}'."
                                ),
                            }
                        )
                    }
                )
                continue

        # No match or existing is already complete — create new Claim
        new_claim = Claim(details=new_group, features=None)
        merged.append(new_claim)
        if new_mid:
            by_member[new_mid] = len(merged) - 1

    return merged


def extract_details(state: MessagesState) -> MessagesState:
    """Extract details from the latest message and merge into existing claims."""
    messages = state["messages"]
    last_message = messages[-1]

    structured_llm = llm.with_structured_output(ExtractDetailsSchema)
    system_message = SystemMessage(content=EXTRACT_DETAILS_SYSTEM_PROMPT)
    response = structured_llm.invoke([system_message, last_message])

    existing_claims = state.get("claims", [])
    merged = _merge_into_existing(existing_claims, response.claims)

    return {
        "claims": {"replace": merged},
        "messages": [AIMessage(content=response.user_message)],
    }
