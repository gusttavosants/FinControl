"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { 
  HelpCircle, MessageSquare, Megaphone, Lightbulb, 
  Send, Zap, ShieldCheck, HeartHandshake, ArrowRight, ArrowLeft
} from "lucide-react";

export default function SupportPage() {
  const [category, setCategory] = useState("Sugestão");
  const [message, setMessage] = useState("");
  const router = useRouter();

  const categories = [
    { id: "Reclamação", icon: Megaphone, color: "text-red-500", bg: "bg-red-500/10" },
    { id: "Sugestão", icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-500/10" },
    { id: "Feature Request", icon: Zap, color: "text-brand", bg: "bg-brand/10" },
    { id: "Dúvida", icon: HelpCircle, color: "text-purple-500", bg: "bg-purple-500/10" },
    { id: "Agradecimento", icon: HeartHandshake, color: "text-emerald-500", bg: "bg-emerald-500/10" }
  ];

  const handleSendWhatsApp = () => {
    if (!message.trim()) return;

    const fullMessage = `*Novo Suporte FinControl*\n\n*Categoria:* ${category}\n*Mensagem:* ${message}`;
    const encodedMessage = encodeURIComponent(fullMessage);
    const whatsappUrl = `https://wa.me/5511999999999?text=${encodedMessage}`;
    
    window.open(whatsappUrl, "_blank");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-12 animate-in py-10">
      <div className="flex flex-col items-center text-center space-y-4">
        <div className="flex items-center justify-between w-full mb-8">
           <button onClick={() => router.back()} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity">
              <ArrowLeft size={14} /> Voltar
           </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand/5 border border-brand/20 w-fit">
          <ShieldCheck size={14} className="text-brand" fill="currentColor" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand">Central de Ajuda & Suporte</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
          Como podemos <span className="text-gradient">ajudar você?</span>
        </h1>
        <p className="text-base font-medium opacity-60 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
          Sua opinião é fundamental para evoluirmos. Escolha uma categoria abaixo e nos envie sua mensagem diretamente via WhatsApp.
        </p>
      </div>

      <div className="space-y-10">
        {/* Category Selector */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = category === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={`p-6 rounded-[24px] flex flex-col items-center justify-center gap-4 transition-all duration-300 border h-40 ${isSelected ? 'border-brand bg-brand shadow-2xl shadow-brand/30' : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-[#131416] hover:-translate-y-1 hover:border-brand/30'}`}
              >
                <div className={`p-4 rounded-2xl ${isSelected ? 'bg-white/20 text-white' : cat.bg + ' ' + cat.color}`}>
                  <Icon size={24} fill={isSelected ? "white" : "none"} strokeWidth={isSelected ? 3 : 2} />
                </div>
                <span className={`text-[11px] font-black uppercase tracking-widest text-center ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                  {cat.id}
                </span>
              </button>
            );
          })}
        </div>

        {/* Message Input */}
        <div className="glass-card p-4 md:p-10 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-brand/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2" />
          
          <div className="space-y-3 relative z-10">
            <div className="flex items-center justify-between px-1">
                <label className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40">
                Sua mensagem
                </label>
                <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">Limite sugerido: 1000 caracteres</span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva aqui sua sugestão, reclamação ou ideia para uma nova funcionalidade..."
              className="w-full h-64 p-8 rounded-[32px] bg-slate-50 dark:bg-black/20 border-2 border-slate-100 dark:border-white/5 focus:border-brand/40 focus:ring-8 focus:ring-brand/5 transition-all outline-none resize-none text-base leading-relaxed"
              style={{ color: "var(--text-primary)" }}
            />
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-slate-100 dark:border-white/5 relative z-10">
            <div className="flex items-center gap-4 text-xs font-bold opacity-40 uppercase tracking-widest">
               <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                  <MessageSquare size={18} /> 
               </div>
               A mensagem será enviada por WhatsApp
            </div>
            
            <button
              onClick={handleSendWhatsApp}
              disabled={!message.trim()}
              className={`w-full md:w-auto px-12 py-5 rounded-2xl font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all active:scale-95 shadow-2xl ${message.trim() ? 'bg-brand text-white shadow-brand/40 hover:scale-105' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-50 cursor-not-allowed'}`}
            >
              Enviar pelo WhatsApp <Send size={20} />
            </button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="glass-card p-8 flex flex-col gap-6 hover:border-brand/40 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-brand/10 flex items-center justify-center text-brand transition-transform group-hover:scale-110">
                    <Zap size={28} />
                </div>
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Novidades</p>
                    <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Sugira uma Feature</p>
                    <p className="text-sm mt-2 opacity-60">Tem uma ideia incrível? Queremos ouvir como podemos tornar o FinControl melhor.</p>
                </div>
            </div>

            <div className="glass-card p-8 flex flex-col gap-6 hover:border-emerald-500/40 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 transition-transform group-hover:scale-110">
                    <HeartHandshake size={28} />
                </div>
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Comunidade</p>
                    <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Feedback Positivo</p>
                    <p className="text-sm mt-2 opacity-60">Amando a plataforma? Nos conte sua história de sucesso com economias.</p>
                </div>
            </div>

            <div className="glass-card p-8 flex flex-col gap-6 hover:border-slate-400/40 transition-all group">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 transition-transform group-hover:scale-110">
                    <ArrowRight size={28} />
                </div>
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] opacity-40 mb-1">Central</p>
                    <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Acessar FAQ</p>
                    <p className="text-sm mt-2 opacity-60">Dúvidas rápidas? Nossa central de ajuda tem as respostas para as perguntas comuns.</p>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
