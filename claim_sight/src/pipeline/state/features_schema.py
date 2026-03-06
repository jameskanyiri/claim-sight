from pydantic import BaseModel, Field
from typing import List


class LineItemDeviation(BaseModel):
    """Feature 1: Amount deviation for a single procedure line item."""

    reasoning: str = Field(
        description=(
            "How the tariff match was made (by code or semantic description), "
            "and why the deviation level is or isn't suspicious."
        )
    )
    procedure_code: str = Field(
        description="Matched tariff procedure code. Use 'UNKNOWN' if no match found."
    )
    description: str = Field(
        description="Description of the procedure as it appears on the claim."
    )
    claimed_amount: float = Field(
        description="Amount claimed for this procedure."
    )
    approved_tariff: float = Field(
        description="Approved tariff for this procedure. 0.0 if unmatched."
    )
    amount_deviation_pct: float = Field(
        description=(
            "Percentage deviation: ((claimed - tariff) / tariff) * 100. "
            "Positive = overbilling. 0.0 if tariff unknown."
        )
    )
    amount_ratio: float = Field(
        description=(
            "claimed_amount / approved_tariff. "
            "e.g. 1.65 means 65% above tariff. 0.0 if tariff unknown."
        )
    )
    is_unrecognised: bool = Field(
        description="True if the procedure could not be matched to any tariff entry."
    )


class ClaimFrequencyAnomaly(BaseModel):
    """Feature 2: Anomaly in how often this member submits claims."""

    reasoning: str = Field(
        description=(
            "Explanation of whether the current claim frequency is normal "
            "based on the member's historical claim pattern and population norms."
        )
    )
    claims_last_30_days: int = Field(
        description="Number of claims submitted by this member in the last 30 days (from history)."
    )
    claims_last_90_days: int = Field(
        description="Number of claims submitted by this member in the last 90 days (from history)."
    )
    avg_claims_per_month: float = Field(
        description="Member's average monthly claim count over their full history."
    )
    is_frequency_anomaly: bool = Field(
        description=(
            "True if the recent claim rate is significantly higher than the member's "
            "own baseline or population average. Threshold: >2x personal average OR "
            ">3 claims in 30 days for outpatient."
        )
    )
    anomaly_severity: str = Field(
        description="One of: NONE, LOW, MEDIUM, HIGH. Based on how far above baseline."
    )


class ProviderRiskScore(BaseModel):
    """Feature 3: Risk profile of the submitting provider."""

    reasoning: str = Field(
        description=(
            "Explanation of what signals drove this provider's risk score — "
            "e.g. historical overbilling rate, claim rejection history, "
            "unusual procedure mix, or lack of history."
        )
    )
    provider_id: str = Field(
        description="ID of the provider submitting this claim."
    )
    historical_overbilling_rate: float = Field(
        description=(
            "Percentage of this provider's past claims that exceeded tariff. "
            "0.0 if no history available."
        )
    )
    historical_rejection_rate: float = Field(
        description=(
            "Percentage of this provider's past claims that were rejected. "
            "0.0 if no history available."
        )
    )
    provider_risk_score: float = Field(
        description=(
            "Composite risk score for this provider, 0.0–1.0. "
            "Derived from overbilling rate, rejection rate, claim volume anomalies, "
            "and procedure mix. 0.5 default if no history available (unknown risk)."
        )
    )
    risk_tier: str = Field(
        description="One of: LOW (0–0.3), MEDIUM (0.3–0.6), HIGH (0.6–1.0)."
    )


class MemberUtilizationTrend(BaseModel):
    """Feature 4: Member's benefit utilization trend over time."""

    reasoning: str = Field(
        description=(
            "Explanation of the member's utilization pattern — whether spend is "
            "trending up sharply, concentrated in one category, or normal."
        )
    )
    total_claimed_ytd: float = Field(
        description="Total amount claimed by this member year-to-date."
    )
    benefit_limit: float = Field(
        description="Member's annual benefit limit. 0.0 if unknown."
    )
    utilization_rate_pct: float = Field(
        description=(
            "Percentage of annual benefit limit already consumed: "
            "(total_claimed_ytd / benefit_limit) * 100. 0.0 if limit unknown."
        )
    )
    spend_acceleration: str = Field(
        description=(
            "Whether the member's spend rate is: NORMAL, ACCELERATING, or SPIKE. "
            "ACCELERATING = spend in last 30 days > 2x monthly average. "
            "SPIKE = single claim > 50% of remaining benefit."
        )
    )
    dominant_category: str = Field(
        description=(
            "The benefit category (e.g. dental, pharmacy, outpatient) that accounts "
            "for the largest share of the member's YTD spend."
        )
    )
    is_utilization_anomaly: bool = Field(
        description=(
            "True if utilization rate exceeds 80% before year end, spend is "
            "accelerating abnormally, or a single claim is disproportionately large."
        )
    )


class DuplicateDetection(BaseModel):
    """Feature 5: Detection of potential duplicate claims."""

    reasoning: str = Field(
        description=(
            "Explanation of whether a duplicate was found, what matched "
            "(same procedure, same date, same provider, same amount), "
            "and confidence level."
        )
    )
    is_duplicate: bool = Field(
        description=(
            "True if this claim matches a previously submitted claim on: "
            "member_id + provider_id + procedure_code + date_of_service."
        )
    )
    is_near_duplicate: bool = Field(
        description=(
            "True if this claim is a likely near-duplicate: same member + provider + "
            "procedure within 7 days, or same member + same amount within 30 days "
            "across different providers."
        )
    )
    matching_claim_ids: List[str] = Field(
        description="List of claim IDs from history that this claim duplicates or near-duplicates.",
        default_factory=list
    )
    duplicate_confidence: float = Field(
        description="Confidence that this is a duplicate, 0.0–1.0."
    )


class Features(BaseModel):
    """
    A list of features for a single claim.
    """

    # --- Feature 1 ---
    line_item_deviations: List[LineItemDeviation] = Field(
        description="Tariff deviation analysis for each procedure line item."
    )

    # --- Feature 2 ---
    claim_frequency_anomaly: ClaimFrequencyAnomaly = Field(
        description="Analysis of whether the member's claim frequency is anomalous."
    )

    # --- Feature 3 ---
    provider_risk: ProviderRiskScore = Field(
        description="Risk profile of the submitting provider."
    )

    # --- Feature 4 ---
    member_utilization: MemberUtilizationTrend = Field(
        description="Member's benefit utilization trend and anomaly signals."
    )

    # --- Feature 5 ---
    duplicate_detection: DuplicateDetection = Field(
        description="Duplicate and near-duplicate claim detection result."
    )

    # --- Summary ---
    overall_risk_signals: List[str] = Field(
        description=(
            "Concise list of the most significant risk signals found across all features. "
            "Each entry is a single sentence. Empty list if no signals detected."
        )
    )

    user_message: str = Field(
        description=(
            "A friendly, first-person message to the user summarizing the risk analysis. "
            "Mention key findings: any tariff deviations, frequency anomalies, provider risk level, "
            "utilization concerns, or duplicate flags. Keep it concise but informative. "
            "Example: 'I analysed the claim and found that the consultation fee is 65% above the approved tariff. "
            "No duplicates were detected and the provider has a low risk profile.' Use 'I' not 'we'."
        ),
    )
