"use client";

import { useState, useEffect } from "react";
import { Check, X, Loader2, Sparkles, ShieldCheck, Zap, Star, Layout, Briefcase, ChevronRight } from "lucide-react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface Plan {
  id: string; name: string; price: number; currency: string;
  features: { max_transactions: number; max_goals: number; max_investments: number; export_enabled: boolean; ai_chat_enabled: boolean; shared_account_enabled: boolean; };
}

export default function PricingPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string>("free");

  useEffect(() => { fetchPlans(); fetchCurrentPlan(); }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch(`${API_URL}/api/plans/available`);
      const data = await response.json();
      setPlans(data.plans);
    } catch { /* ignore */ } finally { setLoading(false); }
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

  const handleCheckout = async (planId: string, paymentMethod: "stripe" | "mercadopago") => {
    if (planId === "free") return;
    setCheckoutLoading(planId);
    try {
      const token = localStorage.getItem("token");
      if (!token) { router.push("/login"); return; }
      const response = await fetch(`${API_URL}/api/payment/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ plan: planId, payment_method: paymentMethod }),
      });
      const data = await response.json();
      if (data.success) window.location.href = paymentMethod === "stripe" ? data.checkout_url : data.init_point;
    } catch { alert("Erro ao iniciar checkout. Tente novamente."); } finally { setCheckoutLoading(null); }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-10 h-10 animate-spin text-brand" /></div>;

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-in py-12">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-4xl lg:text-5xl font-black mb-6" style={{ color: "var(--text-primary)" }}>
           Escolha a potência do seu <span className="text-gradient">Controle</span>
        </h1>
        <p className="text-sm font-medium leading-relaxed opacity-60" style={{ color: "var(--text-secondary)" }}>
          Planos flexíveis para cada estágio da sua maturidade financeira. 
          Comece grátis, evolua quando estiver pronto.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const isPremium = plan.id === "premium";

          return (
            <div key={plan.id} className={`group relative glass-card p-8 transition-all hover:-translate-y-2 ${isPremium ? 'border-brand border-2 shadow-2xl shadow-brand/10 bg-brand/5' : 'border-transparent'}`}>
              
              {isPremium && (
                <div className="absolute top-0 right-8 -translate-y-1/2 flex items-center gap-1 bg-brand text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">
                   <Star size={10} fill="white" /> Recomendado
                </div>
              )}

              <div className="mb-10">
                <p className="text-[10px] font-black uppercase tracking-widest mb-4 opacity-50">{plan.name}</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black tracking-tighter" style={{ color: "var(--text-primary)" }}>R$ {plan.price.toFixed(0)}</span>
                  <span className="text-sm font-bold opacity-40">/mês</span>
                </div>
              </div>

              <div className="space-y-6 mb-12">
                 <FeatureItem label="Transações mensais" value={plan.features.max_transactions === -1 ? "Ilimitadas" : plan.features.max_transactions} enabled={true} />
                 <FeatureItem label="Metas de economia" value={plan.features.max_goals === -1 ? "Ilimitadas" : plan.features.max_goals} enabled={true} />
                 <FeatureItem label="Controle de Ativos" value={plan.features.max_investments === -1 ? "Ilimitadas" : plan.features.max_investments} enabled={true} />
                 <FeatureItem label="Exportação de Relatórios" enabled={plan.features.export_enabled} />
                 <FeatureItem label="Analista Financeiro (IA)" enabled={plan.features.ai_chat_enabled} />
                 <FeatureItem label="Sincronização Casal" enabled={plan.features.shared_account_enabled} />
              </div>

              {isCurrent ? (
                <div className="w-full py-3.5 rounded-2xl bg-emerald-500/10 text-emerald-600 text-center text-xs font-black uppercase tracking-widest border border-emerald-500/20">
                   ✓ Seu Plano Atual
                </div>
              ) : plan.id === "free" ? (
                <button onClick={() => router.push("/register")} className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
                  Começar Grátis
                </button>
              ) : (
                <div className="space-y-3">
                   <button onClick={() => handleCheckout(plan.id, "stripe")} disabled={checkoutLoading === plan.id} 
                     className="w-full py-4 rounded-2xl bg-brand text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all">
                      {checkoutLoading === plan.id ? <Loader2 size={16} className="animate-spin" /> : <><ShieldCheck size={16} /> Assinar com Stripe</>}
                   </button>
                   <button onClick={() => handleCheckout(plan.id, "mercadopago")} disabled={checkoutLoading === plan.id}
                     className="w-full py-4 rounded-2xl border-2 border-brand/20 text-brand text-[10px] font-black uppercase tracking-widest hover:bg-brand/5 transition-all text-center">
                      Mercado Pago (PIX/Cartão)
                   </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-20 pt-20 border-t border-slate-100 dark:border-slate-800">
         <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-brand shadow-sm"><Zap size={24} /></div>
            <h4 className="text-sm font-black mb-2" style={{ color: "var(--text-primary)" }}>Ativação Instantânea</h4>
            <p className="text-[11px] leading-relaxed opacity-60">Seu acesso é liberado no mesmo segundo após a confirmação do pagamento.</p>
         </div>
         <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-brand shadow-sm"><ShieldCheck size={24} /></div>
            <h4 className="text-sm font-black mb-2" style={{ color: "var(--text-primary)" }}>Cancelamento Sem Multa</h4>
            <p className="text-[11px] leading-relaxed opacity-60">Não gostou? Cancele com um clique nas configurações. Sem perguntas, sem burocracia.</p>
         </div>
         <div className="text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 flex items-center justify-center mx-auto mb-4 text-brand shadow-sm"><Layout size={24} /></div>
            <h4 className="text-sm font-black mb-2" style={{ color: "var(--text-primary)" }}>Suporte Premium</h4>
            <p className="text-[11px] leading-relaxed opacity-60">Dúvidas sobre o sistema? Nosso time fala português e responde em menos de 2h úteis.</p>
         </div>
      </div>
    </div>
  );
}

function FeatureItem({ label, value, enabled }: { label: string; value?: string | number; enabled: boolean; }) {
  return (
    <div className="flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className={`p-1 rounded-md ${enabled ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-100 text-slate-400'}`}>
          {enabled ? <Check size={12} strokeWidth={4} /> : <X size={12} strokeWidth={4} />}
        </div>
        <span className={`text-xs font-bold ${enabled ? '' : 'opacity-40 italic'}`} style={{ color: "var(--text-secondary)" }}>{label}</span>
      </div>
      {enabled && value && <span className="text-[10px] font-black px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">{value}</span>}
    </div>
  );
}
