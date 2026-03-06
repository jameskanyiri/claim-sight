from pydantic import BaseModel, Field

from src.pipeline.state.schema import ClaimDetails

class ExtractDetailsSchema(BaseModel):
    """Top-level extraction output. Groups related claim forms and invoices together and flags missing documents."""

    reason: str = Field(
        description=(
            "High-level summary of what was found: how many documents were processed, "
            "how many groups were formed, and whether any documents are missing or unmatched."
        ),
    )
    user_message: str = Field(
        description=(
            "A friendly, first-person message to the user summarizing what was extracted. "
            "Example: 'I found a claim form for patient John Doe (member ID 1536500) with 3 service items, "
            "and a matching invoice from King Faisal Hospital.' Use 'I' not 'we'."
        ),
    )
    claims: list[ClaimDetails] = Field(
        description=(
            "List of matched document groups. Each group pairs a claim form with its invoice "
            "based on shared patient info, dates, or facility. Unmatched documents get their own group "
            "with the appropriate missing status."
        ),
    )
