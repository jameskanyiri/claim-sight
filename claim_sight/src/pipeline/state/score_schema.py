from pydantic import BaseModel, Field
from typing import Literal

class Score(BaseModel):
    """Final adjudication decision for a claim."""

    claim_id: str = Field(description="ID of the claim being adjudicated.")

    risk_score: float = Field(
        description=(
            "Composite risk score between 0.0 and 1.0. "
            "Derived by weighing all five feature signals. "
            "0 = no risk, 1 = certain fraud/abuse."
        )
    )

    decision: Literal["PASS", "FLAG", "FAIL"] = Field(
        description="One of: PASS, FLAG, FAIL."
    )

    confidence: float = Field(
        description=(
            "Confidence in the decision, 0.0–1.0. "
            "High when risk_score is far from decision boundaries (0.3 and 0.7). "
            "Low when risk_score is near a boundary."
        )
    )

    reason: str = Field(
        description=(
            "Single concise sentence (max 20 words) naming the top 1–2 signals "
            "that most influenced the decision. This surfaces in the claims "
            "reviewer UI. Example: 'Consultation billed 100% above tariff and "
            "near-duplicate detected across providers.'"
        )
    )

    user_message: str = Field(
        description=(
            "A friendly, first-person message to the user communicating the final decision. "
            "Include the decision (PASS/FLAG/FAIL), the risk score, and the main reason. "
            "Example: 'I have completed my review of this claim. The risk score is 0.25 (low risk) "
            "and I recommend approving it. No significant anomalies were found.' Use 'I' not 'we'."
        ),
    )

