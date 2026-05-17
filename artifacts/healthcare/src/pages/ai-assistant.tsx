import { useState, useRef, useEffect } from "react";
import { useAiChat } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Send, Bot, User, Sparkles } from "lucide-react";

const TENANT_ID = 1;

interface Message {
  role: "user" | "assistant";
  content: string;
  suggestions?: string[];
}

const WELCOME: Message = {
  role: "assistant",
  content: "Hello! I'm MediFlow AI. I can help you book appointments, check doctor availability, find patients, and more. What can I help you with today?",
  suggestions: ["Check available doctors", "Book an appointment", "View today's schedule", "Find a patient"],
};

export default function AiAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const chatMut = useAiChat();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: "user", content: text };
    const history = messages.filter((m) => m.role !== "assistant" || messages.indexOf(m) > 0).map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    setInput("");

    chatMut.mutate({
      data: {
        message: text,
        tenantId: TENANT_ID,
        conversationHistory: history,
      }
    }, {
      onSuccess: (reply) => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: reply.message, suggestions: reply.suggestions },
        ]);
      },
      onError: () => {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "I'm having trouble connecting right now. Please try again in a moment." },
        ]);
      }
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <Layout>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">AI Scheduling Assistant</h1>
            <p className="text-xs text-muted-foreground">Powered by MediFlow Intelligence</p>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`} data-testid={`message-${i}`}>
              <div className={`flex-shrink-0 p-2 rounded-full ${msg.role === "assistant" ? "bg-primary/10" : "bg-muted"}`}>
                {msg.role === "assistant" ? (
                  <Bot className="h-4 w-4 text-primary" />
                ) : (
                  <User className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
              <div className={`flex-1 max-w-xl ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-2`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-card border border-border text-foreground rounded-tl-sm"
                    : "bg-primary text-primary-foreground rounded-tr-sm"
                }`}>
                  {msg.content}
                </div>
                {msg.suggestions && msg.suggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {msg.suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => sendMessage(s)}
                        className="px-3 py-1.5 text-xs bg-primary/10 text-primary border border-primary/20 rounded-full hover:bg-primary/20 transition-colors font-medium"
                        data-testid={`suggestion-chip-${s.replace(/\s/g, "-").toLowerCase()}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {chatMut.isPending && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 p-2 rounded-full bg-primary/10">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="px-4 py-3 bg-card border border-border rounded-2xl rounded-tl-sm">
                <div className="flex gap-1">
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="h-2 w-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="px-6 py-4 border-t border-border bg-card">
          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything about appointments, doctors, or patients..."
              className="flex-1 px-4 py-2.5 bg-background border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              disabled={chatMut.isPending}
              data-testid="input-chat"
            />
            <button
              type="submit"
              disabled={!input.trim() || chatMut.isPending}
              className="p-2.5 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              data-testid="button-send"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </Layout>
  );
}
