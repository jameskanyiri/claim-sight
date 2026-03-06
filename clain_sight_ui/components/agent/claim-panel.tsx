"use client"

import * as React from "react"
import { CheckCircle2, AlertTriangle, XCircle, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useAgent } from "./agent-provider"
import { ClaimPipeline, TABS, getTabStatus, StatusDot } from "./claim-pipeline"
import type { NodeName } from "./types"

function getClaimLabel(claim: { details?: { claim_form?: { patient_name?: string | null }; invoice?: { patient_name?: string | null } } | null }, index: number) {
  return (
    claim.details?.claim_form?.patient_name ||
    claim.details?.invoice?.patient_name ||
    `Claim ${index + 1}`
  )
}

function getClaimDecision(claim: { score?: { decision?: string } | null }) {
  return claim.score?.decision ?? null
}

function ClaimTabIcon({ decision, isActive }: { decision: string | null; isActive: boolean }) {
  if (!decision) {
    if (isActive) return <Loader2 className="size-3 animate-spin" />
    return <div className="size-2 rounded-full bg-muted-foreground/30" />
  }
  if (decision === "PASS") return <CheckCircle2 className="size-3 text-green-600" />
  if (decision === "FLAG") return <AlertTriangle className="size-3 text-yellow-600" />
  return <XCircle className="size-3 text-red-600" />
}

type PipelineTab = typeof TABS[number]["key"]

export function ClaimPanel() {
  const { claims, activeNode, isLoading } = useAgent()
  const [activeClaimIndex, setActiveClaimIndex] = React.useState(0)
  const [activeTab, setActiveTab] = React.useState<PipelineTab>("extract_details")

  // Keep active index in bounds
  React.useEffect(() => {
    if (activeClaimIndex >= claims.length && claims.length > 0) {
      setActiveClaimIndex(claims.length - 1)
    }
  }, [claims.length, activeClaimIndex])

  // Auto-switch to the latest claim when a new one appears
  const prevClaimCount = React.useRef(claims.length)
  React.useEffect(() => {
    if (claims.length > prevClaimCount.current) {
      setActiveClaimIndex(claims.length - 1)
      setActiveTab("extract_details")
    }
    prevClaimCount.current = claims.length
  }, [claims.length])

  if (claims.length === 0 && !isLoading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        <p className="text-sm">Claim results will appear here</p>
      </div>
    )
  }

  const activeClaim = claims[activeClaimIndex]
  const currentActiveNode: NodeName | null =
    activeClaimIndex === claims.length - 1 ? activeNode : null

  return (
    <div className="flex h-full flex-col">
      {/* Browser-like claim tabs at top */}
      {claims.length > 1 && (
        <div className="flex items-end gap-0 border-b bg-muted/30 px-2 pt-2">
          {claims.map((claim, i) => {
            const label = getClaimLabel(claim, i)
            const decision = getClaimDecision(claim)
            const isSelected = i === activeClaimIndex
            const isProcessing = isLoading && i === claims.length - 1 && !claim.score

            return (
              <button
                key={i}
                onClick={() => {
                  setActiveClaimIndex(i)
                  setActiveTab("extract_details")
                }}
                className={cn(
                  "relative flex items-center gap-1.5 rounded-t-lg px-4 py-2 text-sm font-medium transition-colors",
                  isSelected
                    ? "bg-background text-foreground shadow-[0_-1px_3px_rgba(0,0,0,0.05)] border border-b-0 border-border -mb-px z-10"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <ClaimTabIcon decision={decision} isActive={isProcessing} />
                <span className="max-w-[120px] truncate">{label}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* Claim content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeClaim && (
          <ClaimPipeline
            claims={[activeClaim]}
            activeNode={currentActiveNode}
            isLoading={isLoading && activeClaimIndex === claims.length - 1}
            activeTab={activeTab}
          />
        )}
      </div>

      {/* Footer pipeline tabs */}
      {claims.length > 0 && (
        <div className="grid grid-cols-3 border-t bg-muted/30">
          {TABS.map((tab) => {
            const status = activeClaim
              ? getTabStatus(tab.key, activeClaim, currentActiveNode)
              : "pending"
            const isSelected = activeTab === tab.key

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "flex items-center justify-center gap-1.5 border-r last:border-r-0 px-2 py-2.5 text-sm font-medium transition-colors",
                  isSelected
                    ? "bg-background text-foreground border-t-2 border-t-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                )}
              >
                <StatusDot status={status} />
                {tab.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
