"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { 
  HelpCircle, MessageSquare, Megaphone, Lightbulb, 
  Send, Zap, ShieldCheck, HeartHandshake, ArrowRight, ArrowLeft,
  Sparkles, Leaf, Star, LifeBuoy, Users, Layout
} from "lucide-react";
import PublicNav from "@/components/PublicNav";
import Link from "next/link";

export default function SupportPage() {
  const [category, setCategory] = useState("Sugestão");
  const [message, setMessage] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    setIsAuthenticated(!!localStorage.getItem("token"));
  }, []);

  const categories = [
    { id: "Reclamação", icon: Megaphone, color: "text-rose-500", bg: "bg-rose-500/10" },
    { id: "Sugestão", icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-500/10" },
    { id: "Feature Request", icon: Zap, color: "text-[var(--brand)]", bg: "bg-[var(--brand)]/10" },
    { id: "Dúvida", icon: HelpCircle, color: "text-blue-500", bg: "bg-blue-500/10" },
    { id: "Agradecimento", icon: HeartHandshake, color: "text-emerald-500", bg: "bg-emerald-500/10" }
  ];

  const handleSendWhatsApp = () => {
    if (!message.trim()) return;

    const fullMessage = `*Novo Suporte ZenCash*\n\n*Categoria:* ${category}\n*Mensagem:* ${message}`;
    const encodedMessage = encodeURIComponent(fullMessage);
    const whatsappUrl = `https://wa.me/5511999999999?text=${encodedMessage}`;
    
    window.open(whatsappUrl, "_blank");
  };

  // ── Dashboard Style Support (Logged In) ──
  if (isAuthenticated === true) {
    return (
      <div className="p-6 md:p-10 lg:p-12 space-y-10 animate-in fade-in duration-500">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10 border-b border-[var(--border-subtle)]">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand)]/10 border border-[var(--brand)]/20">
               <LifeBuoy size={14} className="text-[var(--brand)]" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--brand)]">Central de Ajuda</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black tracking-tighter">Como podemos <span className="opacity-30 italic">ajudar</span> hoje?</h1>
            <p className="text-lg text-[var(--text-secondary)] font-medium max-w-xl">
              Sinta-se em casa. Estamos prontos para ouvir suas ideias ou resolver qualquer imprevisto.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-start">
          {/* Form Side */}
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-white/40 dark:bg-black/20 p-8 md:p-12 rounded-[40px] border border-white/20 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--brand)]/5 blur-3xl -translate-y-1/2 translate-x-1/2" />
               
               <div className="relative z-10 space-y-12">
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {categories.map((cat) => {
                      const Icon = cat.icon;
                      const isSelected = category === cat.id;
                      return (
                        <button
                          key={cat.id}
                          onClick={() => setCategory(cat.id)}
                          className={`p-4 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all duration-300 border ${isSelected ? 'border-[var(--brand)] bg-[var(--brand)]/5' : 'border-transparent bg-white/40 dark:bg-black/20 hover:bg-white/60 hover:dark:bg-black/40'}`}
                        >
                          <div className={`p-3 rounded-2xl ${isSelected ? 'bg-[var(--brand)] text-white' : cat.bg + ' ' + cat.color}`}>
                            <Icon size={18} strokeWidth={3} />
                          </div>
                          <span className={`text-[9px] font-black uppercase tracking-widest text-center ${isSelected ? 'text-[var(--brand)]' : 'opacity-40'}`}>
                            {cat.id}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    <label className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 ml-2">Sua Mensagem</label>
                    <textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Descreva seu problema ou sugestão aqui..."
                      className="w-full h-64 p-8 rounded-[32px] bg-white/40 dark:bg-black/20 border-2 border-[var(--border-subtle)] focus:border-[var(--brand)] focus:ring-[10px] focus:ring-[var(--brand-muted)] transition-all outline-none resize-none text-lg font-medium placeholder:opacity-40"
                    />
                  </div>

                  <button 
                    onClick={handleSendWhatsApp}
                    disabled={!message.trim()}
                    className={`w-full py-6 rounded-[28px] font-black uppercase tracking-widest text-base flex items-center justify-center gap-4 transition-all active:scale-[0.98] shadow-2xl ${message.trim() ? 'bg-[var(--brand)] text-[var(--brand-text)] hover:shadow-[var(--brand)]/30' : 'bg-[var(--border-subtle)] text-[var(--text-muted)] opacity-30 cursor-not-allowed'}`}
                  >
                    Enviar para o WhatsApp <Send size={20} />
                  </button>
               </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white/40 dark:bg-black/20 p-8 rounded-[32px] border border-white/20">
                <h3 className="text-xl font-black mb-3">Tempo de Resposta</h3>
                <p className="text-sm font-medium opacity-60">Nossa equipe costuma responder entre <span className="text-[var(--brand)] font-black">2 a 4 horas</span> durante o horário comercial.</p>
              </div>
              <div className="bg-white/40 dark:bg-black/20 p-8 rounded-[32px] border border-white/20">
                <h3 className="text-xl font-black mb-3">Atendimento VIP</h3>
                <p className="text-sm font-medium opacity-60">Usuários Premium têm fila prioritária e atendimento via chat direto em breve.</p>
              </div>
            </div>
          </div>

          {/* FAQ / Info Side */}
          <aside className="space-y-8">
            <div className="text-xs font-black uppercase tracking-widest opacity-40 ml-2">Perguntas Frequentes</div>
            {[
              { q: "O ZenCash é seguro?", a: "Absolutamente. Criptografia total e privacidade absoluta de seus dados." },
              { q: "Planos e Preços", a: "Temos o plano Zen Básico (Gratuito), Pro e Premium (Ilimitado)." },
              { q: "Dificuldades com Login?", a: "Verifique seu e-mail ou utilize a opção de recuperação de senha." }
            ].map((faq, i) => (
              <div key={i} className="p-8 rounded-[32px] border border-[var(--border-subtle)] bg-white/40 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 transition-colors cursor-default">
                <h4 className="font-black text-[var(--brand)] mb-3">{faq.q}</h4>
                <p className="text-sm font-medium opacity-60">{faq.a}</p>
              </div>
            ))}
          </aside>
        </div>
      </div>
    );
  }

  // ── Public Style Support (Logged Out / Hero Version) ──
  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] selection:bg-[var(--brand)] selection:text-[var(--brand-text)] font-sans antialiased overflow-x-hidden">
      <PublicNav />

      {/* ── Support Hero ── */}
      <section className="relative pt-60 pb-32 overflow-hidden">
        {/* Atmosphere */}
        <div className="absolute top-0 inset-x-0 h-screen pointer-events-none overflow-hidden">
           <div className="absolute -top-[10%] left-[10%] w-[60%] h-[60%] bg-[var(--brand-muted)] rounded-full blur-[120px] opacity-40 animate-pulse" />
           <div className="absolute top-[20%] -right-[5%] w-[40%] h-[40%] bg-[var(--accent-muted)] rounded-full blur-[100px] opacity-30 animate-pulse delay-700" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand)]/10 border border-[var(--brand)]/20 mb-8">
               <LifeBuoy size={14} className="text-[var(--brand)]" />
               <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--brand)]">Santuário de Ajuda</span>
            </div>
            <h1 className="text-6xl md:text-9xl font-black tracking-tighter leading-none mb-10">
               Como podemos <span className="opacity-30 italic">cultivar</span> <br />seu sucesso?
            </h1>
            <p className="text-xl md:text-3xl text-[var(--text-secondary)] font-medium max-w-3xl mx-auto mb-16 leading-relaxed">
               O ZenCash é sobre você. Se tem uma dúvida, sugestão ou precisa de auxílio, 
               estamos aqui para restaurar sua paz.
            </p>
        </div>
      </section>

      {/* ── Form & Categories ── */}
      <section className="pb-40 relative z-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col items-center">
           
           <div className="w-full bg-white/40 dark:bg-black/20 p-2 rounded-[54px] border border-white/20 dark:border-white/5 backdrop-blur-3xl shadow-2xl mb-24 max-w-5xl mx-auto">
              <div className="bg-white/60 dark:bg-black/40 rounded-[48px] p-8 md:p-16 border border-white/10 relative overflow-hidden">
                 <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--brand)]/5 blur-[100px] -translate-y-1/2 translate-x-1/2" />
                 
                 <div className="max-w-3xl mx-auto space-y-16">
                    <div className="text-center md:text-left">
                       <h2 className="text-4xl font-black mb-4">Escolha o tópico da sua mensagem</h2>
                       <p className="text-lg font-medium opacity-50">Selecione uma categoria para que possamos priorizar seu atendimento.</p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                        {categories.map((cat) => {
                            const Icon = cat.icon;
                            const isSelected = category === cat.id;
                            return (
                                <button
                                    key={cat.id}
                                    onClick={() => setCategory(cat.id)}
                                    className={`p-6 rounded-[32px] flex flex-col items-center justify-center gap-4 transition-all duration-500 border h-44 relative group ${isSelected ? 'border-[var(--brand)] bg-[var(--brand)]/5 shadow-2xl shadow-[var(--brand)]/10' : 'border-[var(--border-subtle)] bg-white/40 dark:bg-black/20 hover:-translate-y-2 hover:border-[var(--brand)]/30'}`}
                                >
                                    <div className={`p-4 rounded-2xl transition-all duration-500 ${isSelected ? 'bg-[var(--brand)] text-white scale-110 shadow-lg' : cat.bg + ' ' + cat.color}`}>
                                        <Icon size={24} strokeWidth={isSelected ? 3 : 2} className="group-hover:rotate-6 transition-transform" />
                                    </div>
                                    <span className={`text-[10px] font-black uppercase tracking-widest text-center transition-opacity ${isSelected ? 'text-[var(--brand)]' : 'opacity-40'}`}>
                                        {cat.id}
                                    </span>
                                    {isSelected && <div className="absolute top-3 right-3 w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-ping" />}
                                </button>
                            );
                        })}
                    </div>

                    <div className="space-y-4">
                       <label className="block text-[11px] font-black uppercase tracking-[0.3em] opacity-40 ml-2">Sua Mensagem</label>
                       <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Descreva aqui sua sugestão, reclamação ou ideia para uma nova funcionalidade..."
                            className="w-full h-80 p-10 rounded-[40px] bg-white/40 dark:bg-black/20 border-2 border-[var(--border-subtle)] focus:border-[var(--brand)] focus:ring-[12px] focus:ring-[var(--brand-muted)] transition-all outline-none resize-none text-xl font-medium leading-relaxed placeholder:opacity-40"
                       />
                    </div>

                    <div className="flex flex-col md:flex-row items-center justify-between gap-10 pt-10 border-t border-[var(--border-subtle)]">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/10">
                                <MessageSquare size={24} />
                            </div>
                            <div className="text-left">
                                <p className="text-xs font-black uppercase tracking-widest opacity-40">Atendimento Via WhatsApp</p>
                                <p className="text-lg font-bold">Resposta média em 4 horas</p>
                            </div>
                        </div>

                        <button 
                            onClick={handleSendWhatsApp}
                            disabled={!message.trim()}
                            className={`w-full md:w-auto px-16 py-7 rounded-[32px] font-black uppercase tracking-widest text-lg flex items-center justify-center gap-4 transition-all active:scale-[0.98] shadow-2xl ${message.trim() ? 'bg-[var(--brand)] text-[var(--brand-text)] shadow-[var(--brand)]/20 hover:scale-[1.03]' : 'bg-[var(--border-subtle)] text-[var(--text-muted)] opacity-30 cursor-not-allowed'}`}
                        >
                            {message.trim() ? <>Enviar Mensagem <Send size={22} /></> : <>Escreva Para Enviar</>}
                        </button>
                    </div>
                 </div>
              </div>
           </div>

           {/* ── FAQ Bento Section ── */}
           <div className="w-full max-w-7xl">
              <div className="text-center mb-24">
                  <h2 className="text-5xl md:text-7xl font-black tracking-tighter mb-4">Perguntas Comuns</h2>
                  <p className="text-xl font-medium text-[var(--text-secondary)]">O essencial respondido com clareza.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[300px]">
                  <FAQCard span={8} title="Como funciona o plano Premium?">
                      O plano Premium oferece acesso total ao sistema, incluindo suporte prioritário, ferramentas de investimento ilimitadas, relatórios avançados e a funcionalidade exclusiva de Contas Compartilhadas (Casal) para sincronia perfeita financeira.
                  </FAQCard>
                  <FAQCard span={4} color="brand" title="É seguro?">
                      Sim. Utilizamos criptografia de nível bancário e seus dados nunca são compartilhados. Você é o único senhor do seu santuário financeiro.
                  </FAQCard>
                  <FAQCard span={4} title="Posso cancelar?">
                      A qualquer momento, com apenas um clique. Não acreditamos em burocracia, apenas na sua satisfação e paz de espírito.
                  </FAQCard>
                  <FAQCard span={8} title="O ZenCash integra com bancos?">
                      Atualmente focamos em privacidade e controle manual consciente, mas estamos desenvolvendo módulos de integração automática com segurança avançada que serão liberados em breve.
                  </FAQCard>
              </div>
           </div>

           {/* Final Zen Link */}
           <div className="mt-40 text-center">
              <p className="text-2xl font-medium opacity-40 mb-8 italic">Não encontrou o que precisava?</p>
              <button 
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="text-2xl font-black text-[var(--brand)] border-b-2 border-transparent hover:border-[var(--brand)] transition-all">
                Subir e enviar mensagem
              </button>
           </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="pt-40 pb-20 bg-[var(--bg-base)]">
         <div className="max-w-7xl mx-auto px-6 border-t border-[var(--border-subtle)] pt-20">
            <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.4em] text-center">© 2026 ZEN CASH INC. HARMONY IS THE NEW WEALTH.</p>
         </div>
      </footer>
    </div>
  );
}

function FAQCard({ span, title, children, color }: { span: number, title: string, children: React.ReactNode, color?: 'brand' }) {
    return (
        <div className={`md:col-span-${span} p-10 rounded-[48px] border flex flex-col justify-between transition-all duration-500 hover:shadow-2xl ${color === 'brand' ? 'bg-[var(--brand)] text-[var(--brand-text)] border-transparent' : 'bg-white/60 dark:bg-black/40 border-[var(--border-subtle)] hover:bg-white dark:hover:bg-black/60 shadow-xl shadow-black/[0.02]'}`}>
            <h3 className={`text-2xl font-black mb-6 ${color === 'brand' ? '' : 'text-[var(--brand)]'}`}>{title}</h3>
            <p className={`text-lg font-medium leading-relaxed ${color === 'brand' ? 'opacity-80' : 'text-[var(--text-secondary)]'}`}>{children}</p>
        </div>
    )
}
