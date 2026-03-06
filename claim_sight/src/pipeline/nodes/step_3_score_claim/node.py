import json

from langchain_core.messages import AIMessage, SystemMessage, HumanMessage

from src.pipeline.config.llm import llm
from src.pipeline.nodes.step_3_score_claim.prompt import SYSTEM_PROMPT
from src.pipeline.state.score_schema import Score
from src.pipeline.state.schema import Claim
from src.pipeline.state.state import MessagesState

structured_llm = llm.with_structured_output(Score)


def score_claim(state: MessagesState) -> MessagesState:
    """Score each claim that has features computed."""
    claims = state.get("claims", [])
    updated: list[Claim] = []
    user_messages: list[str] = []

    for claim in claims:
        # Skip claims that already have a score or don't have features yet
        if claim.score is not None or claim.features is None:
            updated.append(claim)
            continue

        claim_data = {
            "details": claim.details.model_dump(mode="json"),
            "features": claim.features.model_dump(mode="json"),
        }

        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(
                content=(
                    "Score the following claim based on its computed features.\n\n"
                    f"{json.dumps(claim_data, indent=2)}"
                )
            ),
        ]

        score = structured_llm.invoke(messages)
        updated.append(claim.model_copy(update={"score": score}))
        user_messages.append(score.user_message)

    return {
        "claims": {"replace": updated},
        "messages": [AIMessage(content="\n\n".join(user_messages))] if user_messages else [],
    }
