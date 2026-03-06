"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { useStream } from "@langchain/langgraph-sdk/react"
import { Client, type Message } from "@langchain/langgraph-sdk"
import type { AgentState, Claim, NodeName } from "./types"

export interface ThreadEntry {
  id: string
  createdAt: string
  updatedAt: string
  preview: string
}

interface AgentContextValue {
  messages: Message[]
  claims: Claim[]
  activeNode: NodeName | null
  isLoading: boolean
  error: unknown
  threadId: string | null
  threadHistory: ThreadEntry[]
  isLoadingThreads: boolean
  submit: (content: string, files?: File[]) => void
  stop: () => Promise<void>
  switchThread: (threadId: string | null) => void
  refreshThreads: () => void
}

const AgentContext = React.createContext<AgentContextValue | null>(null)

function inferActiveNode(claims: Claim[], isLoading: boolean): NodeName | null {
  if (!isLoading) return null
  if (claims.length === 0) return "extract_details"

  const lastClaim = claims[claims.length - 1]
  if (!lastClaim.details) return "extract_details"
  if (lastClaim.details.status !== "complete") return "request_missing_details"
  if (!lastClaim.features) return "compute_features"
  if (!lastClaim.score) return "score_claim"

  return null
}

function getPreview(extracted: Record<string, unknown> | undefined): string {
  if (!extracted) return "Conversation"
  const firstMsg = extracted.first_message as { content?: string } | undefined
  if (firstMsg && typeof firstMsg.content === "string") {
    return firstMsg.content.slice(0, 80)
  }
  return "Conversation"
}

export function AgentProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const threadIdFromUrl = searchParams.get("thread")

  const [threadId, setThreadId] = React.useState<string | null>(threadIdFromUrl)
  const [threadHistory, setThreadHistory] = React.useState<ThreadEntry[]>([])
  const [isLoadingThreads, setIsLoadingThreads] = React.useState(false)

  const clientRef = React.useRef(
    new Client({ apiUrl: process.env.NEXT_PUBLIC_LANGGRAPH_API_URL })
  )

  const fetchThreads = React.useCallback(async () => {
    setIsLoadingThreads(true)
    try {
      const threads = await clientRef.current.threads.search({
        limit: 50,
        sortBy: "updated_at",
        sortOrder: "desc",
        extract: { first_message: "values.messages[0]" },
      })
      const entries: ThreadEntry[] = threads.map((t) => ({
        id: t.thread_id,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        preview: getPreview((t as unknown as Record<string, unknown>).extracted as Record<string, unknown> | undefined),
      }))
      setThreadHistory(entries)
    } catch (err) {
      console.error("Failed to fetch threads:", err)
    } finally {
      setIsLoadingThreads(false)
    }
  }, [])

  React.useEffect(() => {
    fetchThreads()
  }, [fetchThreads])

  const updateUrl = React.useCallback(
    (id: string | null) => {
      if (id) {
        router.replace(`?thread=${id}`)
      } else {
        router.replace("/")
      }
    },
    [router],
  )

  const handleThreadId = React.useCallback(
    (id: string) => {
      setThreadId(id)
      updateUrl(id)
    },
    [updateUrl],
  )

  const stream = useStream<AgentState>({
    apiUrl: process.env.NEXT_PUBLIC_LANGGRAPH_API_URL,
    assistantId: "pipeline",
    threadId,
    onThreadId: handleThreadId,
    reconnectOnMount: () => window.sessionStorage,
  })

  console.log("stream claims", stream.values.claims)


  const claims = (stream.values as unknown as AgentState | undefined)?.claims ?? []
  const activeNode = inferActiveNode(claims, stream.isLoading)

  // Refresh thread list when a stream finishes
  const prevIsLoading = React.useRef(stream.isLoading)
  React.useEffect(() => {
    if (prevIsLoading.current && !stream.isLoading) {
      fetchThreads()
    }
    prevIsLoading.current = stream.isLoading
  }, [stream.isLoading, fetchThreads])

  const submit = React.useCallback(
    async (content: string, files?: File[]) => {
      // Build multimodal content parts
      const contentParts: Array<
        | { type: "text"; text: string }
        | { type: "file"; file: { file_data: string; filename: string } }
      > = []

      if (content) {
        contentParts.push({ type: "text", text: content })
      }

      if (files?.length) {
        const fileParts = await Promise.all(
          files.map(async (file) => {
            const buffer = await file.arrayBuffer()
            const base64 = btoa(
              new Uint8Array(buffer).reduce(
                (data, byte) => data + String.fromCharCode(byte),
                "",
              ),
            )
            return {
              type: "file" as const,
              file: {
                file_data: `data:${file.type || "application/octet-stream"};base64,${base64}`,
                filename: file.name,
              },
            }
          }),
        )
        contentParts.push(...fileParts)
      }

      const messageContent =
        contentParts.length === 1 && contentParts[0].type === "text"
          ? contentParts[0].text
          : contentParts

      const newMessage = {
        type: "human" as const,
        content: messageContent,
      }

      // Optimistic message shows text only for display
      const optimisticMessage = {
        type: "human" as const,
        content: content || `Attached ${files?.length ?? 0} file(s)`,
      }

      stream.submit(
        { messages: [newMessage] },
        {
          optimisticValues(prev) {
            const state = prev as unknown as AgentState
            return { ...state, messages: [...(state.messages ?? []), optimisticMessage] }
          },
          streamResumable: true,
        },
      )
    },
    [stream],
  )

  const switchThread = React.useCallback(
    (id: string | null) => {
      setThreadId(id)
      updateUrl(id)
    },
    [updateUrl],
  )

  const value = React.useMemo<AgentContextValue>(
    () => ({
      messages: stream.messages,
      claims,
      activeNode,
      isLoading: stream.isLoading,
      error: stream.error,
      threadId,
      threadHistory,
      isLoadingThreads,
      submit,
      stop: stream.stop,
      switchThread,
      refreshThreads: fetchThreads,
    }),
    [stream.messages, claims, activeNode, stream.isLoading, stream.error, threadId, threadHistory, isLoadingThreads, submit, stream.stop, switchThread, fetchThreads],
  )

  return <AgentContext value={value}>{children}</AgentContext>
}

export function useAgent() {
  const context = React.useContext(AgentContext)
  if (!context) {
    throw new Error("useAgent must be used within an AgentProvider")
  }
  return context
}
