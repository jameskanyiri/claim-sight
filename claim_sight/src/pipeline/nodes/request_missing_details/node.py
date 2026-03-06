from langchain_core.messages import AIMessage, HumanMessage, SystemMessage
from langgraph.types import Command
from typing import Literal

from src.pipeline.config.llm import llm
from src.pipeline.nodes.request_missing_details.prompt import SYSTEM_PROMPT
from src.pipeline.state.state import MessagesState
from langgraph.graph import END


def request_missing_details(
    state: MessagesState,
) -> Command[Literal["compute_features", END]]:
    """Use the LLM to generate a message asking the user for missing documents."""
    claims = state.get("claims", [])

    missing_parts: list[str] = []
    for i, claim in enumerate(claims):
        details = claim.details
        if details.status == "missing_invoice":
            member = (
                details.claim_form.member_id
                or details.claim_form.patient_name
                or f"Claim {i + 1}"
            )
            missing_parts.append(
                f"- {member}: Claim form was found but no matching invoice."
            )
        elif details.status == "missing_claim_form":
            member = (
                details.invoice.member_id
                or details.invoice.patient_name
                or f"Claim {i + 1}"
            )
            missing_parts.append(
                f"- {member}: Invoice was found but no matching claim form."
            )

    if missing_parts:
        context = (
            "The following claims are incomplete:\n\n"
            + "\n".join(missing_parts)
            + "\n\nWrite a message to the user explaining what is missing and asking them to upload the required documents."
        )
        response = llm.invoke(
            [
                SystemMessage(content=SYSTEM_PROMPT),
                HumanMessage(content=context),
            ]
        )
        return Command(
            goto=END,
            update={"messages": [AIMessage(content=response.content)]},
        )

    else:
        return Command(goto="compute_features")
