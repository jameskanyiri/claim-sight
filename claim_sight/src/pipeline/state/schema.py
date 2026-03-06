from pydantic import BaseModel, Field
from typing import Optional
from src.pipeline.state.claim_schema import ClaimDetails
from src.pipeline.state.features_schema import Features
from src.pipeline.state.score_schema import Score


class Claim(BaseModel):
    """A claim with its details and features."""
    details: ClaimDetails = Field(
        description="Matched claim form + invoice group for a single encounter.",
    )
    features: Optional[Features] = Field(
        None,
        description="Computed risk features. None until the feature computation step runs.",
    )
    score: Optional[Score] = Field(
        None,
        description="Final adjudication decision for the claim.",
    )