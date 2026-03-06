"use client"

import * as React from "react"
import type { Message } from "@langchain/langgraph-sdk"
import { FileText } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface FileBlock {
  type: "file"
  file: { file_data: string; filename: string }
}

function getMessageText(message: Message): string {
  if (typeof message.content === "string") return message.content
  return message.content
    .filter((block): block is { type: "text"; text: string } => block.type === "text")
    .map((block) => block.text)
    .join("")
}

function getMessageFiles(message: Message): FileBlock[] {
  if (typeof message.content === "string") return []
  return message.content.filter(
    (block): block is FileBlock => block.type === "file" && "file" in block,
  )
}

interface MessageListProps {
  messages: Message[]
  isLoading: boolean
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const bottomRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, isLoading])

  return (
    <div className="flex flex-1 flex-col overflow-y-auto scrollbar-none [&]:[-ms-overflow-style:none] [&]:[-webkit-overflow-scrolling:touch] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4 pb-4">
      {messages
        .filter((m) => m.type === "human" || m.type === "ai")
        .map((message, index) => {
          const text = getMessageText(message)
          const files = getMessageFiles(message)
          if (!text && files.length === 0) return null

          if (message.type === "human") {
            return (
              <div key={message.id ?? index} className="flex justify-end">
                <div className="max-w-[80%] space-y-2">
                  {files.length > 0 && (
                    <div className="flex flex-wrap justify-end gap-2">
                      {files.map((f, i) => {
                        const isImage = f.file.file_data.startsWith("data:image/")
                        return isImage ? (
                          <img
                            key={i}
                            src={f.file.file_data}
                            alt={f.file.filename}
                            className="max-h-48 rounded-xl border object-cover"
                          />
                        ) : (
                          <div
                            key={i}
                            className="flex items-center gap-2 rounded-xl border bg-muted/50 px-3 py-2"
                          >
                            <FileText className="size-4 shrink-0 text-muted-foreground" />
                            <span className="max-w-[180px] truncate text-sm">
                              {f.file.filename}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {text && (
                    <div className="rounded-2xl bg-muted px-4 py-2.5">
                      <p className="whitespace-pre-wrap text-sm">{text}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          }

          return (
            <div key={message.id ?? index}>
              <p className="whitespace-pre-wrap text-sm">{text}</p>
            </div>
          )
        })}

      {isLoading && (
        <div className="flex items-center gap-1.5 py-1">
          <Skeleton className="size-2 rounded-full" />
          <Skeleton className="size-2 rounded-full [animation-delay:150ms]" />
          <Skeleton className="size-2 rounded-full [animation-delay:300ms]" />
        </div>
      )}

      <div ref={bottomRef} />
      </div>
    </div>
  )
}
