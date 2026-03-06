"use client"

import * as React from "react"
import toast from "react-hot-toast"
import { useAgent } from "./agent-provider"
import { ChatComposer } from "./chat-composer"
import { MessageList } from "./message-list"

export function AgentChat() {
  const { messages, isLoading, error, submit, stop } = useAgent()
  const [message, setMessage] = React.useState("")
  const [files, setFiles] = React.useState<File[]>([])

  React.useEffect(() => {
    if (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Something went wrong"
      toast.error(errorMessage)
    }
  }, [error])

  const handleSubmit = () => {
    if (message.trim() || files.length > 0) {
      submit(message.trim(), files)
      setMessage("")
      setFiles([])
    }
  }

  const hasMessages = messages.length > 0

  if (!hasMessages) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-24">
        <div className="flex w-full max-w-2xl flex-col items-center gap-6">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Analyze Claims & Invoices
          </h1>

          <ChatComposer
            message={message}
            isLoading={isLoading}
            files={files}
            onMessageChange={setMessage}
            onFilesChange={setFiles}
            onSubmit={handleSubmit}
            onStop={stop}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <MessageList messages={messages} isLoading={isLoading} />
      <div className="mx-auto w-full max-w-2xl px-4 pb-4">
        <ChatComposer
          message={message}
          isLoading={isLoading}
          files={files}
          onMessageChange={setMessage}
          onFilesChange={setFiles}
          onSubmit={handleSubmit}
          onStop={stop}
        />
      </div>
    </div>
  )
}
