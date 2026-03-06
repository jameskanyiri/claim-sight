"use client"

import type { Claim, NodeName } from "./types"
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldAlert,
  Activity,
  Copy,
  TrendingUp,
  User,
  Building2,
  Calendar,
  Stethoscope,
  FileText,
  Receipt,
  ClipboardList,
  Info,
} from "lucide-react"

interface ClaimPipelineProps {
  claims: Claim[]
  activeNode: NodeName | null
  isLoading: boolean
}

const TABS = [
  { key: "extract_details" as const, label: "Claim Details" },
  { key: "compute_features" as const, label: "Features" },
  { key: "score_claim" as const, label: "Score" },
]

function getTabStatus(
  tab: (typeof TABS)[number]["key"],
  claim: Claim,
  activeNode: NodeName | null,
): "pending" | "active" | "done" {
  if (activeNode === tab) return "active"
  switch (tab) {
    case "extract_details":
      return claim.details ? "done" : "pending"
    case "compute_features":
      return claim.features ? "done" : "pending"
    case "score_claim":
      return claim.score ? "done" : "pending"
  }
}

function DecisionBadge({ decision }: { decision: "PASS" | "FLAG" | "FAIL" }) {
  const config = {
    PASS: {
      icon: CheckCircle2,
      className: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    },
    FLAG: {
      icon: AlertTriangle,
      className: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    },
    FAIL: {
      icon: XCircle,
      className: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    },
  }[decision]

  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-semibold ${config.className}`}
    >
      <Icon className="size-3" />
      {decision}
    </span>
  )
}

function RiskTierBadge({ tier }: { tier: string }) {
  const config: Record<string, string> = {
    LOW: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    HIGH: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-sm font-semibold ${config[tier] ?? "bg-muted text-muted-foreground"}`}
    >
      {tier}
    </span>
  )
}

function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, string> = {
    NONE: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    LOW: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    MEDIUM: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    HIGH: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  }

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-sm font-semibold ${config[severity] ?? "bg-muted text-muted-foreground"}`}
    >
      {severity}
    </span>
  )
}

function StatusDot({ status }: { status: "pending" | "active" | "done" }) {
  if (status === "active") return <Loader2 className="size-3 animate-spin" />
  if (status === "done") return <CheckCircle2 className="size-3 text-green-600" />
  return <div className="size-2 rounded-full bg-muted-foreground/30" />
}


function StatusBanner({ status, matchReason }: { status: string; matchReason: string }) {
  const isComplete = status === "complete"
  const config = isComplete
    ? {
        bg: "bg-green-50 dark:bg-green-950",
        border: "border-green-200 dark:border-green-900",
        icon: CheckCircle2,
        iconColor: "text-green-600 dark:text-green-400",
        label: "Complete",
      }
    : {
        bg: "bg-yellow-50 dark:bg-yellow-950",
        border: "border-yellow-200 dark:border-yellow-900",
        icon: AlertTriangle,
        iconColor: "text-yellow-600 dark:text-yellow-400",
        label: status.replace(/_/g, " "),
      }

  const Icon = config.icon

  return (
    <div className={`rounded-lg border ${config.border} ${config.bg} p-3`}>
      <div className="flex items-start gap-2.5">
        <Icon className={`mt-0.5 size-4 shrink-0 ${config.iconColor}`} />
        <div>
          <p className="text-sm font-semibold capitalize">{config.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{matchReason}</p>
        </div>
      </div>
    </div>
  )
}

function DetailCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b bg-muted/30 px-3 py-2">
        <Icon className="size-4 text-muted-foreground" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

function DetailGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">{children}</div>
}

function DetailItem({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === "" || value === "-") return null
  return (
    <>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </>
  )
}

function ExtractDetailsContent({ claim }: { claim: Claim }) {
  if (!claim.details) {
    return <p className="text-sm text-muted-foreground">Waiting for extraction...</p>
  }

  const { claim_form, invoice } = claim.details

  return (
    <div className="space-y-3 text-sm">
      {/* Status Banner */}
      <StatusBanner status={claim.details.status} matchReason={claim.details.match_reason} />

      {/* Summary Cards */}
      {claim_form && (
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xl font-bold">{claim_form.total_claimed.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Claimed</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="text-xl font-bold">{claim_form.services.length}</p>
            <p className="text-xs text-muted-foreground">Services</p>
          </div>
          <div className="rounded-lg border bg-card p-3 text-center">
            <p className="truncate text-xl font-bold capitalize">{claim_form.type_of_care ?? "—"}</p>
            <p className="text-xs text-muted-foreground">Type of Care</p>
          </div>
        </div>
      )}

      {/* Claim Form */}
      {claim_form && (
        <DetailCard icon={ClipboardList} title="Claim Form">
          <div className="space-y-4">
            {/* Patient Info */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <User className="size-3" /> Patient
              </p>
              <DetailGrid>
                <DetailItem label="Name" value={claim_form.patient_name} />
                <DetailItem label="Member ID" value={claim_form.member_id} />
                <DetailItem label="Visit ID" value={claim_form.visit_id} />
                <DetailItem label="DOB" value={claim_form.date_of_birth} />
                <DetailItem label="Gender" value={claim_form.gender === "M" ? "Male" : claim_form.gender === "F" ? "Female" : claim_form.gender} />
                <DetailItem label="Email" value={claim_form.email} />
                <DetailItem label="Phone" value={claim_form.phone} />
              </DetailGrid>
            </div>

            {/* Visit Info */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Calendar className="size-3" /> Visit
              </p>
              <DetailGrid>
                <DetailItem label="Treatment Date" value={claim_form.treatment_date} />
                <DetailItem label="Facility" value={claim_form.facility_name} />
                <DetailItem label="Type of Care" value={claim_form.type_of_care} />
                <DetailItem label="Pre-Auth #" value={claim_form.pre_auth_number} />
              </DetailGrid>
            </div>

            {/* Doctor Info */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Stethoscope className="size-3" /> Doctor
              </p>
              <DetailGrid>
                <DetailItem label="Name" value={claim_form.doctor_name} />
                <DetailItem label="Specialization" value={claim_form.doctor_specialization} />
                <DetailItem label="Referring Doctor" value={claim_form.referring_doctor} />
                <DetailItem label="Referred To" value={claim_form.referred_to} />
              </DetailGrid>
            </div>

            {/* Diagnosis */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Info className="size-3" /> Diagnosis
              </p>
              <DetailGrid>
                <DetailItem label="ICD Code" value={claim_form.icd_code} />
                <DetailItem label="Description" value={claim_form.diagnosis_description} />
                <DetailItem label="Additional" value={claim_form.additional_diagnoses} />
              </DetailGrid>
            </div>

            {/* Services Table */}
            {claim_form.services.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Services</p>
                <div className="rounded-md border">
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="w-1/4 px-2 py-1.5 text-left font-medium text-muted-foreground">Procedure</th>
                        <th className="w-1/4 px-2 py-1.5 text-right font-medium text-muted-foreground">Billed</th>
                        <th className="w-1/4 px-2 py-1.5 text-right font-medium text-muted-foreground">Copay</th>
                        <th className="w-1/4 px-2 py-1.5 text-right font-medium text-muted-foreground">Claimed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {claim_form.services.map((s, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="truncate px-2 py-1.5">{s.procedure}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{s.total_billed.toLocaleString()}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{s.copay_amount.toLocaleString()}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{s.total_claimed.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/30 font-semibold">
                        <td className="px-2 py-1.5" colSpan={3}>Total Claimed</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{claim_form.total_claimed.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </DetailCard>
      )}

      {/* Invoice */}
      {invoice && (
        <DetailCard icon={Receipt} title="Invoice">
          <div className="space-y-4">
            {/* Invoice Header */}
            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Building2 className="size-3" /> Provider
              </p>
              <DetailGrid>
                <DetailItem label="Hospital" value={invoice.hospital_name} />
                <DetailItem label="Hospital #" value={invoice.hospital_no} />
                <DetailItem label="Invoice #" value={invoice.invoice_number} />
                <DetailItem label="Invoice Date" value={invoice.invoice_date} />
                <DetailItem label="Visit Type" value={invoice.visit_type} />
              </DetailGrid>
            </div>

            <div>
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <User className="size-3" /> Patient
              </p>
              <DetailGrid>
                <DetailItem label="Name" value={invoice.patient_name} />
                <DetailItem label="Member ID" value={invoice.member_id} />
                <DetailItem label="Phone" value={invoice.phone} />
              </DetailGrid>
            </div>

            {/* Invoice Services */}
            {invoice.services.length > 0 && (
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Services</p>
                <div className="rounded-md border">
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="w-1/2 px-2 py-1.5 text-left font-medium text-muted-foreground">Procedure</th>
                        <th className="w-1/2 px-2 py-1.5 text-right font-medium text-muted-foreground">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.services.map((s, i) => (
                        <tr key={i} className="border-b last:border-0">
                          <td className="truncate px-2 py-1.5">{s.procedure}</td>
                          <td className="px-2 py-1.5 text-right tabular-nums">{s.amount.toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t bg-muted/30 font-semibold">
                        <td className="px-2 py-1.5">Total</td>
                        <td className="px-2 py-1.5 text-right tabular-nums">{invoice.total_amount.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </DetailCard>
      )}

      {/* No Invoice / No Claim Form warnings */}
      {!invoice && claim.details.status === "missing_invoice" && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950">
          <div className="flex items-center gap-2">
            <FileText className="size-4 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">No invoice document was provided for this claim.</p>
          </div>
        </div>
      )}

      {!claim_form && claim.details.status === "missing_claim_form" && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950">
          <div className="flex items-center gap-2">
            <ClipboardList className="size-4 text-yellow-600 dark:text-yellow-400" />
            <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">No claim form was provided for this claim.</p>
          </div>
        </div>
      )}
    </div>
  )
}

function DeviationBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100)
  const color =
    pct >= 30
      ? "bg-red-500 dark:bg-red-400"
      : pct >= 20
        ? "bg-yellow-500 dark:bg-yellow-400"
        : "bg-green-500 dark:bg-green-400"
  return (
    <div className="h-1.5 w-full rounded-full bg-muted">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}

function UtilizationBar({ pct }: { pct: number }) {
  const clamped = Math.min(pct, 100)
  const color =
    pct >= 80
      ? "bg-red-500 dark:bg-red-400"
      : pct >= 60
        ? "bg-yellow-500 dark:bg-yellow-400"
        : "bg-green-500 dark:bg-green-400"
  return (
    <div className="h-2 w-full rounded-full bg-muted">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${clamped}%` }} />
    </div>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  status,
  children,
}: {
  icon: React.ElementType
  title: string
  status?: "ok" | "warning" | "danger"
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="size-4 text-muted-foreground" />
          <span className="text-sm font-semibold">{title}</span>
        </div>
        {status === "ok" && (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-3" /> OK
          </span>
        )}
        {status === "warning" && (
          <span className="flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400">
            <AlertTriangle className="size-3" /> Warning
          </span>
        )}
        {status === "danger" && (
          <span className="flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400">
            <XCircle className="size-3" /> Alert
          </span>
        )}
      </div>
      {children}
    </div>
  )
}

function ComputeFeaturesContent({ claim }: { claim: Claim }) {
  if (!claim.features) {
    return <p className="text-sm text-muted-foreground">Waiting for feature computation...</p>
  }

  const { line_item_deviations, claim_frequency_anomaly, provider_risk, member_utilization, duplicate_detection, overall_risk_signals } = claim.features

  const maxDeviation = Math.max(...line_item_deviations.map((d) => d.amount_deviation_pct))
  const deviationStatus = maxDeviation >= 30 ? "danger" : maxDeviation >= 20 ? "warning" : "ok"

  const frequencyStatus = claim_frequency_anomaly.is_frequency_anomaly
    ? claim_frequency_anomaly.anomaly_severity === "HIGH" ? "danger" : "warning"
    : "ok"

  const providerStatus =
    provider_risk.risk_tier === "HIGH" ? "danger" : provider_risk.risk_tier === "MEDIUM" ? "warning" : "ok"

  const utilizationStatus = member_utilization.is_utilization_anomaly
    ? member_utilization.utilization_rate_pct >= 90 ? "danger" : "warning"
    : "ok"

  const duplicateStatus = duplicate_detection.is_duplicate
    ? "danger"
    : duplicate_detection.is_near_duplicate
      ? "warning"
      : "ok"

  return (
    <div className="space-y-3 text-sm">
      {/* Risk Signals Banner */}
      {overall_risk_signals.length > 0 && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900 dark:bg-yellow-950">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-yellow-700 dark:text-yellow-300">
            <AlertTriangle className="size-3.5" />
            Risk Signals ({overall_risk_signals.length})
          </div>
          <ul className="space-y-1.5">
            {overall_risk_signals.map((signal, i) => (
              <li key={i} className="flex gap-2 text-yellow-800 dark:text-yellow-200">
                <span className="mt-1 block size-1.5 shrink-0 rounded-full bg-yellow-500" />
                <span>{signal}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Line Item Deviations */}
      <FeatureCard icon={TrendingUp} title="Line Item Deviations" status={deviationStatus}>
        <div className="rounded-md border">
          <table className="w-full table-fixed text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="w-1/4 px-2 py-1.5 text-left font-medium text-muted-foreground">Procedure</th>
                <th className="w-1/4 px-2 py-1.5 text-right font-medium text-muted-foreground">Claimed</th>
                <th className="w-1/4 px-2 py-1.5 text-right font-medium text-muted-foreground">Tariff</th>
                <th className="w-1/4 px-2 py-1.5 text-right font-medium text-muted-foreground">Dev.</th>
              </tr>
            </thead>
            <tbody>
              {line_item_deviations.map((item, i) => (
                <tr key={i} className="border-b last:border-0">
                  <td className="w-1/4 px-2 py-1.5">
                    <div className="truncate font-medium">{item.description}</div>
                    <div className="truncate font-mono text-xs text-muted-foreground">{item.procedure_code}</div>
                  </td>
                  <td className="w-1/4 px-2 py-1.5 text-right tabular-nums">{item.claimed_amount.toLocaleString()}</td>
                  <td className="w-1/4 px-2 py-1.5 text-right tabular-nums">{item.approved_tariff.toLocaleString()}</td>
                  <td className="w-1/4 px-2 py-1.5">
                    <div className="flex flex-col items-end gap-1">
                      <span className={`tabular-nums font-medium ${item.amount_deviation_pct >= 30 ? "text-red-600 dark:text-red-400" : item.amount_deviation_pct >= 20 ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
                        +{item.amount_deviation_pct.toFixed(1)}%
                      </span>
                      <DeviationBar pct={item.amount_deviation_pct} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FeatureCard>

      {/* Claim Frequency + Provider Risk side by side on larger panels */}
      <div className="grid gap-3 sm:grid-cols-2">
        <FeatureCard icon={Activity} title="Claim Frequency" status={frequencyStatus}>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div>
              <div className="text-lg font-bold">{claim_frequency_anomaly.claims_last_30_days}</div>
              <div className="text-xs text-muted-foreground">Last 30d</div>
            </div>
            <div>
              <div className="text-lg font-bold">{claim_frequency_anomaly.claims_last_90_days}</div>
              <div className="text-xs text-muted-foreground">Last 90d</div>
            </div>
            <div>
              <div className="text-lg font-bold">{claim_frequency_anomaly.avg_claims_per_month}</div>
              <div className="text-xs text-muted-foreground">Avg/mo</div>
            </div>
          </div>
        </FeatureCard>

        <FeatureCard icon={ShieldAlert} title="Provider Risk" status={providerStatus}>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Provider</span>
              <span className="font-mono text-xs">{provider_risk.provider_id}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Risk Score</span>
              <span className="font-medium">{(provider_risk.provider_risk_score * 100).toFixed(0)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Tier</span>
              <RiskTierBadge tier={provider_risk.risk_tier} />
            </div>
          </div>
        </FeatureCard>
      </div>

      {/* Member Utilization */}
      <FeatureCard icon={Activity} title="Member Utilization" status={utilizationStatus}>
        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">{member_utilization.utilization_rate_pct}%</span>
            <span className="text-xs text-muted-foreground">
              {member_utilization.total_claimed_ytd.toLocaleString()} / {member_utilization.benefit_limit.toLocaleString()}
            </span>
          </div>
          <UtilizationBar pct={member_utilization.utilization_rate_pct} />
          <div className="flex gap-4 text-xs text-muted-foreground">
            <span>Acceleration: <span className="font-medium text-foreground">{member_utilization.spend_acceleration}</span></span>
            <span>Category: <span className="font-medium capitalize text-foreground">{member_utilization.dominant_category}</span></span>
          </div>
        </div>
      </FeatureCard>

      {/* Duplicate Detection */}
      <FeatureCard icon={Copy} title="Duplicate Detection" status={duplicateStatus}>
        <div className="space-y-2">
          <div className="flex gap-3">
            <div className={`flex-1 rounded-md p-2 text-center ${duplicate_detection.is_duplicate ? "bg-red-100 dark:bg-red-950" : "bg-muted/50"}`}>
              <div className={`text-sm font-bold ${duplicate_detection.is_duplicate ? "text-red-600 dark:text-red-400" : ""}`}>
                {duplicate_detection.is_duplicate ? "Yes" : "No"}
              </div>
              <div className="text-xs text-muted-foreground">Exact Match</div>
            </div>
            <div className={`flex-1 rounded-md p-2 text-center ${duplicate_detection.is_near_duplicate ? "bg-yellow-100 dark:bg-yellow-950" : "bg-muted/50"}`}>
              <div className={`text-sm font-bold ${duplicate_detection.is_near_duplicate ? "text-yellow-600 dark:text-yellow-400" : ""}`}>
                {duplicate_detection.is_near_duplicate ? "Yes" : "No"}
              </div>
              <div className="text-xs text-muted-foreground">Near Match</div>
            </div>
            <div className="flex-1 rounded-md bg-muted/50 p-2 text-center">
              <div className="text-sm font-bold">{(duplicate_detection.duplicate_confidence * 100).toFixed(0)}%</div>
              <div className="text-xs text-muted-foreground">Confidence</div>
            </div>
          </div>
          {duplicate_detection.matching_claim_ids.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              <span className="text-xs text-muted-foreground">Matching:</span>
              {duplicate_detection.matching_claim_ids.map((id) => (
                <span key={id} className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-xs">{id}</span>
              ))}
            </div>
          )}
        </div>
      </FeatureCard>
    </div>
  )
}

function RiskScoreGauge({ score }: { score: number }) {
  const pct = score * 100
  const color =
    pct >= 50
      ? "text-red-600 dark:text-red-400"
      : pct >= 25
        ? "text-yellow-600 dark:text-yellow-400"
        : "text-green-600 dark:text-green-400"
  const trackColor =
    pct >= 50
      ? "stroke-red-500"
      : pct >= 25
        ? "stroke-yellow-500"
        : "stroke-green-500"

  const radius = 40
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference - (pct / 100) * circumference

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" className="-rotate-90">
        <circle cx="50" cy="50" r={radius} fill="none" strokeWidth="8" className="stroke-muted" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          strokeWidth="8"
          strokeLinecap="round"
          className={trackColor}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className={`text-xl font-bold ${color}`}>{pct.toFixed(1)}%</span>
      </div>
    </div>
  )
}

function ScoreClaimContent({ claim }: { claim: Claim }) {
  if (!claim.score) {
    return <p className="text-sm text-muted-foreground">Waiting for scoring...</p>
  }

  const { decision, risk_score, confidence, claim_id, reason } = claim.score

  const decisionConfig = {
    PASS: {
      bg: "bg-green-50 dark:bg-green-950",
      border: "border-green-200 dark:border-green-900",
      text: "text-green-800 dark:text-green-200",
      label: "Approved",
      description: "This claim has passed automated review.",
    },
    FLAG: {
      bg: "bg-yellow-50 dark:bg-yellow-950",
      border: "border-yellow-200 dark:border-yellow-900",
      text: "text-yellow-800 dark:text-yellow-200",
      label: "Flagged for Review",
      description: "This claim requires manual review.",
    },
    FAIL: {
      bg: "bg-red-50 dark:bg-red-950",
      border: "border-red-200 dark:border-red-900",
      text: "text-red-800 dark:text-red-200",
      label: "Rejected",
      description: "This claim has been flagged as high risk.",
    },
  }[decision]

  return (
    <div className="space-y-4 text-sm">
      {/* Decision Banner */}
      <div className={`rounded-lg border ${decisionConfig.border} ${decisionConfig.bg} p-4`}>
        <div className="flex items-center gap-3">
          <DecisionBadge decision={decision} />
          <div>
            <p className={`font-semibold ${decisionConfig.text}`}>{decisionConfig.label}</p>
            <p className="text-xs text-muted-foreground">{decisionConfig.description}</p>
          </div>
        </div>
      </div>

      {/* Score + Confidence */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col items-center rounded-lg border bg-card p-4">
          <RiskScoreGauge score={risk_score} />
          <span className="mt-2 text-xs font-medium text-muted-foreground">Risk Score</span>
        </div>
        <div className="flex flex-col items-center justify-center rounded-lg border bg-card p-4">
          <span className="text-3xl font-bold">{(confidence * 100).toFixed(0)}%</span>
          <span className="mt-1 text-xs font-medium text-muted-foreground">Confidence</span>
          <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Claim ID */}
      <div className="flex items-center justify-between rounded-lg border bg-card px-4 py-3">
        <span className="text-muted-foreground">Claim ID</span>
        <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">{claim_id}</span>
      </div>

      {/* Reason */}
      <div className="rounded-lg border bg-card p-4">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Reason</p>
        <p className="leading-relaxed">{reason}</p>
      </div>
    </div>
  )
}

function ClaimContent({
  claim,
  activeTab,
}: {
  claim: Claim
  activeTab: typeof TABS[number]["key"]
}) {
  return (
    <div>
      {activeTab === "extract_details" && <ExtractDetailsContent claim={claim} />}
      {activeTab === "compute_features" && <ComputeFeaturesContent claim={claim} />}
      {activeTab === "score_claim" && <ScoreClaimContent claim={claim} />}
    </div>
  )
}

export { TABS, getTabStatus, StatusDot }

export function ClaimPipeline({
  claims,
  activeNode,
  isLoading,
  activeTab = "extract_details",
}: ClaimPipelineProps & { activeTab?: typeof TABS[number]["key"] }) {
  if (claims.length === 0 && !isLoading) return null

  return (
    <div className="space-y-6">
      {claims.map((claim, i) => (
        <ClaimContent key={i} claim={claim} activeTab={activeTab} />
      ))}
    </div>
  )
}
