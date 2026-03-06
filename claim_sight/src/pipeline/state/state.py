from langchain.messages import AnyMessage
from typing_extensions import TypedDict, Annotated
import operator
from src.pipeline.state.schema import Claim


def _claims_reducer(left: list, right: list | dict | None) -> list:
    """Append new groups, or replace the whole list when right is {"replace": new_list}."""
    if right is None:
        return left or []
    if isinstance(right, dict) and "replace" in right:
        return list(right["replace"])
    return (left or []) + list(right) if isinstance(right, list) else (left or [])


class InputState(TypedDict):
    """Input state for the pipeline."""
    messages: Annotated[list[AnyMessage], operator.add]


class MessagesState(TypedDict):
    messages: Annotated[list[AnyMessage], operator.add]
    claims: Annotated[list[Claim], _claims_reducer]