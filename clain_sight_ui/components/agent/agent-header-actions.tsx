"use client"

import { History, Loader2, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAgent } from "./agent-provider"

function formatDate(dateStr: string) {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString()
}

export function AgentHeaderActions() {
  const { switchThread, threadHistory, threadId, isLoadingThreads, refreshThreads } = useAgent()

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="size-8"
        onClick={() => {
          switchThread(null)
        }}
      >
        <Plus className="size-4" />
        <span className="sr-only">New thread</span>
      </Button>
      <DropdownMenu onOpenChange={(open) => { if (open) refreshThreads() }}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="size-8">
            <History className="size-4" />
            <span className="sr-only">Thread history</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-80 w-72 overflow-y-auto">
          <DropdownMenuLabel>Thread History</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {isLoadingThreads && threadHistory.length === 0 ? (
            <div className="flex items-center justify-center px-2 py-4">
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            </div>
          ) : threadHistory.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              No previous threads
            </div>
          ) : (
            threadHistory.map((thread) => (
              <DropdownMenuItem
                key={thread.id}
                className="flex flex-col items-start gap-0.5"
                onSelect={() => switchThread(thread.id)}
              >
                <span
                  className={`w-full truncate text-sm ${thread.id === threadId ? "font-semibold" : ""}`}
                >
                  {thread.preview || "Untitled thread"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(thread.updatedAt)}
                </span>
              </DropdownMenuItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
