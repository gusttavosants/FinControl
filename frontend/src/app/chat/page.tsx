"use client";

import { useEffect, useState, useRef } from "react";
import { chatAPI } from "@/lib/api";
import { 
  Bot, Send, User, Sparkles, Leaf, ArrowLeft, 
  Trash2, Paperclip, MessageSquare, Zap, ShieldCheck, Plus, MessageCircle,
  History, X
} from "lucide-react";
import Link from "next/link";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ChatSession {
  id: number;
  title: string;
  updated_at: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<number | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Carregar Sessões
  const fetchSessions = async () => {
    try {
      const data = await chatAPI.getSessions();
      setSessions(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  // Selecionar Sessão
  const loadSession = async (id: number) => {
    try {
      setLoading(true);
      const data = await chatAPI.getSession(id);
      setActiveSessionId(data.id);
      setMessages(data.messages || []);
      setIsHistoryOpen(false); // Fechar histórico ao selecionar
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createNewChat = () => {
    setActiveSessionId(null);
    setMessages([]);
    setIsHistoryOpen(false);
  };

  const deleteSession = async (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Excluir esta conversa?")) return;
    try {
      await chatAPI.deleteSession(id);
      if (activeSessionId === id) createNewChat();
      fetchSessions();
    } catch (error) {
      console.error(error);
    }
  };

  // Auto-scroll para baixo
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setIsTyping(true);

    try {
      const history = messages.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        content: m.content
      }));

      const res = await chatAPI.send(userMessage.content, history, activeSessionId || undefined);
      
      // Se criou nova sessão, define e recarrega
      if (!activeSessionId && res.session_id) {
        setActiveSessionId(res.session_id);
        fetchSessions();
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.reply }
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "❌ Ocorreu um erro ao processar. Certifique-se de estar conectado." }
      ]);
    } finally {
      setLoading(false);
      setIsTyping(false);
    }
  };

  return (
    <div className="flex w-full h-[calc(100vh-100px)] lg:h-[calc(100vh-120px)] animate-fade-in relative gap-6 pt-2 max-w-7xl mx-auto">
       {/* Overlay de Histórico de Conversas */}
      {isHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 animate-fade-in">
          <div 
            className="absolute inset-0 bg-black/20 backdrop-blur-sm" 
            onClick={() => setIsHistoryOpen(false)} 
          />
          
          <div className="relative w-full max-w-2xl h-[80vh] bg-[#111] border border-white/10 rounded-[48px] shadow-[0_0_80px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in">
            <div className="p-8 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-white tracking-tight">Suas Conversas</h2>
                <p className="text-sm text-white/40">Histórico de interações com o ZenBot</p>
              </div>
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="w-12 h-12 rounded-2xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 border-b border-white/5">
              <button 
                onClick={createNewChat}
                className="flex items-center justify-center gap-3 w-full p-4 rounded-3xl bg-[var(--brand)] text-[#111] hover:brightness-110 active:scale-95 transition-all font-black text-sm uppercase tracking-widest shadow-lg shadow-[var(--brand)]/20"
              >
                <Plus size={20} />
                <span>Nova Jornada</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3" style={{ scrollbarWidth: "none" }}>
              {sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full opacity-30 gap-4">
                  <MessageCircle size={48} />
                  <p className="text-sm font-medium">Nenhuma conversa encontrada</p>
                </div>
              ) : (
                sessions.map(s => (
                  <div 
                    key={s.id} 
                    onClick={() => loadSession(s.id)}
                    className={`group flex items-center justify-between p-5 rounded-[32px] cursor-pointer transition-all border ${activeSessionId === s.id ? "bg-[var(--brand)]/10 border-[var(--brand)]/30 text-white" : "bg-white/5 border-transparent hover:bg-white/10 text-white/70 hover:text-white"}`}
                  >
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className={`p-3 rounded-2xl ${activeSessionId === s.id ? "bg-[var(--brand)] text-[#111]" : "bg-white/5 text-white/40"}`}>
                        <MessageCircle size={20} />
                      </div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-[15px] font-bold truncate">{s.title || "Nova Conversa"}</span>
                        <span className="text-xs opacity-40">{new Date(s.updated_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </div>
                    <button 
                      onClick={(e) => deleteSession(s.id, e)}
                      className="opacity-0 group-hover:opacity-100 w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all shadow-sm"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Área Principal de Mensagens */}
      <div className="flex-1 flex flex-col h-full relative">
        {/* Header Simples e Padrão */}
        <div className="flex items-center justify-between pb-6 border-b border-white/5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[var(--brand)] shadow-sm">
               <Bot size={24} strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight">ZenBot IA</h1>
              <div className="flex items-center gap-2 mt-0.5">
                 <div className="w-2 h-2 bg-[var(--brand)] rounded-full animate-pulse" />
                 <span className="text-xs font-medium text-[var(--brand)] mix-blend-screen">Assistente Financeiro</span>
              </div>
            </div>
          </div>
          
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 md:gap-3 px-4 md:px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 hover:text-white transition-all active:scale-95 group"
          >
            <History size={18} className="group-hover:rotate-[-12deg] transition-transform" />
            <span className="text-sm font-bold tracking-wide hidden sm:inline">Conversas</span>
          </button>
        </div>

        {/* Área de Mensagens */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto py-8 space-y-6 scroll-smooth pr-2"
          style={{ scrollbarWidth: "none" }}
        >
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center max-w-2xl mx-auto space-y-10 py-4">
              <Leaf size={48} className="text-[var(--brand)] opacity-30" />
              <div className="space-y-3">
                <h2 className="text-3xl font-bold text-white tracking-tight">Sua Governança</h2>
                <p className="text-[15px] text-white/50 leading-relaxed max-w-md mx-auto">
                  Adicione receitas, registre despesas ou peça análises de mercado.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
                 {[
                   { t: "Entrada", d: "Adicionar receita de R$ 3.000" },
                   { t: "Saída", d: "Lançar despesa de R$ 100" },
                   { t: "Análise", d: "Resumo financeiro do mês" },
                   { t: "Objetivo", d: "Qual o limite do plano premium?" }
                 ].map((item) => (
                   <button 
                     key={item.t}
                     onClick={() => setInput(item.d)}
                     className="px-6 py-5 rounded-2xl bg-[#141517] hover:bg-white/10 border border-white/5 hover:border-white/10 text-left transition-all active:scale-[0.98] group shadow-sm"
                   >
                     <span className="block text-xs font-bold text-[var(--brand)] mb-1 uppercase tracking-wide">{item.t}</span>
                     <span className="text-sm font-medium text-white/60 group-hover:text-white transition-colors">"{item.d}"</span>
                   </button>
                 ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex items-start gap-4 ${msg.role === "user" ? "flex-row-reverse" : ""} animate-fade-in`}
            >
              <div className={`w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center shadow-md
                ${msg.role === "user" 
                  ? "bg-[var(--brand)] text-[#111]" 
                  : "bg-[#141517] text-[var(--brand)] border border-white/5"}`}
              >
                {msg.role === "user" ? <User size={18} /> : <Bot size={18} />}
              </div>

              <div className={`flex flex-col max-w-[85%] lg:max-w-[75%] space-y-1
                ${msg.role === "user" ? "items-end" : "items-start"}`}
              >
                <div className={`px-5 py-4 rounded-3xl text-[15px] leading-relaxed shadow-sm
                  ${msg.role === "user" 
                    ? "bg-[var(--brand)] text-[#111] rounded-tr-none font-medium" 
                    : "bg-[#141517] border border-white/5 text-white/90 rounded-tl-none"}`}
                >
                  <div className="whitespace-pre-wrap">{msg.content}</div>
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex items-start gap-4 animate-pulse">
              <div className="w-10 h-10 rounded-2xl bg-[#141517] border border-white/5 flex items-center justify-center text-[var(--brand)] shadow-md">
                 <Bot size={18} />
              </div>
              <div className="bg-[#141517] border border-white/5 px-6 py-5 rounded-3xl rounded-tl-none flex gap-2 items-center">
                 <div className="w-2 h-2 bg-[var(--brand)] rounded-full animate-bounce"></div>
                 <div className="w-2 h-2 bg-[var(--brand)] rounded-full animate-bounce delay-150"></div>
                 <div className="w-2 h-2 bg-[var(--brand)] rounded-full animate-bounce delay-300"></div>
              </div>
            </div>
          )}
        </div>

        {/* Input de Mensagem */}
        <div className="mt-auto">
          <div className="flex items-center gap-2">
             <div className="relative flex-1 group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-[var(--brand)] opacity-60 group-focus-within:opacity-100 transition-opacity">
                  <MessageSquare size={18} />
                </div>
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSend();
                  }}
                  placeholder="Qual sua próxima instrução financeira?"
                  className="w-full bg-[#141517] focus:bg-white/10 border border-white/5 focus:border-[var(--brand)]/50 rounded-2xl pl-12 pr-4 py-4 text-sm text-white placeholder:text-white/30 focus:outline-none transition-all shadow-sm"
                />
             </div>
             <button 
               onClick={handleSend}
               disabled={!input.trim() || loading}
               className="w-14 h-14 flex-shrink-0 rounded-2xl bg-[var(--brand)] text-[#111] flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 disabled:opacity-20 disabled:scale-100 transition-all font-bold"
             >
               <Send size={20} className="ml-0.5" />
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
