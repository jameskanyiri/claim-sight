from typing import Literal

from langgraph.graph import StateGraph, START, END

from src.pipeline.state.state import MessagesState, InputState
from src.pipeline.nodes.step_1_extract_details.node import extract_details
from src.pipeline.nodes.step_2_compute_features.node import compute_features
from src.pipeline.nodes.step_3_score_claim.node import score_claim
from src.pipeline.nodes.request_missing_details.node import request_missing_details



graph = StateGraph(MessagesState, input_schema=InputState)

graph.add_node("extract_details", extract_details)
graph.add_node("request_missing_details", request_missing_details)
graph.add_node("compute_features", compute_features)
graph.add_node("score_claim", score_claim)

graph.add_edge(START, "extract_details")
graph.add_edge("extract_details", "request_missing_details")
graph.add_edge("compute_features", "score_claim")
graph.add_edge("score_claim", END)

graph = graph.compile()
