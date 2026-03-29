"use client";

import { useState, useEffect } from "react";
import {
  CreditCard, Calendar, AlertCircle, Loader2, TrendingUp, Sparkles, ShieldCheck, Star, X, CheckCircle2, ChevronRight, Leaf, ArrowLeft, ExternalLink
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { paymentAPI } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

interface Subscription {
  plan: string;
  status: string;
  has_subscription: boolean;
  current_period_start?: string;
  current_period_end?: string;
  cancel_at_period_end: boolean;
}

interface Payment {
  id: number;
  amount: number;
  currency: string;
  status: string;
  payment_method: string;
  description: string;
  created_at: string;
}

export default function SubscriptionPage() {
  const router = useRouter();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sub, history] = await Promise.all([
        paymentAPI.getSubscription(),
        paymentAPI.getHistory()
      ]);
      setSubscription(sub);
      setPayments(history);
    } catch (error) {
      console.error("Error loading subscription data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePortal = async () => {
    setActionLoading(true);
    try {
      const { url } = await paymentAPI.getPortal();
      if (url) window.location.href = url;
    } catch (e: any) {
      alert(e.message || "Erro ao acessar o portal de pagamentos.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 bg-[var(--bg-base)]">
        <div className="w-12 h-12 rounded-2xl bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] animate-pulse shadow-2xl">
           <CreditCard size={24} />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Validando Assinatura...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)] selection:bg-[var(--brand)] selection:text-[var(--brand-text)] font-sans antialiased overflow-x-hidden pb-20">
      
      {/* ── Background Atmosphere ── */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden h-screen z-0">
         <div className="absolute top-[-10%] left-[20%] w-[60%] h-[60%] bg-[var(--brand-muted)] rounded-full blur-[120px] opacity-20 animate-pulse" />
      </div>

      <main className="max-w-4xl mx-auto px-6 relative z-10 pt-20">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-16 px-4">
           <Link href="/configuracoes" className="group flex items-center gap-3 text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all">
              <div className="w-10 h-10 rounded-xl bg-white/40 dark:bg-black/20 flex items-center justify-center border border-white/20 group-hover:-translate-x-1 transition-transform">
                 <ArrowLeft size={16} />
              </div>
              Voltar aos Ajustes
           </Link>
           <div className="text-right">
              <div className="flex items-center justify-end gap-2 mb-1">
                 <Leaf size={14} className="text-[var(--brand)]" />
                 <span className="text-[10px] font-black uppercase tracking-[0.2em]">ZenCash Elite</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Account Registry v1.2</p>
           </div>
        </div>

        {/* ── Subscription Status Card ── */}
        <div className="bg-white/40 dark:bg-black/20 p-2 rounded-[54px] border border-white/20 dark:border-white/5 backdrop-blur-3xl shadow-2xl mb-12">
           <div className="bg-white/60 dark:bg-black/40 rounded-[48px] p-8 md:p-14 border border-white/10 relative overflow-hidden text-center md:text-left">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--brand)]/5 blur-[100px] -translate-y-1/2 translate-x-1/2" />
              
              <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                 <div className="w-24 h-24 rounded-[32px] bg-[var(--brand)] text-[var(--brand-text)] flex items-center justify-center shadow-2xl shadow-[var(--brand)]/20 shrink-0">
                    <Star size={48} className="animate-pulse" />
                 </div>
                 <div className="flex-1 space-y-2">
                    <h1 className="text-5xl font-black italic tracking-tighter" style={{ color: "var(--text-primary)" }}>
                       Status: {subscription?.plan === 'premium' ? 'Zen Premium' : subscription?.plan === 'pro' ? 'Zen Pro' : 'Zen Free'}
                    </h1>
                    <p className="text-lg font-medium opacity-50">Sua jornada financeira está sendo cultivada no nível mais alto.</p>
                 </div>
                 <div className="px-6 py-2 rounded-full border-2 border-emerald-500/20 bg-emerald-500/10 text-emerald-600 text-xs font-black uppercase tracking-widest">
                    {subscription?.status === 'active' ? 'Assinatura Ativa' : 'Pendente'}
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12 pt-12 border-t border-[var(--border-subtle)] relative z-10">
                 <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Ciclo de Cobrança</p>
                    <p className="text-lg font-black">{subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR') : 'Sem registro'}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Método de Pagamento</p>
                    <p className="text-lg font-black flex items-center gap-2 justify-center md:justify-start">
                       <CreditCard size={18} /> Stripe Secure
                    </p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[10px] font-black uppercase tracking-widest opacity-30">Renovação</p>
                    <p className={`text-lg font-black ${subscription?.cancel_at_period_end ? 'text-rose-500' : 'text-emerald-500'}`}>
                       {subscription?.cancel_at_period_end ? 'Pendente de Cancelamento' : 'Ativa & Automática'}
                    </p>
                 </div>
              </div>

              <div className="mt-12 flex flex-col md:flex-row gap-4 relative z-10">
                 <button 
                   onClick={handlePortal}
                   disabled={actionLoading}
                   className="flex-1 py-6 rounded-3xl bg-[var(--brand)] text-[var(--brand-text)] font-black uppercase tracking-widest text-sm shadow-2xl shadow-[var(--brand)]/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
                    {actionLoading ? <Loader2 size={24} className="animate-spin" /> : <><ExternalLink size={20} /> Modificar Assinatura (Portal Stripe)</>}
                 </button>
              </div>
           </div>
        </div>

        {/* ── Transaction History ── */}
        <div className="bg-white/40 dark:bg-black/20 p-8 md:p-12 rounded-[54px] border border-white/20 backdrop-blur-xl shadow-xl">
           <div className="flex items-center gap-4 mb-10 px-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/5">
                 <Calendar size={24} />
              </div>
              <h3 className="text-2xl font-black italic tracking-tighter">Histórico de Recibos</h3>
           </div>

           <div className="space-y-4">
              {payments.length === 0 ? (
                 <div className="py-20 text-center opacity-30 italic">
                    Nenhum pagamento registrado nesta era.
                 </div>
              ) : (
                 payments.map((p) => (
                    <div key={p.id} className="p-8 rounded-[32px] border border-white/20 bg-white/40 dark:bg-black/20 flex flex-col md:flex-row items-center justify-between gap-6 hover:scale-[1.01] transition-all group overflow-hidden relative">
                       <div className="absolute inset-0 bg-emerald-500/5 translate-x-full group-hover:translate-x-0 transition-transform duration-700" />
                       <div className="flex items-center gap-6 relative z-10">
                          <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                             <CheckCircle2 size={24} />
                          </div>
                          <div>
                             <p className="text-lg font-black tracking-tight">{p.description}</p>
                             <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{new Date(p.created_at).toLocaleDateString('pt-BR')} • {p.payment_method}</p>
                          </div>
                       </div>
                       <div className="text-center md:text-right relative z-10">
                          <p className="text-2xl font-black">{p.currency} {p.amount.toFixed(2)}</p>
                          <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 italic">Pago com Sucesso</span>
                       </div>
                    </div>
                 ))
              )}
           </div>
        </div>

        <div className="mt-20 text-center opacity-40">
           <p className="text-[10px] font-black uppercase tracking-[0.4em]">ZEN CASH INC • SECURE BILLING REGISTER</p>
        </div>
      </main>
    </div>
  );
}
