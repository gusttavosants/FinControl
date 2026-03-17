"use client";

import Calculator from "@/components/Calculator";
import { BookOpen, CheckCircle, Info, Lightbulb, Zap } from "lucide-react";

export default function CalculadoraPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title text-gradient">Ferramentas de Apoio</h1>
          <p className="page-subtitle">Calculadora financeira para estimativas rápidas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Calculator Column */}
        <div className="lg:col-span-5 xl:col-span-4">
          <Calculator />
        </div>

        {/* Info Column */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          <div className="glass-card p-8 h-full relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5 -rotate-12"><BookOpen size={120} /></div>
            
            <div className="relative z-10">
              <h2 className="text-xl font-black mb-8 flex items-center gap-3" style={{ color: "var(--text-primary)" }}>
                <Info size={24} className="text-brand" /> Manual de Operações
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {[
                   { title: "Saldos Rápidos", desc: "Use para somar faturas de cartão antes de lançar como despesa única.", icon: Zap },
                   { title: "Divisão de Contas", desc: "Perfeito para calcular a parte de cada um em jantares ou viagens em grupo.", icon: Lightbulb },
                   { title: "Planejamento", desc: "Estime quanto sobrará do salário após subtrair os gastos fixos projetados.", icon: CheckCircle },
                   { title: "Rendimento", desc: "Calcule porcentagens rápidas sobre seus aportes de investimentos.", icon: Zap },
                 ].map((item, i) => (
                   <div key={i} className="flex gap-4 p-4 rounded-3xl bg-slate-50 dark:bg-slate-900/50 border border-transparent hover:border-brand/20 transition-all group">
                      <div className="w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 flex items-center justify-center text-brand shadow-sm ring-1 ring-black/5"><item.icon size={18} /></div>
                      <div>
                        <h4 className="text-sm font-black mb-1" style={{ color: "var(--text-primary)" }}>{item.title}</h4>
                        <p className="text-xs leading-relaxed opacity-60" style={{ color: "var(--text-secondary)" }}>{item.desc}</p>
                      </div>
                   </div>
                 ))}
              </div>

              <div className="mt-12 p-6 rounded-3xl bg-gradient-to-br from-brand/10 to-purple-500/10 border-2 border-brand/5">
                 <h3 className="text-sm font-black mb-4 uppercase tracking-widest text-brand">Dica Pro</h3>
                 <p className="text-xs font-bold leading-relaxed" style={{ color: "var(--text-muted)" }}>
                   Você pode usar o resultado final da calculadora e copiar diretamente para os campos de "Valor" nas páginas de Receitas e Despesas para economizar tempo.
                 </p>
                 <div className="mt-4 flex gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black opacity-30 uppercase">Atalho Teclado</span>
                      <span className="text-xs font-black">ENTER = "="</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black opacity-30 uppercase">Limpar</span>
                      <span className="text-xs font-black">ESC = "C"</span>
                    </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
