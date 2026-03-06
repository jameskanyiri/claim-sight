"use client"

import { Suspense } from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { AgentChat } from "@/components/agent/agent-chat"
import { AgentHeaderActions } from "@/components/agent/agent-header-actions"
import { AgentProvider } from "@/components/agent/agent-provider"
import { ClaimPanel } from "@/components/agent/claim-panel"

export default function Home() {
  return (
    <Suspense>
      <AgentProvider>
        <div className="flex h-svh flex-col">
          <header className="flex h-14 shrink-0 items-center border-b px-4">
            <div className="flex w-full items-center justify-between">
              <h1 className="text-sm font-semibold">Agent</h1>
              <AgentHeaderActions />
            </div>
          </header>
          <ResizablePanelGroup orientation="horizontal" className="min-h-0 flex-1">
            <ResizablePanel defaultSize={35} minSize={25}>
              <div className="flex h-full flex-col p-4 pt-0">
                <AgentChat />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel defaultSize={65} minSize={30}>
              <ClaimPanel />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </AgentProvider>
    </Suspense>
  )
}
