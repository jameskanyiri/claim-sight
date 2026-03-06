"use client"

import * as React from "react"
import { ArrowUp, Paperclip, Square, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

interface ChatComposerProps {
  message: string
  isLoading: boolean
  files: File[]
  onMessageChange: (value: string) => void
  onFilesChange: (files: File[]) => void
  onSubmit: () => void
  onStop: () => void
}

export function ChatComposer({
  message,
  isLoading,
  files,
  onMessageChange,
  onFilesChange,
  onSubmit,
  onStop,
}: ChatComposerProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      onSubmit()
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFilesChange([...files, ...Array.from(e.target.files)])
    }
    // Reset so the same file can be re-selected
    e.target.value = ""
  }

  const removeFile = (index: number) => {
    onFilesChange(files.filter((_, i) => i !== index))
  }

  const canSubmit = (message.trim().length > 0 || files.length > 0) && !isLoading

  return (
    <div className="w-full">
      <div className="rounded-2xl border bg-background shadow-[0_1px_6px_rgba(0,0,0,0.03),0_4px_24px_rgba(0,0,0,0.04)]">
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2 px-4 pt-3">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2.5 py-1.5 text-sm"
              >
                <Paperclip className="size-3 text-muted-foreground" />
                <span className="max-w-[150px] truncate">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => onMessageChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="How can I help you today?"
          className={`min-h-[60px] resize-none border-0 bg-transparent px-4 pt-4 text-base shadow-none transition-opacity duration-200 ease-in-out focus-visible:ring-0 ${
            isLoading ? "opacity-50" : "opacity-100"
          }`}
          rows={2}
        />

        <input
          ref={fileInputRef}
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.csv,.xlsx,.xls,.doc,.docx,.txt,.json"
        />

        <div className="flex items-center justify-between px-3 pb-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="size-4" />
          </Button>
          <div className="flex items-center gap-2">
            {isLoading ? (
              <Button
                size="icon"
                className="size-8 rounded-full"
                variant="destructive"
                onClick={onStop}
              >
                <Square className="size-3" />
              </Button>
            ) : (
              <Button
                size="icon"
                className="size-8 rounded-full"
                disabled={!canSubmit}
                onClick={onSubmit}
              >
                <ArrowUp className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
