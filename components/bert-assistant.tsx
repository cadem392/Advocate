"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { loadCaseSession } from "@/lib/client/case-session";

interface BertMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}

interface BertResponse {
  reply: string;
  suggestions?: string[];
  mode: "fallback" | "llm";
}

interface BertPromptEventDetail {
  prompt?: string;
  open?: boolean;
  suggestions?: string[];
}

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function stageForPath(pathname: string) {
  if (pathname.startsWith("/workspace")) return "workspace";
  if (pathname.startsWith("/evidence")) return "evidence";
  if (pathname.startsWith("/draft")) return "draft";
  if (pathname.startsWith("/confirmation")) return "confirmation";
  if (pathname.startsWith("/status")) return "status";
  return "intake";
}

function buildWelcomeMessage(pathname: string) {
  switch (stageForPath(pathname)) {
    case "workspace":
      return "I’m BERT. I can help you interpret the current branch, spot missing evidence, and decide what to do first in the workspace.";
    case "evidence":
      return "I’m BERT. Upload supporting records here and I’ll help you decide which evidence matters most for the current appeal.";
    case "draft":
      return "I’m BERT. I can help you strengthen the draft, cite the right evidence, and spot weak points before export.";
    case "confirmation":
      return "I’m BERT. I can help you check that the packet is complete before transmission.";
    case "status":
      return "I’m BERT. I can help you understand what to monitor next and when to upload more evidence.";
    default:
      return "I’m BERT. Upload or paste a case file here, and I’ll help you decide what to include before you generate the case strategy.";
  }
}

function suggestionsForPath(pathname: string) {
  switch (stageForPath(pathname)) {
    case "workspace":
      return ["What should I do first?", "Which evidence gap matters most?"];
    case "evidence":
      return ["What should I upload next?", "Why is this score low?"];
    case "draft":
      return ["How do I strengthen this draft?", "What evidence should I cite?"];
    default:
      return ["What should I upload first?", "What happens after I generate strategy?"];
  }
}

export function BertAssistant() {
  const pathname = usePathname() || "/";
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<BertMessage[]>([
    {
      id: createId("bert"),
      role: "assistant",
      content: buildWelcomeMessage(pathname),
    },
  ]);
  const [suggestions, setSuggestions] = useState<string[]>(suggestionsForPath(pathname));

  useEffect(() => {
    setMessages((current) => {
      const last = current[current.length - 1];
      const nextMessage = buildWelcomeMessage(pathname);
      if (last?.role === "assistant" && last.content === nextMessage) {
        return current;
      }

      return [
        ...current,
        {
          id: createId("bert"),
          role: "assistant",
          content: nextMessage,
        },
      ];
    });
    setSuggestions(suggestionsForPath(pathname));
  }, [pathname]);

  const statusLabel = useMemo(() => {
    const session = loadCaseSession();
    if (!session) return "No active case";
    const selectedNode = session.strategy?.nodes.find((node) => node.id === session.selectedNodeId);
    return selectedNode
      ? `${session.structuredFacts?.claimNumber || "Case loaded"} • ${selectedNode.label}`
      : session.structuredFacts?.claimNumber || "Case loaded";
  }, [pathname, open, messages.length]);

  async function sendMessage(message: string) {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;

    const session = loadCaseSession();
    const selectedNode = session?.strategy?.nodes.find((node) => node.id === session.selectedNodeId);
    const nextUserMessage: BertMessage = {
      id: createId("bert-user"),
      role: "user",
      content: trimmed,
    };

    setMessages((current) => [...current, nextUserMessage]);
    setInput("");
    setIsSending(true);

    try {
      const response = await fetch("/api/assistant/bert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: trimmed,
          stage: stageForPath(pathname),
          pathname,
          documentText: session?.documentText,
          structuredFacts: session?.structuredFacts,
          analysis: session?.analysis,
          strategy: session?.strategy,
          draft: session?.draft,
          selectedNodeId: session?.selectedNodeId,
          selectedNodeLabel: selectedNode?.label,
          selectedNodeDescription: selectedNode?.description,
        }),
      });

      const data = (await response.json()) as Partial<BertResponse>;
      const reply =
        typeof data.reply === "string" && data.reply.trim()
          ? data.reply.trim()
          : "I can help with the next step, but that answer failed. Try asking what to upload, what is missing, or what the current page is for.";

      setMessages((current) => [
        ...current,
        {
          id: createId("bert-assistant"),
          role: "assistant",
          content: reply,
        },
      ]);

      if (Array.isArray(data.suggestions) && data.suggestions.length) {
        setSuggestions(data.suggestions.slice(0, 3));
      }
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: createId("bert-assistant"),
          role: "assistant",
          content:
            "I can still guide the flow. Start with the strongest source document you have, then move to the recommended branch and fill the missing evidence before exporting.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  useEffect(() => {
    function handlePromptEvent(rawEvent: Event) {
      const event = rawEvent as CustomEvent<BertPromptEventDetail>;
      const detail = event.detail || {};

      if (detail.open !== false) {
        setOpen(true);
      }

      if (Array.isArray(detail.suggestions) && detail.suggestions.length) {
        setSuggestions(detail.suggestions.slice(0, 3));
      }

      if (detail.prompt) {
        void sendMessage(detail.prompt);
      }
    }

    window.addEventListener("advocate:bert-prompt", handlePromptEvent as EventListener);
    return () => {
      window.removeEventListener("advocate:bert-prompt", handlePromptEvent as EventListener);
    };
  }, [pathname, isSending, messages.length]);

  return (
    <div className="fixed bottom-6 right-6 z-[120] flex flex-col items-end gap-3">
      {open ? (
        <div className="w-[380px] max-w-[calc(100vw-2rem)] overflow-hidden border border-[#E8E4DF] bg-[#FDFCFB] shadow-[0_20px_60px_rgba(30,58,95,0.14)]">
          <div className="flex items-start justify-between border-b border-[#E8E4DF] bg-white px-5 py-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#1E3A5F] text-white">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-[#6B6B6B]">AI Guide</p>
                  <h3 className="font-serif text-2xl text-[#1E3A5F]">BERT</h3>
                </div>
              </div>
              <p className="mt-3 text-[11px] text-[#6B6B6B]">{statusLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-sm border border-[#E8E4DF] p-2 text-[#6B6B6B] transition-colors hover:border-[#1E3A5F] hover:text-[#1E3A5F]"
              aria-label="Close BERT assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[420px] overflow-y-auto bg-[#F9F8F6] px-4 py-4">
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={
                    message.role === "assistant"
                      ? "mr-8 border border-[#E8E4DF] bg-white px-4 py-3 text-[12px] leading-relaxed text-[#1E3A5F]"
                      : "ml-8 bg-[#1E3A5F] px-4 py-3 text-[12px] leading-relaxed text-white"
                  }
                >
                  {message.content}
                </div>
              ))}
              {isSending ? (
                <div className="mr-8 flex items-center gap-2 border border-[#E8E4DF] bg-white px-4 py-3 text-[12px] text-[#6B6B6B]">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  BERT is thinking...
                </div>
              ) : null}
            </div>
          </div>

          <div className="border-t border-[#E8E4DF] bg-white px-4 py-3">
            <div className="mb-3 flex flex-wrap gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => void sendMessage(suggestion)}
                  className="border border-[#E8E4DF] bg-[#F9F8F6] px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-[#1E3A5F] transition-colors hover:border-[#1E3A5F]"
                >
                  {suggestion}
                </button>
              ))}
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void sendMessage(input);
              }}
              className="flex items-end gap-2"
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={2}
                placeholder="Ask BERT what to upload, what is missing, or what to do next."
                className="min-h-[74px] flex-1 resize-none border border-[#E8E4DF] bg-[#FDFCFB] px-3 py-3 text-[12px] leading-relaxed text-[#1E3A5F] outline-none transition-colors focus:border-[#1E3A5F]"
              />
              <button
                type="submit"
                disabled={isSending || !input.trim()}
                className="flex h-[74px] w-[54px] items-center justify-center bg-[#1E3A5F] text-white transition-colors hover:bg-[#24446D] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Send message to BERT"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-3 border border-[#1E3A5F] bg-[#1E3A5F] px-4 py-3 text-white shadow-[0_14px_32px_rgba(30,58,95,0.22)] transition-colors hover:bg-[#24446D]"
      >
        <MessageSquare className="h-4 w-4" />
        <span className="text-[10px] font-bold uppercase tracking-[0.26em]">Ask BERT</span>
      </button>
    </div>
  );
}
