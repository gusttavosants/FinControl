"use client";

import { useState, useEffect } from "react";
import { Check, X, Loader2, Sparkles, ShieldCheck, Zap, Star, Layout, Briefcase, ChevronRight, HelpCircle, ArrowRight, Shield, HeartHandshake } from "lucide-react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Plan {
  id: string; 
  name: string; 
  price: number; 
  currency: string;
  features: { 
    max_goals: number; 
    max_investments: number; 
    export_enabled: boolean; 
    ai_chat_enabled: boolean; 
    shared_account_enabled: boolean; 
  };
}

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);

  useEffect(() => { 
    fetchPlans(); 
    fetchCurrentPlan(); 
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API_URL}/api/plans/available`);
      if (!response.ok) throw new Error("Failed to fetch plans");
      const data = await response.json();
      setPlans(data.plans || []);
    } catch (err) { 
      console.error("Error fetching plans:", err);
      // Fallback for demo if API fails
      setPlans([
        { id: "free", name: "Básico", price: 9.99, currency: "BRL", features: { max_goals: 3, max_investments: 10, export_enabled: false, ai_chat_enabled: false, shared_account_enabled: false } },
        { id: "pro", name: "Profissional", price: 19.99, currency: "BRL", features: { max_goals: 20, max_investments: 100, export_enabled: true, ai_chat_enabled: true, shared_account_enabled: true } },
        { id: "premium", name: "Premium", price: 39.99, currency: "BRL", features: { max_goals: -1, max_investments: -1, export_enabled: true, ai_chat_enabled: true, shared_account_enabled: true } }
      ]); 
    } finally { setLoading(false); }
  };

  const fetchCurrentPlan = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await fetch(`${API_URL}/api/plans/current`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      setCurrentPlan(data.current_plan);
    } catch { /* ignore */ }
  };

  const handleCheckout = async (planId: string) => {
    if (planId === "free" && !localStorage.getItem("token")) {
        router.push("/register?plan=free");
        return;
    }
    
    setCheckoutLoading(planId);
    
    // Simulating a delay
    await new Promise(r => setTimeout(r, 800));

    const userJson = localStorage.getItem("user");
    const user = userJson ? JSON.parse(userJson) : null;
    
    const whatsappNumber = "5512935854861";
    const text = encodeURIComponent(
      `🔥 *QUERO ATIVAR MEU ACESSO PREMIUM*\n\nPlano: *${planId.toUpperCase()}*\nUsuário: ${user?.nome || "Novo Usuário"}\nEmail: ${user?.email || "Pendente"}\n\nPor favor, me envie as instruções de pagamento para ativação imediata.`
    );
    window.open(`https://wa.me/${whatsappNumber}?text=${text}`, "_blank");
    setCheckoutLoading(null);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-brand" />
        <p className="text-sm font-black uppercase tracking-widest opacity-40">Carregando ofertas...</p>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-24 animate-fade-in py-12 px-6">
      {/* ── Hero ── */}
      <div className="text-center max-w-3xl mx-auto space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand/5 border border-brand/10 mb-2">
            <Sparkles size={14} className="text-brand" />
            <span className="text-[10px] font-black uppercase tracking-widest text-brand">Investimento em você</span>
        </div>
        <h1 className="text-5xl lg:text-7xl font-black tracking-tighter" style={{ color: "var(--text-primary)" }}>
           Sua liberdade <br /><span className="text-gradient">não tem preço.</span>
        </h1>
        <p className="text-lg font-medium leading-relaxed opacity-60 max-w-2xl mx-auto" style={{ color: "var(--text-secondary)" }}>
          Escolha o nível de inteligência que você deseja para gerenciar seu patrimônio. 
          Sem pegadinhas, sem contratos de fidelidade.
        </p>
      </div>

      {/* ── Pricing Grid ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative max-w-7xl mx-auto">
        {/* Dynamic Abstract Background */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-10 pointer-events-none">
            <div className="absolute top-0 right-1/4 w-96 h-96 bg-brand blur-[150px] rounded-full" />
            <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-purple-500 blur-[150px] rounded-full" />
        </div>

        {plans.map((plan) => {
          const isCurrent = currentPlan !== null && plan.id === currentPlan;
          const isPremium = plan.id === "premium";
          const isPro = plan.id === "pro";

          return (
            <div key={plan.id} className={`group relative glass-card p-10 flex flex-col transition-all duration-300 hover:-translate-y-2 ${isPremium ? 'border-brand border-2 shadow-2xl shadow-brand/20 bg-brand/[0.02]' : isPro ? 'scale-105 z-10' : ''}`}>
              
              {isPremium && (
                <div className="absolute top-0 right-10 -translate-y-1/2 flex items-center gap-1.5 bg-brand text-white px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest shadow-xl">
                    <Star size={12} fill="white" /> Plano dos Sonhos
                </div>
              )}

              {isPro && (
                <div className="absolute top-0 right-10 -translate-y-1/2 flex items-center gap-1.5 bg-emerald-500 text-white px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-widest shadow-xl">
                    <Zap size={12} fill="white" /> Mais Popular
                </div>
              )}

              <div className="mb-10">
                <p className="text-[11px] font-black uppercase tracking-[0.2em] mb-6 opacity-40">{plan.name}</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-xs font-bold opacity-30">R$</span>
                  <span className="text-6xl font-black tracking-tighter" style={{ color: "var(--text-primary)" }}>
                    {Math.floor(plan.price)}
                    <span className="text-3xl opacity-40">,{String(Math.round((plan.price % 1) * 100)).padStart(2, '0')}</span>
                  </span>
                  <span className="text-xs font-black uppercase opacity-30 ml-2 tracking-widest">/mês</span>
                </div>
              </div>

              <div className="space-y-5 mb-12 flex-1">
                 <FeatureItem label="Metas de economia" value={plan.features.max_goals === -1 ? "Ilimitadas" : plan.features.max_goals} enabled={true} />
                 <FeatureItem label="Ativos em Carteira" value={plan.features.max_investments === -1 ? "Ilimitados" : plan.features.max_investments} enabled={true} />
                 <FeatureItem label="Exportação Excel/CSV" enabled={plan.features.export_enabled} />
                 <FeatureItem label="Analista de IA" enabled={plan.features.ai_chat_enabled} />
                 <FeatureItem label="Sincronização Casal" enabled={plan.features.shared_account_enabled} />
                 <FeatureItem label="Suporte Prioritário" enabled={plan.id !== 'free'} />
              </div>

              {isCurrent ? (
                <div className="w-full py-5 rounded-2xl bg-emerald-500/10 text-emerald-600 text-center text-xs font-black uppercase tracking-widest border border-emerald-500/20 backdrop-blur-sm">
                   ✓ Você está aqui
                </div>
              ) : (
                <button 
                  onClick={() => handleCheckout(plan.id)} 
                  disabled={checkoutLoading === plan.id} 
                  className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${isPremium || isPro ? 'bg-brand text-white shadow-brand/20 hover:bg-brand-hover' : 'bg-white dark:bg-slate-800 text-brand border border-brand/20 hover:bg-slate-50'}`}>
                  {checkoutLoading === plan.id ? <Loader2 size={20} className="animate-spin" /> : 
                    <><Zap size={20} /> Ativar Agora</>}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Comparison Table Header ── */}
      <div className="pt-24 text-center">
         <h2 className="text-3xl font-black tracking-tight mb-4">Compare os detalhes</h2>
         <p className="text-sm font-bold opacity-40 uppercase tracking-[0.3em]">Visão técnica completa</p>
      </div>

      <div className="overflow-x-auto glass-card !rounded-3xl border-brand/5">
        <table className="w-full text-left border-collapse">
            <thead>
                <tr className="border-b border-brand/5">
                    <th className="p-8 text-xs font-black uppercase tracking-widest opacity-30">Funcionalidade</th>
                    <th className="p-8 text-center text-xs font-black uppercase tracking-widest opacity-60">Free</th>
                    <th className="p-8 text-center text-xs font-black uppercase tracking-widest text-emerald-500">Pro</th>
                    <th className="p-8 text-center text-xs font-black uppercase tracking-widest text-[#818cf8]">Premium</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-brand/5">
                <ComparisonRow label="Transações mensais" free="Ilimitado" pro="Ilimitado" premium="Ilimitado" />
                <ComparisonRow label="Metas Financeiras" free="3 metas" pro="20 metas" premium="Ilimitado" />
                <ComparisonRow label="Ativos de Investimento" free="10 ativos" pro="100 ativos" premium="Ilimitado" />
                <ComparisonRow label="Relatórios Avançados" free={false} pro={true} premium={true} highlight />
                <ComparisonRow label="Insight com IA" free={false} pro={true} premium={true} />
                <ComparisonRow label="Modo Casal (Sincronização)" free={false} pro={true} premium={true} highlight />
                <ComparisonRow label="Prioridade no Suporte" free="Email" pro="Prioritário" premium="Exclusivo" />
                <ComparisonRow label="Personalização de Ícones" free={false} pro={false} premium={true} />
            </tbody>
        </table>
      </div>

      {/* ── Guarantees ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pt-12">
         <div className="flex flex-col items-center text-center group">
            <div className="w-16 h-16 rounded-[24px] bg-brand/5 text-brand flex items-center justify-center mb-6 transition-all group-hover:bg-brand group-hover:text-white group-hover:rotate-6 shadow-sm"><Shield size={32} /></div>
            <h4 className="text-lg font-black mb-3">Segurança Militar</h4>
            <p className="text-xs font-medium leading-relaxed opacity-50 px-4">Seus dados são protegidos com AES-256 e nunca são compartilhados com terceiros.</p>
         </div>
         <div className="flex flex-col items-center text-center group">
            <div className="w-16 h-16 rounded-[24px] bg-emerald-500/5 text-emerald-500 flex items-center justify-center mb-6 transition-all group-hover:bg-emerald-500 group-hover:text-white group-hover:-rotate-6 shadow-sm"><HeartHandshake size={32} /></div>
            <h4 className="text-lg font-black mb-3">Sem Fidelidade</h4>
            <p className="text-xs font-medium leading-relaxed opacity-50 px-4">Cancele quando quiser diretamente no painel. Sem multas, sem ligações chatas.</p>
         </div>
         <div className="flex flex-col items-center text-center group">
            <div className="w-16 h-16 rounded-[24px] bg-purple-500/5 text-purple-500 flex items-center justify-center mb-6 transition-all group-hover:bg-purple-500 group-hover:text-white group-hover:rotate-6 shadow-sm"><HelpCircle size={32} /></div>
            <h4 className="text-lg font-black mb-3">Suporte Real</h4>
            <p className="text-xs font-medium leading-relaxed opacity-50 px-4">Nada de robôs. Fale com humanos apaixonados por finanças que te ajudam de verdade.</p>
         </div>
      </div>
    </div>
  );
}

function FeatureItem({ label, value, enabled }: { label: string; value?: string | number; enabled: boolean; }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${enabled ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
          {enabled ? <Check size={12} strokeWidth={4} /> : <X size={10} strokeWidth={4} />}
        </div>
        <span className={`text-xs font-bold ${enabled ? '' : 'opacity-30 italic'}`} style={{ color: "var(--text-secondary)" }}>{label}</span>
      </div>
      {enabled && value && <span className="text-[10px] font-black px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800">{value}</span>}
    </div>
  );
}

function ComparisonRow({ label, free, pro, premium, highlight }: { label: string, free: any, pro: any, premium: any, highlight?: boolean }) {
    const renderValue = (val: any) => {
        if (typeof val === 'boolean') {
            return val ? <Check size={18} className="mx-auto text-emerald-500" strokeWidth={3} /> : <X size={18} className="mx-auto text-slate-300 dark:text-slate-700" strokeWidth={3} />;
        }
        return <span className="text-xs font-bold leading-none">{val}</span>;
    };

    return (
        <tr className={`transition-all hover:bg-slate-50/50 dark:hover:bg-slate-800/20 ${highlight ? 'bg-brand/[0.01]' : ''}`}>
            <td className="p-8 text-xs font-black" style={{ color: "var(--text-secondary)" }}>{label}</td>
            <td className="p-8 text-center">{renderValue(free)}</td>
            <td className="p-8 text-center">{renderValue(pro)}</td>
            <td className="p-8 text-center">{renderValue(premium)}</td>
        </tr>
    );
}
