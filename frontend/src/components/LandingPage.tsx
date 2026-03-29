"use client";

import { ArrowRight, BarChart3, Shield, Users, Zap, CheckCircle2, Star, Globe, Smartphone, Lock, ShieldCheck, HeartHandshake, HelpCircle, X, Check, Loader2, Sparkles, Layout, Menu, Leaf, Wallet, TrendingUp, PieChart, Info } from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LandingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [plan, setPlan] = useState("trial");

  useEffect(() => {
    const p = searchParams.get("plan");
    if (p && ["trial", "basico", "pro", "premium"].includes(p)) {
      setPlan(p);
    }
  }, [searchParams]);

  const handleCheckout = async (planId: string) => {
    if (planId === "trial") {
      sessionStorage.setItem("welcomeMessage", "Bem-vindo ao ZenCash! Sua jornada de 7 dias começa agora.");
      sessionStorage.setItem("showTour", "true");
      router.push("/");
      return;
    }
    
    const token = localStorage.getItem("token");
    if (!token) {
      router.push(`/register?plan=${planId}`);
      return;
    }

    setCheckoutLoading(planId);
    
    try {
      const response = await fetch(`${API_URL}/api/payment/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          plan: planId,
          payment_method: "stripe"
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || "Falha ao iniciar checkout");
      }

      const data = await response.json();
      
      if (data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error("URL de checkout não recebida");
      }
    } catch (err: any) {
      console.error("Checkout error:", err);
      alert(`Erro: ${err.message}`);
    } finally {
      setCheckoutLoading(null);
    }
  };

  useEffect(() => {
    fetch(`${API_URL}/api/plans/available`)
      .then(res => res.json())
      .then(data => setPlans(data.plans || []))
      .catch(() => setPlans([
        { id: "trial", name: "Zen Trial", price: 0, features: { max_goals: 3, max_investments: 10, export_enabled: false, ai_chat_enabled: false, shared_account_enabled: false } },
        { id: "basico", name: "Zen Básico", price: 9.90, features: { max_goals: 12, max_investments: 50, export_enabled: true, ai_chat_enabled: false, shared_account_enabled: true } },
        { id: "pro", name: "Zen Pro", price: 19.90, features: { max_goals: 40, max_investments: 200, export_enabled: true, ai_chat_enabled: true, shared_account_enabled: true } },
        { id: "premium", name: "Zen Elite", price: 39.90, features: { max_goals: -1, max_investments: -1, export_enabled: true, ai_chat_enabled: true, shared_account_enabled: true } }
      ]))
      .finally(() => setLoadingPlans(false));

    const token = localStorage.getItem("token");
    if (token) {
      fetch(`${API_URL}/api/plans/current`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setCurrentPlan(data.current_plan))
        .catch(() => {});
    }
  }, []);

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] selection:bg-[var(--brand)] selection:text-[var(--brand-text)] font-sans antialiased overflow-x-hidden">
      {/* ── Fixed Navigation ── */}
      <nav className="fixed top-0 w-full z-[100] transition-all duration-300">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
             <div className="w-11 h-11 rounded-2xl bg-[var(--brand)] flex items-center justify-center shadow-lg shadow-[var(--brand)]/20 group-hover:scale-105 transition-transform">
                <Leaf size={22} className="text-[var(--brand-text)]" />
             </div>
             <span className="text-2xl font-black tracking-tighter" style={{ color: "var(--brand)" }}>ZenCash<span className="opacity-40">.</span></span>
          </Link>
          
          <div className="hidden md:flex items-center gap-2 p-1.5 rounded-2xl bg-white/40 dark:bg-black/20 backdrop-blur-xl border border-white/20 dark:border-white/5 shadow-xl shadow-black/[0.03]">
             <NavLink href="#features">Recursos</NavLink>
             <NavLink href="#pricing">Planos</NavLink>
             <NavLink href="/suporte">Suporte</NavLink>
             <div className="w-px h-6 bg-[var(--border-subtle)] mx-2" />
             <Link href="/login" className="px-5 py-2 text-sm font-bold opacity-60 hover:opacity-100 transition-opacity">Entrar</Link>
             <Link href="/register" className="bg-[var(--brand)] text-[var(--brand-text)] px-6 py-2 rounded-xl text-sm font-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[var(--brand)]/10">Abra sua Conta</Link>
          </div>

          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-3 rounded-2xl bg-white/50 backdrop-blur-lg border border-white/20">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden absolute top-24 left-6 right-6 bg-white/95 dark:bg-black/95 backdrop-blur-2xl rounded-3xl border border-white/20 p-8 shadow-2xl animate-in slide-in-from-top-4 space-y-6">
            <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-lg font-black italic">Recursos</Link>
            <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-lg font-black italic">Planos</Link>
            <Link href="/suporte" className="block text-lg font-black italic">Suporte</Link>
            <div className="h-px bg-[var(--border-subtle)]" />
            <Link href="/login" className="block text-lg font-bold">Entrar</Link>
            <Link href="/register" className="block bg-[var(--brand)] text-[var(--brand-text)] px-8 py-4 rounded-2xl text-center text-lg font-black">Começar Agora</Link>
          </div>
        )}
      </nav>

      {/* ── Hero Experience ── */}
      <section className="relative pt-52 pb-40 overflow-hidden">
        {/* Background Atmosphere */}
        <div className="absolute top-0 inset-x-0 h-screen pointer-events-none overflow-hidden">
           <div className="absolute -top-[10%] left-[10%] w-[60%] h-[60%] bg-[var(--brand-muted)] rounded-full blur-[120px] opacity-40 animate-pulse" />
           <div className="absolute top-[20%] -right-[5%] w-[40%] h-[40%] bg-[var(--accent-muted)] rounded-full blur-[100px] opacity-30 animate-pulse delay-700" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/60 dark:bg-black/40 border border-white/20 backdrop-blur-md mb-8 shadow-xl shadow-black/[0.02]">
               <Sparkles size={14} className="text-[var(--brand)]" />
               <span className="text-[11px] font-black uppercase tracking-[0.2em] opacity-60">Harmonize suas finanças</span>
            </div>
            
            <h1 className="text-6xl md:text-[120px] font-black tracking-tighter mb-10 leading-[0.85] max-w-5xl">
               Sinta a paz de ter <br />o <span className="text-[var(--brand)] italic">controle total.</span>
            </h1>
            
            <p className="text-xl md:text-3xl text-[var(--text-secondary)] max-w-3xl mx-auto mb-16 font-medium leading-relaxed">
               O ZenCash não é apenas um app financeiro. É o seu santuário para organizar gastos, 
               investimentos e sonhos com clareza absoluta.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 w-full max-w-xl mx-auto mb-32">
              <Link href="/register" className="w-full sm:w-auto bg-[var(--brand)] text-[var(--brand-text)] px-14 py-6 rounded-3xl text-xl font-black flex items-center justify-center gap-4 shadow-2xl shadow-[var(--brand)]/20 hover:scale-[1.03] active:scale-[0.98] transition-all">
                 Criar Conta <ArrowRight size={22} strokeWidth={3} />
              </Link>
              <Link href="#features" className="w-full sm:w-auto bg-white/50 dark:bg-black/20 text-[var(--text-primary)] border border-[var(--border-subtle)] px-14 py-6 rounded-3xl text-xl font-black hover:bg-white transition-all backdrop-blur-xl group">
                 Ver Recursos <span className="inline-block transition-transform group-hover:translate-x-1">→</span>
              </Link>
            </div>

            {/* Immersive Experience - Focus on pure Typography and Atmosphere */}
            <div className="pt-20 lg:pt-32 opacity-20 pointer-events-none">
               <div className="flex flex-col items-center gap-10">
                  <div className="w-px h-32 bg-gradient-to-b from-transparent via-[var(--brand)] to-transparent" />
                  <Leaf size={48} className="text-[var(--brand)] blur-[1px]" />
               </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bento Grid Features ── */}
      <section id="features" className="py-52 relative">
         <div className="max-w-7xl mx-auto px-6">
            <div className="max-w-3xl mb-32 text-center md:text-left">
                <h2 className="text-5xl md:text-8xl font-black tracking-tighter leading-none mb-10">
                   Criado para quem <br />valoriza <span className="opacity-30">o essencial.</span>
                </h2>
                <p className="text-2xl text-[var(--text-secondary)] font-medium">Design focado em reduzir o ruído mental e amplificar seus resultados.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[400px]">
               {/* Big Card 1 */}
               <div className="md:col-span-8 group relative overflow-hidden bg-white/80 dark:bg-black/20 rounded-[48px] border border-[var(--border-subtle)] transition-all hover:shadow-2xl shadow-black/[0.02] p-12 flex flex-col justify-end">
                  <div className="absolute top-12 right-12 text-[var(--brand)] opacity-5 group-hover:opacity-10 transition-opacity rotate-12 scale-[4]">
                     <BarChart3 size={100} />
                  </div>
                  <div className="relative z-10 max-w-md">
                     <h3 className="text-4xl font-black mb-6">Controle Compartilhado</h3>
                     <p className="text-xl text-[var(--text-secondary)] font-medium">Sincronize suas finanças com parceiros ou sócios de forma inteligente. Contas conjuntas, visão individual e metas em comum.</p>
                  </div>
               </div>

               {/* Tall Card 1 */}
               <div className="md:col-span-4 bg-[var(--brand)] text-[var(--brand-text)] rounded-[48px] p-12 flex flex-col gap-8 shadow-2xl shadow-[var(--brand)]/20">
                  <div className="w-16 h-16 rounded-3xl bg-white/20 flex items-center justify-center backdrop-blur-md">
                     <Zap size={32} />
                  </div>
                  <h3 className="text-3xl font-black leading-tight">Insights instantâneos com IA.</h3>
                  <p className="text-lg opacity-80 font-medium">Nossa inteligência financeira analisa seus hábitos e sugere cortes e investimentos em tempo real.</p>
                  <div className="mt-auto pt-8 border-t border-white/20 text-xs font-black uppercase tracking-widest opacity-60">Disponível nos planos Pro e Premium</div>
               </div>

               {/* Tall Card 2 */}
               <div className="md:col-span-4 bg-white/80 dark:bg-black/20 rounded-[48px] border border-[var(--border-subtle)] p-12 flex flex-col justify-between group transition-all hover:bg-white dark:hover:bg-black/40">
                  <div className="space-y-6">
                     <div className="w-14 h-14 rounded-2xl bg-[var(--accent-muted)] flex items-center justify-center text-[var(--accent)]">
                        <ShieldCheck size={28} />
                     </div>
                     <h3 className="text-3xl font-black">Segurança <br />Misteriosa.</h3>
                  </div>
                  <p className="text-[var(--text-secondary)] font-medium text-lg leading-relaxed">Criptografia de nível militar garante que apenas você veja seus dados.</p>
               </div>

               {/* Big Card 2 */}
               <div className="md:col-span-8 bg-white dark:bg-black/60 rounded-[48px] border border-[var(--border-subtle)] p-12 relative overflow-hidden group shadow-xl">
                  <div className="flex flex-col h-full">
                     <div className="flex gap-4 mb-auto">
                        <div className="px-5 py-2 rounded-full bg-[var(--bg-base)] text-xs font-black uppercase tracking-widest border border-[var(--border-subtle)]">Metas Ativas</div>
                        <div className="px-5 py-2 rounded-full bg-[var(--brand-muted)] text-[var(--brand)] text-xs font-black uppercase tracking-widest">+12% no mês</div>
                     </div>
                     <div className="max-w-lg">
                        <h3 className="text-4xl font-black mb-6 italic">Acompanhe cada centavo.</h3>
                        <p className="text-xl text-[var(--text-secondary)] font-medium">Categorização automática de gastos e visão de fluxo de caixa em tempo real. Saiba exatamente para onde seu dinheiro está indo.</p>
                     </div>
                  </div>
                  <div className="absolute right-[-10%] bottom-[-20%] w-[60%] opacity-5 group-hover:rotate-6 transition-transform duration-1000">
                     <TrendingUp size={400} />
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* ── Jewelry Pricing ── */}
      <section id="pricing" className="py-60 bg-[var(--bg-elevated)] relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-32 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand)]/10 border border-[var(--brand)]/20 mb-2">
                    <Star size={12} className="text-[var(--brand)]" fill="currentColor" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-[var(--brand)]">Escolha seu caminho</span>
                </div>
                <h2 className="text-6xl md:text-9xl font-black tracking-tighter leading-none">Planos sob medida.</h2>
                <p className="text-2xl text-[var(--text-secondary)] font-medium max-w-2xl mx-auto">Invista na sua paz de espírito financiera.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
                {loadingPlans ? (
                    [1,2,3].map(i => <div key={i} className="h-[650px] rounded-[48px] bg-white/40 animate-pulse border border-white/20" />)
                ) : (
                    plans.map((plan) => {
                        const isCurrent = currentPlan !== null && (plan.id === currentPlan || (plan.id === 'free' && currentPlan === 'pensionista'));
                        return (
                        <div key={plan.id} className={`group relative p-12 rounded-[48px] border transition-all duration-700 hover:-translate-y-4 flex flex-col ${plan.id === 'pro' ? 'bg-[var(--brand)] text-[var(--brand-text)] border-transparent scale-[1.05] z-20 shadow-2xl shadow-[var(--brand)]/20' : 'bg-white/60 dark:bg-black/60 border-[var(--border-subtle)] hover:bg-white dark:hover:bg-black/95 shadow-xl shadow-black/[0.02]'}`}>
                            {plan.id === 'pro' && <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-[var(--accent)] text-[var(--brand-text)] text-[11px] font-black uppercase tracking-widest px-10 py-4 rounded-full shadow-2xl z-30">Caminho da Paz</div>}
                            {plan.id === 'premium' && <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-[11px] font-black uppercase tracking-widest px-10 py-4 rounded-full shadow-2xl z-30">Elite</div>}
                            
                            <div className="mb-14">
                                <h3 className={`text-2xl font-black mb-10 ${plan.id === 'pro' ? 'text-[var(--brand-text)]' : 'text-[var(--brand)]'}`}>{plan.name}</h3>
                                {plan.id === 'trial' ? (
                                    <div className="flex flex-col gap-1">
                                        <span className="text-7xl font-black tracking-tighter">Grátis</span>
                                        <span className="text-[11px] font-black uppercase opacity-20 tracking-widest mt-2">Durante 7 Dias</span>
                                    </div>
                                ) : (
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-7xl font-black tracking-tighter">R$ {Math.floor(plan.price)}</span>
                                        <div className="flex flex-col">
                                            <span className="text-3xl font-bold opacity-30 leading-none">
                                                ,{plan.price % 1 !== 0 ? String(Math.round((plan.price % 1) * 100)).padStart(2, '0') : '90'}
                                            </span>
                                            <span className="text-[11px] font-black uppercase opacity-20 tracking-tighter mt-2">/mês</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-8 mb-16 flex-1">
                                <JewelryFeature label="Controle de Metas" value={plan.features.max_goals === -1 ? 'Ilimitado' : `${plan.features.max_goals} metas`} enabled={true} dark={plan.id !== 'pro'} />
                                <JewelryFeature label="Gestão de Ativos" value={plan.features.max_investments === -1 ? 'Ilimitado' : `${plan.features.max_investments} ativos`} enabled={true} dark={plan.id !== 'pro'} />
                                <JewelryFeature label="Relatórios Avançados" enabled={plan.features.export_enabled} dark={plan.id !== 'pro'} />
                                <JewelryFeature label="Análise com IA" enabled={plan.features.ai_chat_enabled} dark={plan.id !== 'pro'} />
                                <JewelryFeature label="Conexão Casal" enabled={plan.features.shared_account_enabled} dark={plan.id !== 'pro'} />
                                <JewelryFeature label="Suporte Exclusivo" enabled={plan.id !== 'trial'} dark={plan.id !== 'basico'} />
                            </div>

                            {isCurrent ? (
                                <div className={`w-full py-6 rounded-3xl text-center text-xs font-black uppercase tracking-widest border transition-all shadow-lg ${plan.id === 'pro' ? 'bg-white/10 text-white border-white/20' : 'bg-[var(--brand)]/10 text-[var(--brand)] border-[var(--brand)]/20'}`}>
                                    ✓ Plano Ativo
                                </div>
                            ) : (
                                <button 
                                    onClick={() => handleCheckout(plan.id)}
                                    disabled={checkoutLoading === plan.id}
                                    className={`w-full py-6 rounded-3xl text-center text-sm font-black uppercase tracking-widest transition-all active:scale-[0.98] shadow-2xl flex items-center justify-center gap-3 ${plan.id === 'pro' ? 'bg-white text-[var(--brand)] hover:bg-[#f0f0f0] shadow-white/10' : 'bg-[var(--brand)] text-[var(--brand-text)] hover:shadow-[0_10px_40px_-10px_var(--brand)]'}`}>
                                    {checkoutLoading === plan.id ? <Loader2 size={18} className="animate-spin" /> : <>Assinar Agora <ArrowRight size={18} /></>}
                                </button>
                            )}
                        </div>
                        );
                    })
                )}
            </div>
            
            <div className="mt-32 pt-20 border-t border-[var(--border-subtle)] flex flex-col md:flex-row items-center justify-between gap-12 group text-center md:text-left">
                <div className="flex flex-col gap-2">
                   <p className="text-lg font-bold opacity-60">Dúvidas sobre os planos?</p>
                   <Link href="/suporte" className="text-2xl font-black border-b-2 border-transparent hover:border-[var(--brand)] transition-all">Consulte nosso suporte especializado</Link>
                </div>
                <div className="w-20 h-20 rounded-full border border-[var(--border-subtle)] flex items-center justify-center animate-bounce">
                   <HelpCircle size={32} className="opacity-20" />
                </div>
            </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="py-60 relative flex flex-col items-center">
         <div className="max-w-5xl mx-auto px-6 text-center space-y-16">
            <div className="flex justify-center gap-1.5">
               {[1,2,3,4,5].map(i => <Star key={i} size={32} className="fill-[var(--brand)] text-[var(--brand)]" />)}
            </div>
            <h2 className="text-4xl md:text-8xl font-black tracking-tight leading-[0.9]">
               "O ZenCash é a evolução do controle financeiro. <span className="opacity-30 italic">Minimalismo e poder</span> em perfeita harmonia."
            </h2>
            <div className="flex flex-col items-center gap-6">
               <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[var(--brand)] to-[var(--accent)] p-1 group">
                    <div className="w-full h-full rounded-full bg-[var(--bg-base)] flex items-center justify-center text-4xl font-black text-[var(--brand)] group-hover:bg-white transition-colors uppercase">G</div>
               </div>
               <div className="space-y-1">
                  <p className="text-3xl font-black">Guilherme Santos</p>
                  <p className="text-xs font-black uppercase tracking-[0.3em] text-[var(--brand)]">Usuário Premium ha 1 ano</p>
               </div>
            </div>
         </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-72 text-center relative overflow-hidden bg-[var(--brand)] text-[var(--brand-text)] mx-6 my-12 rounded-[80px]">
         <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.1),transparent)]" />
         <div className="relative z-10 space-y-12">
            <h2 className="text-7xl md:text-[160px] font-black tracking-tighter leading-none mb-4 animate-in px-4">A calma financeira <br />mudar tudo.</h2>
            <p className="text-2xl md:text-4xl max-w-3xl mx-auto font-medium opacity-80 leading-relaxed mb-10 px-4">Junte-se à comunidade que cultiva paz e prosperidade todos os dias.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 pt-10 px-6">
               <Link href="/register" className="w-full sm:w-auto bg-white text-[var(--brand)] px-20 py-8 rounded-[40px] text-2xl font-black hover:scale-[1.05] active:scale-[0.98] transition-all shadow-[0_20px_80px_-15px_rgba(255,255,255,0.4)]">Abra seu Santuário Agora</Link>
            </div>
         </div>
      </section>

      {/* ── Footer ── */}
      <footer className="pt-40 pb-20 bg-[var(--bg-base)]">
         <div className="max-w-7xl mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-20 mb-32">
               <div className="md:col-span-5 space-y-10">
                  <div className="flex items-center gap-4">
                     <div className="w-14 h-14 rounded-2xl bg-[var(--brand)] flex items-center justify-center shadow-2xl shadow-[var(--brand)]/10"><Leaf size={28} className="text-white" /></div>
                     <span className="text-4xl font-black tracking-tighter italic">ZenCash</span>
                  </div>
                  <p className="text-xl text-[var(--text-secondary)] font-medium leading-relaxed">
                     Cultivando sanidade financeira em um mundo ruidoso. Do básico ao premium, 
                     sua jornada para a liberdade começa aqui.
                  </p>
               </div>
               
               <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-16">
                  <FooterCol title="Portal" links={['Início', 'Recursos', 'Planos', 'Blog']} />
                  <FooterCol title="Suporte" links={['Central de Ajuda', 'Comunidade', 'Termos', 'Privacidade']} />
                  <FooterCol title="Zen" links={['Meditação Financeira', 'Workshop IA', 'Guia do Casal']} />
               </div>
            </div>
            
            <div className="pt-16 border-t border-[var(--border-subtle)] flex flex-col md:flex-row justify-between items-center gap-10">
               <p className="text-[10px] text-[var(--text-muted)] font-black uppercase tracking-[0.4em]">© 2026 ZEN CASH INC. HARMONY IS THE NEW WEALTH.</p>
               <div className="flex gap-10 items-center">
                  <Globe size={18} className="opacity-20 hover:opacity-100 transition-opacity" />
                  <Smartphone size={18} className="opacity-20 hover:opacity-100 transition-opacity" />
                  <Lock size={18} className="opacity-20 hover:opacity-100 transition-opacity" />
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
}

function NavLink({ href, children }: { href: string, children: React.ReactNode }) {
  return (
    <Link href={href} className="px-5 py-2 text-sm font-black uppercase tracking-widest opacity-40 hover:opacity-100 hover:scale-105 transition-all text-[var(--text-primary)]">
      {children}
    </Link>
  );
}

function JewelryFeature({ label, value, enabled, dark }: { label: string, value?: any, enabled: boolean, dark: boolean }) {
    return (
        <div className={`flex items-center justify-between ${enabled ? '' : 'opacity-10 grayscale select-none'}`}>
            <div className="flex items-center gap-5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center border-2 ${dark ? 'border-[var(--brand)] text-[var(--brand)]' : 'border-white/40 text-white'}`}>
                    {enabled ? <Check size={12} strokeWidth={4} /> : <X size={12} strokeWidth={4} />}
                </div>
                <span className={`text-[15px] font-bold ${dark ? 'text-[var(--text-secondary)]' : 'text-white/80'}`}>{label}</span>
            </div>
            {enabled && value && <span className={`text-[10px] font-black px-3 py-1 rounded-full ${dark ? 'bg-[var(--brand)]/10 text-[var(--brand)]' : 'bg-white/20 text-white'}`}>{value}</span>}
        </div>
    )
}

function FooterCol({ title, links }: { title: string, links: string[] }) {
    return (
        <div className="space-y-8">
            <h4 className="text-xs font-black uppercase tracking-[0.3em] opacity-40">{title}</h4>
            <ul className="space-y-5">
                {links.map(link => (
                    <li key={link}><Link href="#" className="text-[15px] font-bold text-[var(--text-secondary)] hover:text-[var(--brand)] transition-colors">{link}</Link></li>
                ))}
            </ul>
        </div>
    );
}
