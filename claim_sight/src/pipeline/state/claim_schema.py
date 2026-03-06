from pydantic import BaseModel, Field
from typing import Literal, Optional


class ClaimServiceItem(BaseModel):
    """One line item from a claim form: a single procedure/service with its codes and amounts. Extract each row or line as a separate item."""

    rmpc_procedure_code: Optional[str] = Field(
        None,
        description="RMPC (Rwanda Medical and Dental Council) procedure code if present. Use the code as printed; leave null if not on the form.",
    )
    procedure: str = Field(
        description="Procedure or service name as stated on the claim (e.g. 'General consultation', 'X-Ray chest'). Required for each line.",
    )
    total_billed: Optional[float] = Field(
        None,
        ge=0,
        description="Total amount billed for this procedure. Non-negative number; leave null if not specified.",
    )
    copay_amount: Optional[float] = Field(
        None,
        ge=0,
        description="Patient copay or out-of-pocket amount for this line if shown. Non-negative; leave null if not applicable.",
    )
    total_claimed: Optional[float] = Field(
        None,
        ge=0,
        description="Amount claimed to the insurer for this procedure. Non-negative; leave null if not specified.",
    )


class ClaimFormSchema(BaseModel):
    """Structured data extracted from a healthcare claim form. Fill only fields that are clearly present; use null for missing or illegible values. Preserve exact spelling and codes."""

    # Patient
    patient_name: Optional[str] = Field(
        None,
        description="Patient's full name as on the claim form. Extract exactly as written.",
    )
    member_id: Optional[str] = Field(
        None,
        description="Insurance/scheme member ID or policy number. Often in a 'Member ID' or 'Policy No' field.",
    )
    date_of_birth: Optional[str] = Field(
        None,
        description="Patient date of birth. Prefer YYYY-MM-DD; otherwise use the format shown on the form.",
    )
    gender: Optional[str] = Field(
        None,
        description="Patient gender if indicated (e.g. Male, Female, Other). Use the form's wording.",
    )
    email: Optional[str] = Field(
        None,
        description="Patient email address if provided on the claim.",
    )
    phone: Optional[str] = Field(
        None,
        description="Patient contact phone number. Include country code only if shown.",
    )

    # Visit
    visit_id: Optional[str] = Field(
        None,
        description="Visit ID, encounter ID, or reference number for this claim if present.",
    )
    treatment_date: Optional[str] = Field(
        None,
        description="Date of treatment or service. Prefer YYYY-MM-DD; otherwise exact string from the form.",
    )
    facility_name: Optional[str] = Field(
        None,
        description="Name of the hospital, clinic, or facility where care was provided.",
    )
    type_of_care: Optional[str] = Field(
        None,
        description="Category of care: e.g. Outpatient, Inpatient, Dental, Optical, Maternity. Use the form's terminology.",
    )
    pre_auth_number: Optional[str] = Field(
        None,
        description="Pre-authorisation or prior approval number if the form has one. Leave null if not applicable.",
    )

    # Practitioner
    doctor_name: Optional[str] = Field(
        None,
        description="Name of the treating doctor or primary practitioner as on the form.",
    )
    doctor_specialization: Optional[str] = Field(
        None,
        description="Specialty or qualification of the treating doctor (e.g. General Practitioner, Surgeon).",
    )
    rmdc_reg_no: Optional[str] = Field(
        None,
        description="RMDC (Rwanda Medical and Dental Council) registration number of the practitioner if shown.",
    )
    referring_doctor: Optional[str] = Field(
        None,
        description="Name of the referring doctor if this is a referral claim. Leave null if not applicable.",
    )
    referred_to: Optional[str] = Field(
        None,
        description="Name or facility referred to, if indicated. Leave null if not a referral.",
    )

    # Diagnosis
    icd_code: Optional[str] = Field(
        None,
        description="ICD-10 or other diagnosis code if present (e.g. J06.9). Use code as printed.",
    )
    diagnosis_description: Optional[str] = Field(
        None,
        description="Main diagnosis or condition description in plain text as on the form.",
    )
    additional_diagnoses: Optional[str] = Field(
        None,
        description="Secondary, underlying, or additional diagnoses if listed. Can be comma-separated or a single string.",
    )

    # Services
    services: list[ClaimServiceItem] = Field(
        default_factory=list,
        description="Each procedure/service line from the claim with RMPC code (if any), procedure name, and amounts (billed, copay, claimed). One entry per line item.",
    )
    total_claimed: Optional[float] = Field(
        None,
        ge=0,
        description="Total amount claimed to the insurer for this claim. Must be a non-negative number.",
    )


class InvoiceServiceItem(BaseModel):
    """A single line item (procedure/service and its charge) from an invoice. Extract each billed item as a separate entry."""

    procedure: str = Field(
        description="Exact procedure or service name as shown on the invoice (e.g. 'Consultation', 'Lab - CBC'). Do not abbreviate unless that is how it appears."
    )
    amount: float = Field(
        ge=0,
        description="Numeric amount charged for this procedure in the document's currency. Use the figure as printed; no conversion.",
    )


class InvoiceSchema(BaseModel):
    """Structured data extracted from a healthcare invoice. Extract only what is clearly present; use null for missing or ambiguous fields."""

    patient_name: Optional[str] = Field(
        None,
        description="Full name of the patient as shown on the invoice (e.g. 'John Doe'). Leave null if not found.",
    )
    member_id: Optional[str] = Field(
        None,
        description="Insurance or scheme member ID / policy number if present on the invoice.",
    )
    hospital_no: Optional[str] = Field(
        None,
        description="Hospital or facility patient number / MRN. Often labelled 'Hospital No', 'Patient ID', or 'MRN'.",
    )
    hospital_name: Optional[str] = Field(
        None,
        description="Name of the hospital, clinic, or facility that issued the invoice.",
    )
    invoice_number: Optional[str] = Field(
        None,
        description="Invoice or receipt number as printed. Preserve leading zeros if any.",
    )
    invoice_date: Optional[str] = Field(
        None,
        description="Date of the invoice in YYYY-MM-DD format if possible, otherwise the exact string as shown (e.g. '01-Mar-2025').",
    )
    visit_type: Optional[str] = Field(
        None,
        description="Type of visit if stated (e.g. 'Outpatient', 'Inpatient', 'Emergency', 'Follow-up').",
    )
    phone: Optional[str] = Field(
        None,
        description="Patient or facility phone number if present. Include country code only if shown.",
    )
    services: list[InvoiceServiceItem] = Field(
        default_factory=list,
        description="List of each billed procedure or service with its amount. One entry per line item; do not merge or summarize.",
    )
    total_amount: Optional[float] = Field(
        None,
        ge=0,
        description="Total amount due or paid as shown on the invoice. Must be a non-negative number.",
    )


class ClaimDetails(BaseModel):
    """A matched group of related documents for a single patient visit/encounter. Pairs a claim form with its supporting invoice when both are present, or holds whichever is available."""

    claim_form: Optional[ClaimFormSchema] = Field(
        None,
        description="Extracted claim form data if a claim form is present for this group. Null if only an invoice was found.",
    )
    invoice: Optional[InvoiceSchema] = Field(
        None,
        description="Extracted invoice data if an invoice is present for this group. Null if only a claim form was found.",
    )
    status: Literal["complete", "missing_invoice", "missing_claim_form"] = Field(
        description=(
            "Completeness of this group: "
            "'complete' = both claim form and invoice present; "
            "'missing_invoice' = claim form found but no matching invoice; "
            "'missing_claim_form' = invoice found but no matching claim form."
        ),
    )
    match_reason: str = Field(
        description=(
            "Brief explanation of why these documents were grouped together "
            "(e.g. same patient name, same member ID, same treatment date, same facility). "
            "If a document is unmatched, explain what is missing."
        ),
    )
