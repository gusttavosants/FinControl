"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageCircle,
  X,
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  RotateCcw,
  Paperclip,
} from "lucide-react";
import { chatAPI } from "@/lib/api";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatAction {
  type: string;
  data?: Record<string, unknown>;
}

const SUGGESTIONS = [
  "receita salário 3500",
  "despesa aluguel 1200",
  "listar despesas",
  "resumo",
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async (text?: string) => {
    const msg = text || input.trim();
    if (!msg || loading) return;

    const userMessage: Message = { role: "user", content: msg };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const history = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const response = await chatAPI.send(msg, history.slice(0, -1));

      const assistantMessage: Message = {
        role: "assistant",
        content: response.reply,
      };
      setMessages([...newMessages, assistantMessage]);

      if (response.actions && response.actions.length > 0) {
        response.actions.forEach((action: ChatAction) => {
          if (
            action.type === "receita_added" ||
            action.type === "receita_deleted" ||
            action.type === "despesa_added" ||
            action.type === "despesa_deleted" ||
            action.type === "despesa_updated" ||
            action.type === "meta_added"
          ) {
            window.dispatchEvent(new CustomEvent("fincontrol:refresh"));
          }
        });
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      setMessages([
        ...newMessages,
        {
          role: "assistant",
          content: `❌ Erro: ${errorMessage}`,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || loading) return;

    const userMessage: Message = {
      role: "user",
      content: `📎 Importando planilha: ${file.name}`,
    };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setLoading(true);

    try {
      const response = await chatAPI.upload(file);
      const assistantMessage: Message = {
        role: "assistant",
        content: response.reply,
      };
      setMessages([...newMessages, assistantMessage]);

      if (response.actions && response.actions.length > 0) {
        response.actions.forEach((action: ChatAction) => {
          if (
            action.type === "receita_added" ||
            action.type === "receita_deleted" ||
            action.type === "despesa_added" ||
            action.type === "despesa_deleted" ||
            action.type === "despesa_updated" ||
            action.type === "meta_added"
          ) {
            window.dispatchEvent(new CustomEvent("fincontrol:refresh"));
          }
        });
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro desconhecido";
      setMessages([
        ...newMessages,
        { role: "assistant", content: `❌ Erro ao importar: ${errorMessage}` },
      ]);
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      setHasNewMessage(false);
    }
  };

  const formatMessage = (content: string) => {
    return content.split("\n").map((line, i) => (
      <span key={i}>
        {line}
        {i < content.split("\n").length - 1 && <br />}
      </span>
    ));
  };

  return (
    <>
      {/* Chat Window */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 w-[400px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-8rem)] flex flex-col z-50 animate-in slide-in-from-bottom-4 overflow-hidden"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-card)",
            boxShadow: "0 24px 80px rgba(0,0,0,0.18)",
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-5 py-4"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.08)",
              background: "linear-gradient(135deg, #3366ff, #8b5cf6)",
            }}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                <Sparkles className="text-white" size={18} />
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm">FinBot</h3>
                <p className="text-primary-100 text-xs">
                  Assistente Financeiro
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleClear}
                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="Limpar conversa"
              >
                <RotateCcw size={16} />
              </button>
              <button
                onClick={toggleOpen}
                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <Bot style={{ color: "var(--brand)" }} size={32} />
                </div>
                <h4
                  className="font-semibold mb-1"
                  style={{ color: "var(--text-primary)" }}
                >
                  Olá! Sou o FinBot 👋
                </h4>
                <p
                  className="text-sm mb-6"
                  style={{ color: "var(--text-muted)" }}
                >
                  Posso te ajudar a gerenciar suas finanças. Experimente:
                </p>
                <div className="grid grid-cols-1 gap-2 w-full">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="text-left text-xs px-3 py-2.5 rounded-xl transition-all"
                      style={{
                        background: "var(--bg-elevated)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-secondary)",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "var(--bg-card-hover)";
                        e.currentTarget.style.color = "var(--text-primary)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "var(--bg-elevated)";
                        e.currentTarget.style.color = "var(--text-secondary)";
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: "rgba(51,102,255,0.12)",
                      color: "var(--brand)",
                    }}
                  >
                    <Bot size={14} style={{ color: "var(--brand)" }} />
                  </div>
                )}
                <div
                  className={`max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "text-white rounded-br-md"
                      : "rounded-bl-md"
                  }`}
                  style={
                    msg.role === "user"
                      ? {
                          background:
                            "linear-gradient(135deg, #3366ff, #8b5cf6)",
                        }
                      : {
                          background: "var(--bg-elevated)",
                          color: "var(--text-primary)",
                          border: "1px solid var(--border-subtle)",
                        }
                  }
                >
                  {formatMessage(msg.content)}
                </div>
                {msg.role === "user" && (
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{
                      background: "var(--bg-elevated)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <User
                      size={14}
                      style={{ color: "var(--text-secondary)" }}
                    />
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-2.5 justify-start">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(51,102,255,0.12)" }}
                >
                  <Bot size={14} style={{ color: "var(--brand)" }} />
                </div>
                <div
                  className="px-4 py-3 rounded-2xl rounded-bl-md"
                  style={{
                    background: "var(--bg-elevated)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <Loader2
                      size={14}
                      className="animate-spin"
                      style={{ color: "var(--brand)" }}
                    />
                    <span
                      className="text-xs"
                      style={{ color: "var(--text-muted)" }}
                    >
                      Pensando...
                    </span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div
            className="px-4 py-3"
            style={{ borderTop: "1px solid var(--border-subtle)" }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
            <div
              className="flex items-center gap-2 rounded-xl px-3 py-1 transition-colors"
              style={{
                background: "var(--bg-elevated)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="p-1.5 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                style={{ color: "var(--text-muted)" }}
                title="Importar planilha (.xlsx, .xls, .csv)"
              >
                <Paperclip size={14} />
              </button>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Digite ou anexe planilha..."
                disabled={loading}
                className="flex-1 bg-transparent text-sm outline-none py-2"
                style={{ color: "var(--text-primary)" }}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="p-1.5 rounded-lg text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #3366ff, #8b5cf6)",
                }}
              >
                <Send size={14} />
              </button>
            </div>
            <p
              className="text-[10px] text-center mt-1.5"
              style={{ color: "var(--text-muted)" }}
            >
              FinBot • As ações são executadas em tempo real
            </p>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={toggleOpen}
        className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-50 transition-all duration-300 hover:scale-105 active:scale-95 ${
          isOpen
            ? "bg-slate-600 hover:bg-slate-700 dark:bg-slate-700 dark:hover:bg-slate-600"
            : ""
        }`}
        style={
          isOpen
            ? undefined
            : { background: "linear-gradient(135deg, #3366ff, #8b5cf6)" }
        }
      >
        {isOpen ? (
          <X className="text-white" size={22} />
        ) : (
          <>
            <MessageCircle className="text-white" size={22} />
            {hasNewMessage && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white dark:border-slate-900" />
            )}
          </>
        )}
      </button>
    </>
  );
}
