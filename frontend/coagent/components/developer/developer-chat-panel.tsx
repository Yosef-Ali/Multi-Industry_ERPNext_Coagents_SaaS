"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useCopilotChatInternal } from "@copilotkit/react-core"
import type { Message } from "@copilotkit/shared"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { Loader2, Plus, RefreshCcw, Send, Sparkles } from "lucide-react"

const instructions = `You are an ERPNext development assistant. Help users generate DocTypes, Workflows, and ERPNext applications inside ERPNext. Always produce three distinct implementation variants ordered by increasing complexity, highlighting key trade-offs.`

export function DeveloperChatPanel() {
  const [input, setInput] = useState("")

  const {
    messages,
    sendMessage,
    isLoading,
    stopGeneration,
    reloadMessages,
    reset,
  } = useCopilotChatInternal({
    makeSystemMessage: (contextString, additional) =>
      [
        instructions,
        additional ? `Additional instructions:\n${additional}` : undefined,
        contextString ? `Context:\n${contextString}` : undefined,
      ]
        .filter(Boolean)
        .join("\n\n"),
  })

  const chatMessages = useMemo(
    () =>
      messages.filter(
        (message) =>
          message.role !== "system" && message.role !== "developer"
      ),
    [messages]
  )

  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!scrollRef.current) return
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    })
  }, [chatMessages])

  const lastAssistantMessage = useMemo(
    () =>
      [...chatMessages]
        .reverse()
        .find((message) => message.role === "assistant"),
    [chatMessages]
  )

  const handleSubmit = useCallback(async () => {
    const trimmed = input.trim()
    if (!trimmed) return

    await sendMessage({
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    })

    setInput("")
  }, [input, sendMessage])

  const handleRegenerate = useCallback(() => {
    if (lastAssistantMessage) {
      reloadMessages(lastAssistantMessage.id)
    }
  }, [lastAssistantMessage, reloadMessages])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (!isLoading) {
        handleSubmit()
      }
    }
  }

  return (
    <div className="flex h-dvh min-h-dvh flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
        <SidebarTrigger />
        <Button
          className="order-2 ml-auto h-8 px-2 md:order-1 md:ml-0 md:h-fit md:px-2"
          onClick={() => {
            reset()
            setInput("")
          }}
          variant="outline"
        >
          <Plus className="h-4 w-4" />
          <span className="md:sr-only">New Chat</span>
        </Button>
      </header>

      {/* Messages Container */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain"
        style={{ overflowAnchor: "none" }}
      >
        <div className="mx-auto flex min-w-0 max-w-4xl flex-col gap-4 px-2 py-4 md:gap-6 md:px-4">
          {chatMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Sparkles className="mb-4 h-12 w-12 text-muted-foreground" />
              <h2 className="text-2xl font-semibold">
                Start a new ERPNext conversation
              </h2>
              <p className="mt-2 text-center text-muted-foreground">
                I can help you build DocTypes, workflows, and ERPNext applications
              </p>
            </div>
          )}

          {chatMessages.map((message, index) => {
            const isUser = message.role === "user"
            const isStreaming = isLoading && index === chatMessages.length - 1

            return (
              <div
                key={message.id}
                className={cn(
                  "group/message w-full",
                  isUser && "flex justify-end"
                )}
                data-role={message.role}
              >
                <div
                  className={cn(
                    "flex w-full items-start gap-2 md:gap-3",
                    isUser && "flex-row-reverse"
                  )}
                >
                  <div
                    className={cn(
                      "flex max-w-[85%] flex-col gap-2 rounded-3xl px-5 py-2.5",
                      isUser
                        ? "bg-foreground text-background"
                        : "bg-muted"
                    )}
                  >
                    <div className="flex flex-col gap-4">
                      <p className="m-0 whitespace-pre-wrap break-words text-sm">
                        {message.content}
                      </p>
                      {isStreaming && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span className="text-xs text-muted-foreground">
                            Thinking...
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Input Area */}
      <div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
        <div className="relative flex w-full flex-col gap-2">
          {chatMessages.length > 0 && !isLoading && (
            <div className="flex justify-center pb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRegenerate}
                className="gap-2"
              >
                <RefreshCcw className="h-4 w-4" />
                Regenerate
              </Button>
            </div>
          )}

          <div className="relative flex w-full items-end gap-2">
            <div className="relative flex min-h-[60px] w-full flex-col rounded-xl border bg-background shadow-sm">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Send a message..."
                className="min-h-[60px] w-full resize-none bg-transparent px-4 py-4 text-sm outline-none placeholder:text-muted-foreground"
                rows={1}
                disabled={isLoading}
              />
            </div>
            <Button
              onClick={isLoading ? stopGeneration : handleSubmit}
              disabled={!input.trim() && !isLoading}
              size="icon"
              className="h-[60px] w-[60px] shrink-0 rounded-xl"
            >
              {isLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
