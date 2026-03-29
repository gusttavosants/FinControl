"use client";

import { useRouter } from "next/navigation";
import { XCircle, ArrowLeft, RefreshCw, AlertCircle } from "lucide-react";

export default function CheckoutCancelPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center px-6 selection:bg-brand/30 selection:text-white overflow-hidden relative">
      {/* Background Abstract Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-red-600 blur-[120px] rounded-full animate-pulse" />
      </div>

      <div className="max-w-md w-full relative z-10">
        <div className="glass-card p-10 text-center border-white/5 bg-white/[0.01] backdrop-blur-xl rounded-[40px] animate-in fade-in slide-in-from-bottom-8 duration-700">
          <div className="relative inline-block mb-10">
            <div className="absolute inset-0 bg-red-500 blur-2xl opacity-10 animate-pulse" />
            <div className="relative w-24 h-24 rounded-[32px] bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500">
              <XCircle size={48} strokeWidth={1.5} />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-red-400 border-2 border-[#0A0A0B]">
                <AlertCircle size={14} />
            </div>
          </div>

          <div className="space-y-4 mb-10">
            <h1 className="text-4xl font-black tracking-tighter text-white">
              Pagamento <span className="text-red-500">Cancelado.</span>
            </h1>
            <p className="text-sm font-medium leading-relaxed text-slate-400">
              O processo foi interrompido e nenhuma cobrança foi realizada. Se houve algum problema técnico, nossa equipe está à disposição.
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => router.push("/#pricing")}
              className="w-full bg-white text-black py-5 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 hover:bg-slate-200 shadow-xl"
            >
              <RefreshCw size={20} />
              Tentar Novamente
            </button>

            <button
              onClick={() => router.push("/")}
              className="w-full bg-transparent text-white/40 hover:text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all"
            >
              <ArrowLeft size={18} />
              Ir para Dashboard
            </button>
          </div>

          <div className="mt-10 pt-8 border-t border-white/5">
             <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                Dúvidas? <span className="text-brand/60 cursor-pointer hover:text-brand transition-colors">Fale com o suporte</span>
             </p>
          </div>
        </div>
      </div>
    </div>
  );
}
