import type { Message } from "@langchain/langgraph-sdk"

export interface ClaimServiceItem {
  rmpc_procedure_code: string | null
  procedure: string
  total_billed: number
  copay_amount: number
  total_claimed: number
}

export interface InvoiceServiceItem {
  procedure: string
  amount: number
}

export interface ClaimFormSchema {
  patient_name: string
  member_id: string
  date_of_birth: string | null
  gender: string | null
  email: string | null
  phone: string | null
  visit_id: string
  treatment_date: string | null
  facility_name: string | null
  type_of_care: string | null
  pre_auth_number: string | null
  doctor_name: string | null
  doctor_specialization: string | null
  rmdc_reg_no: string | null
  referring_doctor: string | null
  referred_to: string | null
  icd_code: string | null
  diagnosis_description: string | null
  additional_diagnoses: string | null
  services: ClaimServiceItem[]
  total_claimed: number
}

export interface InvoiceSchema {
  patient_name: string
  member_id: string | null
  hospital_no: string | null
  hospital_name: string | null
  invoice_number: string | null
  invoice_date: string | null
  visit_type: string | null
  phone: string | null
  services: InvoiceServiceItem[]
  total_amount: number
}

export interface ClaimDetails {
  claim_form?: ClaimFormSchema
  invoice?: InvoiceSchema
  status: "complete" | "missing_invoice" | "missing_claim_form"
  match_reason: string
}

export interface LineItemDeviation {
  reasoning: string
  procedure_code: string
  description: string
  claimed_amount: number
  approved_tariff: number
  amount_deviation_pct: number
  amount_ratio: number
  is_unrecognised: boolean
}

export interface ClaimFrequencyAnomaly {
  reasoning: string
  claims_last_30_days: number
  claims_last_90_days: number
  avg_claims_per_month: number
  is_frequency_anomaly: boolean
  anomaly_severity: string
}

export interface ProviderRisk {
  reasoning: string
  provider_id: string
  historical_overbilling_rate: number
  historical_rejection_rate: number
  provider_risk_score: number
  risk_tier: string
}

export interface MemberUtilization {
  reasoning: string
  total_claimed_ytd: number
  benefit_limit: number
  utilization_rate_pct: number
  spend_acceleration: string
  dominant_category: string
  is_utilization_anomaly: boolean
}

export interface DuplicateDetection {
  reasoning: string
  is_duplicate: boolean
  is_near_duplicate: boolean
  matching_claim_ids: string[]
  duplicate_confidence: number
}

export interface Features {
  line_item_deviations: LineItemDeviation[]
  claim_frequency_anomaly: ClaimFrequencyAnomaly
  provider_risk: ProviderRisk
  member_utilization: MemberUtilization
  duplicate_detection: DuplicateDetection
  overall_risk_signals: string[]
}

export interface Score {
  claim_id: string
  risk_score: number
  decision: "PASS" | "FLAG" | "FAIL"
  confidence: number
  reason: string
}

export interface Claim {
  details: ClaimDetails
  features?: Features | null
  score?: Score | null
}

export interface AgentState {
  messages: Message[]
  claims: Claim[]
}

export type NodeName =
  | "extract_details"
  | "request_missing_details"
  | "compute_features"
  | "score_claim"
