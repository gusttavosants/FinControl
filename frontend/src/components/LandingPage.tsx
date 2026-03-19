"use client";

import { ArrowRight, BarChart3, Shield, Users, Zap, CheckCircle2, Star, Globe, Smartphone, Lock, ShieldCheck, HeartHandshake, HelpCircle, X, Check, Loader2, Sparkles, Layout, Menu } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LandingPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  useEffect(() => {
    // Fetch available plans
    fetch(`${API_URL}/api/plans/available`)
      .then(res => res.json())
      .then(data => setPlans(data.plans || []))
      .catch(() => setPlans([
        { id: "free", name: "Básico", price: 9.99, features: { max_goals: 3, max_investments: 10, export_enabled: false, ai_chat_enabled: false, shared_account_enabled: false } },
        { id: "pro", name: "Profissional", price: 19.99, features: { max_goals: 20, max_investments: 100, export_enabled: true, ai_chat_enabled: true, shared_account_enabled: true } },
        { id: "premium", name: "Premium", price: 39.99, features: { max_goals: -1, max_investments: -1, export_enabled: true, ai_chat_enabled: true, shared_account_enabled: true } }
      ]))
      .finally(() => setLoadingPlans(false));

    // Fetch current plan if logged in
    const token = localStorage.getItem("token");
    if (token) {
      fetch(`${API_URL}/api/plans/current`, { headers: { Authorization: `Bearer ${token}` } })
        .then(res => res.json())
        .then(data => setCurrentPlan(data.current_plan))
        .catch(() => {});
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0b] text-white selection:bg-brand/30 selection:text-white">
      {/* ── Navigation ── */}
      <nav className="fixed top-0 w-full z-[100] backdrop-blur-xl border-b border-white/5 bg-[#0a0a0b]/80">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand to-purple-600 flex items-center justify-center shadow-lg shadow-brand/20">
                <Zap size={20} className="text-white" />
             </div>
             <span className="text-xl font-black tracking-tighter">FinControl<span className="text-brand">.</span></span>
          </div>
          
          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-10">
            <Link href="#features" className="text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">Recursos</Link>
            <Link href="#pricing" className="text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">Planos</Link>
            <Link href="/suporte" className="text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">Suporte</Link>
            <Link href="/login" className="text-xs font-black uppercase tracking-widest opacity-60 hover:opacity-100 transition-opacity">Entrar</Link>
            <Link href="/register" className="bg-white text-black px-8 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all transform active:scale-95 shadow-xl shadow-white/5">Começar</Link>
          </div>

          {/* Mobile Nav Toggle */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-white">
            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Nav Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden absolute top-20 left-0 w-full bg-[#0a0a0b] border-b border-white/5 p-6 animate-fade-in space-y-6">
            <Link href="#features" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-black uppercase tracking-widest">Recursos</Link>
            <Link href="#pricing" onClick={() => setMobileMenuOpen(false)} className="block text-sm font-black uppercase tracking-widest">Planos</Link>
            <Link href="/suporte" className="block text-sm font-black uppercase tracking-widest">Suporte</Link>
            <Link href="/login" className="block text-sm font-black uppercase tracking-widest">Entrar</Link>
            <Link href="/register" className="block bg-white text-black px-6 py-4 rounded-xl text-center text-sm font-black uppercase tracking-widest">Começar Agora</Link>
          </div>
        )}
      </nav>

      {/* ── Hero Section ── */}
      <section className="relative pt-48 pb-32 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full">
           <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand/20 rounded-full blur-[120px] animate-pulse" />
           <div className="absolute top-40 right-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] animate-pulse delay-1000" />
        </div>

        <div className="max-w-7xl mx-auto px-6 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 mb-10 animate-fade-in hover:bg-white/10 transition-colors cursor-default">
             <span className="flex h-2 w-2 rounded-full bg-brand animate-ping" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Revolucione sua Gestão Financeira</span>
          </div>
          
          <h1 className="text-6xl md:text-[100px] font-black tracking-tighter mb-10 leading-[0.85] max-w-5xl mx-auto">
             Assuma o Controle <br />do seu <span className="text-gradient">Destino Financeiro</span>.
          </h1>
          
          <p className="text-lg md:text-2xl text-slate-400 max-w-3xl mx-auto mb-14 font-medium leading-relaxed">
             A plataforma definitiva para quem busca liberdade. Gestão de gastos, investimentos e metas com inteligência artificial e visão compartilhada de verdade.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-24">
            <Link href="/register" className="w-full sm:w-auto bg-brand text-white px-12 py-6 rounded-3xl text-lg font-black flex items-center justify-center gap-3 shadow-[0_20px_50px_rgba(var(--brand-rgb,51,102,255),0.3)] hover:scale-105 active:scale-95 transition-all">
               Criar conta <ArrowRight size={22} strokeWidth={3} />
            </Link>
            <Link href="#features" className="w-full sm:w-auto bg-white/5 text-white border border-white/10 px-12 py-6 rounded-3xl text-lg font-black hover:bg-white/10 transition-all backdrop-blur-sm">
               Como funciona
            </Link>
          </div>

          <div className="relative group max-w-6xl mx-auto animate-in">
             <div className="absolute -inset-1 bg-gradient-to-r from-brand to-purple-500 rounded-[42px] blur-2xl opacity-20 group-hover:opacity-40 transition-all duration-700" />
             <div className="relative bg-[#131416] rounded-[40px] border border-white/10 p-3 overflow-hidden shadow-2xl shadow-black/80">
                <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                <Image src="/hero-landing.png" width={1400} height={900} alt="Dashboard Preview" className="rounded-[30px] w-full h-auto object-cover opacity-90 group-hover:opacity-100 transition-opacity" priority />
             </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-40 relative bg-[#0a0a0b]">
         <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-24 space-y-4">
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter">Tudo o que você precisa <br /><span className="opacity-40">em um só lugar.</span></h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
               <FeatureCard 
                 icon={<Users size={28} />} 
                 title="Visão Casal" 
                 color="brand"
                 desc="Compartilhe finanças com seu parceiro sem perder a individualidade. O primeiro aplicativo que entende que casais têm planos em comum e contas separadas." 
               />
               <FeatureCard 
                 icon={<BarChart3 size={28} />} 
                 title="Patrimônio Total" 
                 color="purple-500"
                 desc="Visualize seu patrimônio líquido e fluxo de caixa instantaneamente. Dashboards dinâmicos que consolidam contas, cartões e investimentos em tempo real." 
               />
               <FeatureCard 
                 icon={<Zap size={28} />} 
                 title="IA Preditiva" 
                 color="amber-500"
                 desc="Nosso algoritmo de IA analisa seus padrões de consumo e sugere orçamentos inteligentes para você economizar sem sofrer e alcançar suas metas 2x mais rápido." 
               />
            </div>
         </div>
      </section>

      {/* ── Pricing Section (DIRECTLY HERE) ── */}
      <section id="pricing" className="py-40 bg-white/[0.02] border-y border-white/5 relative overflow-hidden">
        <div className="absolute top-1/2 left-0 w-[600px] h-[600px] bg-brand/5 rounded-full blur-[150px] -translate-x-1/2" />
        
        <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="text-center mb-20 space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/10 border border-brand/20 mb-2">
                    <Star size={12} className="text-brand" fill="currentColor" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-brand">Planos para todos</span>
                </div>
                <h2 className="text-4xl md:text-6xl font-black tracking-tighter">Escolha seu <span className="text-gradient">Nível de Controle</span></h2>
                <p className="text-slate-400 font-medium max-w-2xl mx-auto">Invista na sua liberdade financeira com inteligência. Sem pegadinhas.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative items-stretch pt-12">
                {loadingPlans ? (
                    [1,2,3].map(i => <div key={i} className="h-[550px] rounded-[40px] bg-white/5 animate-pulse" />)
                ) : (
                    plans.map((plan) => {
                        const isCurrent = currentPlan !== null && plan.id === currentPlan;
                        return (
                        <div key={plan.id} className={`group relative p-10 rounded-[40px] border transition-all duration-500 hover:-translate-y-2 flex flex-col ${plan.id === 'pro' ? 'bg-white text-black border-white scale-105 z-20 shadow-2xl shadow-white/20' : 'bg-[#121214] border-white/5 hover:border-white/10 shadow-xl'}`}>
                            {plan.id === 'pro' && <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[11px] font-black uppercase tracking-widest px-8 py-3 rounded-full shadow-2xl shadow-emerald-500/40 z-30">Mais Popular</div>}
                            
                            <div className="mb-10">
                                <h3 className={`text-xl font-black mb-6 ${plan.id === 'pro' ? 'text-black' : 'text-white'}`}>{plan.name}</h3>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-5xl font-black tracking-tighter">R$ {Math.floor(plan.price)}</span>
                                    <div className="flex flex-col">
                                        <span className="text-2xl font-bold opacity-40 leading-none">
                                            ,{plan.price % 1 !== 0 ? String(Math.round((plan.price % 1) * 100)).padStart(2, '0') : '00'}
                                        </span>
                                        <span className="text-[10px] font-black uppercase opacity-20 tracking-tighter mt-1">/mês</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6 mb-12 flex-1">
                                <PlanFeature label="Metas de economia" value={plan.features.max_goals === -1 ? '∞' : plan.features.max_goals} enabled={true} dark={plan.id !== 'pro'} />
                                <PlanFeature label="Ativos em Carteira" value={plan.features.max_investments === -1 ? '∞' : plan.features.max_investments} enabled={true} dark={plan.id !== 'pro'} />
                                <PlanFeature label="Relatórios Avançados" enabled={plan.features.export_enabled} dark={plan.id !== 'pro'} />
                                <PlanFeature label="Analista de IA" enabled={plan.features.ai_chat_enabled} dark={plan.id !== 'pro'} />
                                <PlanFeature label="Sincronização Casal" enabled={plan.features.shared_account_enabled} dark={plan.id !== 'pro'} />
                            </div>

                            {isCurrent ? (
                                <div className={`w-full py-5 rounded-2xl text-center text-xs font-black uppercase tracking-widest border ${plan.id === 'pro' ? 'bg-black/5 text-black border-black/10' : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'}`}>
                                    ✓ Você está aqui
                                </div>
                            ) : (
                                <Link href="/pricing" className={`w-full py-5 rounded-2xl text-center text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl ${plan.id === 'pro' ? 'bg-black text-white hover:bg-zinc-800 shadow-black/10' : 'bg-white text-black hover:bg-brand hover:text-white'}`}>
                                    Ativar Agora
                                </Link>
                            )}
                        </div>
                        );
                    })
                )}
            </div>
            
            <div className="mt-16 text-center">
                <Link href="/pricing" className="text-xs font-black uppercase tracking-widest opacity-40 hover:opacity-100 flex items-center justify-center gap-2 transition-all">
                    Ver comparação completa de recursos <ArrowRight size={14} />
                </Link>
            </div>
        </div>
      </section>

      {/* ── Social Proof ── */}
      <section className="py-40 relative">
         <div className="max-w-4xl mx-auto px-6 text-center space-y-12">
            <div className="flex justify-center gap-2">
               {[1,2,3,4,5].map(i => <Star key={i} size={24} className="fill-brand text-brand" />)}
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-[1.1]">
               "O FinControl mudou nossa forma de lidar com o dinheiro como casal. Finalmente temos clareza sem brigas."
            </h2>
            <div className="flex flex-col items-center gap-4">
               <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-brand to-purple-500 p-0.5">
                    <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-xl font-black">G</div>
               </div>
               <div>
                  <p className="text-xl font-black">Guilherme Santo</p>
                  <p className="text-xs font-black uppercase tracking-widest text-brand">Usuário Premium ha 1 ano</p>
               </div>
            </div>
         </div>
      </section>

      {/* ── Guaranteed Quality ── */}
      <section className="py-20 border-y border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-wrap justify-between items-center gap-12">
                <Guaranty icon={<ShieldCheck className="text-brand" />} text="Criptografia de ponta a ponta" />
                <Guaranty icon={<Lock className="text-brand" />} text="Privacidade 100% garantida" />
                <Guaranty icon={<Globe className="text-brand" />} text="Acesso em qualquer dispositivo" />
                <Guaranty icon={<HeartHandshake className="text-brand" />} text="Suporte humano 24/7" />
            </div>
        </div>
      </section>

      {/* ── CTA Final ── */}
      <section className="py-52 text-center relative overflow-hidden">
         <div className="absolute inset-0 bg-brand/10 blur-[150px] rounded-full scale-150" />
         <div className="relative z-10 space-y-10">
            <h2 className="text-6xl md:text-[120px] font-black tracking-tighter leading-none">Sua liberdade <br /><span className="text-gradient">começa aqui.</span></h2>
            <p className="text-xl md:text-2xl text-slate-400 max-w-2xl mx-auto font-medium">Junte-se a quem já assumiu o controle total das próprias finanças.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-10">
               <Link href="/register" className="w-full sm:w-auto bg-white text-black px-12 py-6 rounded-3xl text-xl font-black hover:bg-brand hover:text-white transition-all shadow-2xl shadow-white/5 active:scale-95 leading-none">Começar Gratuitamente</Link>
            </div>
         </div>
      </section>

      {/* ── Footer ── */}
      <footer className="py-20 border-t border-white/5 bg-black">
         <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col md:flex-row justify-between items-start gap-12 mb-20">
               <div className="space-y-6 max-w-sm">
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-xl bg-brand flex items-center justify-center"><Zap size={20} className="text-white" /></div>
                     <span className="text-2xl font-black tracking-tighter">FinControl</span>
                  </div>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">
                     A plataforma definitiva para organizar sua vida financeira, investir com inteligência e realizar seus maiores sonhos.
                  </p>
               </div>
               
               <div className="grid grid-cols-2 sm:grid-cols-3 gap-16">
                  <FooterCol title="Produto" links={['Recursos', 'Preços', 'Segurança', 'IA']} />
                  <FooterCol title="Empresa" links={['Sobre', 'Blog', 'Carreiras', 'Contato']} />
                  <FooterCol title="Legal" links={['Privacidade', 'Termos', 'Cookies']} />
               </div>
            </div>
            
            <div className="pt-10 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-6">
               <p className="text-xs text-slate-500 font-bold uppercase tracking-[0.2em]">© 2026 FinControl Inc. Made with ❤️ for explorers.</p>
               <div className="flex gap-8">
                  <div className="w-5 h-5 bg-white/10 rounded-full" />
                  <div className="w-5 h-5 bg-white/10 rounded-full" />
                  <div className="w-5 h-5 bg-white/10 rounded-full" />
               </div>
            </div>
         </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color }: { icon: any, title: string, desc: string, color: string }) {
    return (
        <div className="space-y-8 group p-8 rounded-[32px] hover:bg-white/[0.03] transition-all duration-500 border border-transparent hover:border-white/5">
            <div className={`w-16 h-16 rounded-[24px] bg-white text-black flex items-center justify-center group-hover:scale-110 transition-all duration-500 shadow-xl shadow-white/5`}>
                {icon}
            </div>
            <div className="space-y-4">
                <h3 className="text-3xl font-black">{title}</h3>
                <p className="text-slate-400 font-medium leading-relaxed text-lg">
                    {desc}
                </p>
            </div>
        </div>
    );
}

function PlanFeature({ label, value, enabled, dark }: { label: string, value?: any, enabled: boolean, dark: boolean }) {
    return (
        <div className={`flex items-center justify-between ${enabled ? '' : 'opacity-20 grayscale'}`}>
            <div className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${dark ? 'bg-white/10 text-white' : 'bg-black/10 text-black'}`}>
                    {enabled ? <Check size={12} strokeWidth={4} /> : <X size={12} strokeWidth={4} />}
                </div>
                <span className={`text-[13px] font-bold ${dark ? 'text-slate-300' : 'text-zinc-700'}`}>{label}</span>
            </div>
            {enabled && value && <span className={`text-[10px] font-black px-2 py-0.5 rounded-lg ${dark ? 'bg-white/10' : 'bg-black/5'}`}>{value}</span>}
        </div>
    )
}

function Guaranty({ icon, text }: { icon: any, text: string }) {
    return (
        <div className="flex items-center gap-3">
            <div className="w-6 h-6">{icon}</div>
            <span className="text-xs font-black uppercase tracking-widest opacity-80">{text}</span>
        </div>
    )
}

function FooterCol({ title, links }: { title: string, links: string[] }) {
    return (
        <div className="space-y-6">
            <h4 className="text-xs font-black uppercase tracking-[0.2em]">{title}</h4>
            <ul className="space-y-4">
                {links.map(link => (
                    <li key={link}><Link href="#" className="text-sm font-medium text-slate-500 hover:text-white transition-colors">{link}</Link></li>
                ))}
            </ul>
        </div>
    );
}
