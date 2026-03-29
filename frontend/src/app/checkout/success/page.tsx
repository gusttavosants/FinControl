"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

export default function CheckoutSuccessPage() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push("/");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-6 selection:bg-brand/30 selection:text-white overflow-hidden relative">
      {/* Background Abstract Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-20 pointer-events-none">
          <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-brand blur-[120px] rounded-full animate-pulse" />
          <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-purple-600 blur-[120px] rounded-full animate-pulse delay-1000" />
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="glass-card p-10 text-center border-brand/20 shadow-2xl shadow-brand/10 bg-brand/[0.02] backdrop-blur-xl rounded-[40px] animate-in fade-in zoom-in duration-700">
          <div className="relative inline-block mb-10">
            <div className="absolute inset-0 bg-emerald-500 blur-2xl opacity-20 animate-pulse" />
            <div className="relative w-24 h-24 rounded-[32px] bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-inner">
              <CheckCircle2 size={48} strokeWidth={1.5} className="animate-in zoom-in spin-in delay-300 duration-1000" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-brand flex items-center justify-center text-white border-2 border-[#0A0A0B] animate-bounce">
                <Sparkles size={14} fill="white" />
            </div>
          </div>

          <div className="space-y-4 mb-10">
            <h1 className="text-4xl font-black tracking-tighter text-white">
              Bem-vindo ao <span className="text-gradient">Próximo Nível.</span>
            </h1>
            <p className="text-sm font-medium leading-relaxed text-slate-400">
              Seu acesso foi ativado com sucesso. Prepare-se para uma experiência financeira sem limites e totalmente inteligente.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 group transition-all hover:bg-white/[0.08] hover:border-brand/30">
            <div className="flex items-center gap-4 mb-2">
                <ShieldCheck size={20} className="text-brand" />
                <span className="text-xs font-black uppercase tracking-widest text-brand">Assinatura Ativa</span>
            </div>
            <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Pronto para Zarpar</p>
                <p className="text-xs font-bold text-white">Redirecionando em {countdown}s</p>
            </div>
            {/* Progress Bar Simulation */}
            <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                <div 
                    className="h-full bg-brand transition-all duration-1000 ease-linear shadow-[0_0_10px_rgba(var(--brand-rgb),0.5)]" 
                    style={{ width: `${(countdown / 5) * 100}%` }} 
                />
            </div>
          </div>

          <button
            onClick={() => router.push("/")}
            className="w-full bg-brand hover:bg-brand-hover text-white py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl shadow-brand/20 group"
          >
            Acessar Dashboard
            <ArrowRight size={20} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    </div>
  );
}
