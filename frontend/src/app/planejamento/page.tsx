"use client";

import { useEffect, useState } from "react";
import {
  Plus, Trash2, Target, PiggyBank, AlertTriangle, CheckCircle2,
  Briefcase, TrendingUp, Edit3, Calendar, ArrowRight, Wallet, Check
} from "lucide-react";
import {
  orcamentoAPI, metasAPI, categoriasAPI, investimentosAPI
} from "@/lib/api";
import { formatCurrency, getCurrentMonth, getCurrentYear } from "@/lib/utils";
import MonthSelector from "@/components/MonthSelector";
import Modal from "@/components/Modal";

// Interfaces
interface OrcamentoResumo { id: number; categoria: string; limite: number; gasto: number; restante: number; percentual: number; }
interface MetaItem { id: number; descricao: string; valor_alvo: number; valor_atual: number; prazo: string | null; concluida: boolean; }

export default function PlanejamentoPage() {
  const [mes, setMes] = useState(getCurrentMonth());
  const [ano, setAno] = useState(getCurrentYear());
  const [orcamentos, setOrcamentos] = useState<OrcamentoResumo[]>([]);
  const [metas, setMetas] = useState<MetaItem[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOrc, setModalOrc] = useState(false);
  const [formOrc, setFormOrc] = useState({ categoria: "", limite: "" });

  const [modalMeta, setModalMeta] = useState(false);
  const [editingMetaId, setEditingMetaId] = useState<number | null>(null);
  const [formMeta, setFormMeta] = useState({ descricao: "", valor_alvo: "", valor_atual: "", prazo: "" });

  const [investResumo, setInvestResumo] = useState<{ total_investido: number; total_ativos: number; } | null>(null);

  const loadData = async () => {
    const isInitial = orcamentos.length === 0 && metas.length === 0;
    if (isInitial) setLoading(true);
    try {
      const [orc, met, cats] = await Promise.all([
        orcamentoAPI.resumo(mes, ano),
        metasAPI.listar(),
        categoriasAPI.despesa(),
      ]);
      setOrcamentos(orc);
      setMetas(met);
      setCategorias(cats);
    } catch (e) { console.error(e); }
    try {
      const resumo = await investimentosAPI.resumo();
      setInvestResumo(resumo);
    } catch { setInvestResumo(null); }
    if (isInitial) setLoading(false);
  };

  useEffect(() => { loadData(); }, [mes, ano]);

  const handleCreateOrc = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { categoria: formOrc.categoria, limite: parseFloat(formOrc.limite), mes, ano };
    setModalOrc(false);
    try {
      await orcamentoAPI.criar(payload);
      // Local update (simplified gast=0 since new)
      setOrcamentos(prev => [...prev.filter(o => o.categoria !== payload.categoria), { id: Date.now(), ...payload, gasto: 0, restante: payload.limite, percentual: 0 }]);
      loadData(); // Sync in bg
    } catch { loadData(); }
  };

  const handleDeleteOrc = async (id: number) => {
    if (confirm("Remover este orçamento?")) {
      setOrcamentos(prev => prev.filter(o => o.id !== id));
      try { await orcamentoAPI.deletar(id); } catch { loadData(); }
    }
  };

  const openCreateMeta = () => { setEditingMetaId(null); setFormMeta({ descricao: "", valor_alvo: "", valor_atual: "", prazo: "" }); setModalMeta(true); };
  const openEditMeta = (m: MetaItem) => { setEditingMetaId(m.id); setFormMeta({ descricao: m.descricao, valor_alvo: String(m.valor_alvo), valor_atual: String(m.valor_atual), prazo: m.prazo || "" }); setModalMeta(true); };

  const handleSubmitMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { descricao: formMeta.descricao, valor_alvo: parseFloat(formMeta.valor_alvo), valor_atual: parseFloat(formMeta.valor_atual) || 0, prazo: formMeta.prazo || null };
    setModalMeta(false);
    try {
      if (editingMetaId) {
        setMetas(prev => prev.map(m => m.id === editingMetaId ? { ...m, ...payload, id: editingMetaId } : m));
        await metasAPI.atualizar(editingMetaId, payload);
      } else {
        const res = await metasAPI.criar(payload);
        if (res.id) setMetas(prev => [...prev, { ...payload, id: res.id, concluida: false }]);
      }
    } catch { loadData(); }
  };

  const handleToggleMeta = async (m: MetaItem) => {
    setMetas(prev => prev.map(item => item.id === m.id ? { ...item, concluida: !item.concluida } : item));
    try { await metasAPI.atualizar(m.id, { concluida: !m.concluida }); } catch { loadData(); }
  };
  const handleDeleteMeta = async (id: number) => {
    if (confirm("Remover esta meta?")) {
      setMetas(prev => prev.filter(m => m.id !== id));
      try { await metasAPI.deletar(id); } catch { loadData(); }
    }
  };

  const getBarColorClass = (pct: number) => {
    if (pct >= 100) return "bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]";
    if (pct >= 85) return "bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.3)]";
    return "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]";
  };

  const totalLimite = orcamentos.reduce((s, o) => s + o.limite, 0);
  const totalGasto = orcamentos.reduce((s, o) => s + o.gasto, 0);
  const totalRestante = totalLimite - totalGasto;
  const totalPercent = totalLimite > 0 ? (totalGasto / totalLimite) * 100 : 0;

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title text-gradient">Planejamento</h1>
          <p className="page-subtitle">Gerencie seus limites e objetivos de longo prazo</p>
        </div>
        <MonthSelector mes={mes} ano={ano} onChange={(m, a) => { setMes(m); setAno(a); }} />
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center h-96 gap-4">
          <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border-default)", borderTopColor: "var(--brand)" }} />
          <p className="text-sm font-medium animate-pulse" style={{ color: "var(--text-muted)" }}>Consolidando orçamentos...</p>
        </div>
      ) : (
        <>
          {/* ── Budget Overview ── */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <PiggyBank size={20} className="text-emerald-500" /> Orçamento por Categoria
              </h2>
              <button onClick={() => { setFormOrc({ categoria: categorias[0] || "", limite: "" }); setModalOrc(true); }} className="btn-primary">
                <Plus size={16} /> Definir Limite
              </button>
            </div>

            {/* Global Progress */}
            {orcamentos.length > 0 && (
              <div className="glass-card p-6 border-l-4 border-l-emerald-500 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-5"><TrendingUp size={60} /></div>
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div>
                      <p className="text-[10px] uppercase font-black tracking-widest" style={{ color: "var(--text-muted)" }}>Status Consolidado</p>
                      <h3 className="text-xl font-black mt-1" style={{ color: "var(--text-primary)" }}>
                        {formatCurrency(totalGasto)} <span className="text-sm font-medium opacity-40">de {formatCurrency(totalLimite)}</span>
                      </h3>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-bold ${totalPercent >= 100 ? "text-rose-500" : "text-emerald-500"}`}>
                        {totalPercent.toFixed(1)}% utilizado
                      </p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {totalRestante >= 0 ? `${formatCurrency(totalRestante)} disponíveis` : `Déficit de ${formatCurrency(Math.abs(totalRestante))}`}
                      </p>
                    </div>
                  </div>
                  <div className="w-full h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className={`h-full transition-all duration-1000 ease-out rounded-full ${getBarColorClass(totalPercent)}`} 
                      style={{ width: `${Math.min(totalPercent, 100)}%` }} />
                  </div>
                </div>
              </div>
            )}

            {/* Individual Budget Grid */}
            {orcamentos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {orcamentos.map((orc) => (
                  <div key={orc.id} className="glass-card p-5 group hover:translate-y-[-2px] transition-all">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: orc.percentual >= 100 ? "#ef4444" : "#10b981" }} />
                        <span className="text-sm font-bold truncate max-w-[150px]" style={{ color: "var(--text-primary)" }}>{orc.categoria}</span>
                      </div>
                      <button onClick={() => handleDeleteOrc(orc.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-500/10 rounded-lg transition-all">
                        <Trash2 size={14} className="text-rose-400" />
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-end mb-2">
                      <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{formatCurrency(orc.gasto)}</p>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>/ {formatCurrency(orc.limite)}</p>
                    </div>

                    <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden mb-2">
                      <div className={`h-full transition-all duration-700 ${getBarColorClass(orc.percentual)}`} 
                        style={{ width: `${Math.min(orc.percentual, 100)}%` }} />
                    </div>

                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${orc.percentual >= 100 ? "bg-rose-500/10 text-rose-600" : orc.percentual >= 85 ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600"}`}>
                        {orc.percentual.toFixed(0)}%
                      </span>
                      <span className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                        {orc.restante >= 0 ? `Restam ${formatCurrency(orc.restante)}` : `Vazamento ${formatCurrency(Math.abs(orc.restante))}`}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-300">
                  <PiggyBank size={32} className="text-slate-300" />
                </div>
                <h3 className="font-bold text-base mb-1" style={{ color: "var(--text-primary)" }}>Distribua seu Orçamento</h3>
                <p className="text-sm max-w-xs mx-auto" style={{ color: "var(--text-muted)" }}>
                  Crie limites por categoria para evitar surpresas no fim do mês.
                </p>
              </div>
            )}
          </div>

          {/* ── Investments Teaser ── */}
          {investResumo && investResumo.total_ativos > 0 && (
            <div className="glass-card p-4 bg-gradient-to-r from-emerald-500/5 to-transparent border-l-4 border-l-emerald-500">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                    <Briefcase size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>Patrimônio Investido</p>
                    <p className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{investResumo.total_ativos} ativos ativos</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-black text-emerald-600">{formatCurrency(investResumo.total_investido)}</p>
                  <Link href="/investimentos" className="text-[10px] font-bold uppercase tracking-widest text-emerald-500 hover:underline">Ver Carteira →</Link>
                </div>
              </div>
            </div>
          )}

          {/* ── Goals Section ── */}
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <Target size={20} className="text-purple-500" /> Metas de Longo Prazo
              </h2>
              <button onClick={openCreateMeta} className="btn-primary" style={{ background: "linear-gradient(135deg, #8b5cf6, #3366ff)" }}>
                <Plus size={16} /> Nova Meta
              </button>
            </div>

            {metas.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {metas.map((m) => {
                  const pct = m.valor_alvo > 0 ? (m.valor_atual / m.valor_alvo) * 100 : 0;
                  return (
                    <div key={m.id} className={`glass-card p-6 overflow-hidden relative group transition-all ${m.concluida ? "opacity-60 bg-slate-50/50" : "hover:shadow-xl"}`}>
                      {m.concluida && (
                        <div className="absolute -top-2 -right-8 bg-emerald-500 text-white py-4 px-10 rotate-45 shadow-lg flex items-center justify-center">
                          <Check size={14} className="mr-1" /> CONCLUÍDO
                        </div>
                      )}
                      
                      <div className="flex items-start justify-between mb-6">
                        <div className="flex gap-4">
                          <button onClick={() => handleToggleMeta(m)} className={`w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all ${m.concluida ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-200 hover:border-purple-500"}`}>
                            {m.concluida ? <CheckCircle2 size={20} /> : <Target size={20} className="text-slate-300" />}
                          </button>
                          <div>
                            <h3 className={`font-black text-base leading-tight ${m.concluida ? "line-through opacity-50" : ""}`} style={{ color: "var(--text-primary)" }}>{m.descricao}</h3>
                            {m.prazo ? (
                              <div className="flex items-center gap-1.5 mt-1 opacity-60">
                                <Calendar size={12} />
                                <span className="text-[10px] uppercase font-bold tracking-widest">{new Date(m.prazo).toLocaleDateString("pt-BR")}</span>
                              </div>
                            ) : (
                              <p className="text-[10px] uppercase font-bold tracking-widest mt-1 opacity-40">Sem prazo definido</p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openEditMeta(m)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><Edit3 size={15} /></button>
                          <button onClick={() => handleDeleteMeta(m.id)} className="p-2 hover:bg-rose-50 rounded-lg text-rose-400 transition-colors"><Trash2 size={15} /></button>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex justify-between items-end">
                          <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{formatCurrency(m.valor_atual)}</p>
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted" style={{ color: "var(--text-muted)" }}>Meta: {formatCurrency(m.valor_alvo)}</p>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className={`h-full bg-gradient-to-r from-purple-600 to-blue-500 transition-all duration-1000`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                        <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-700">
                          <span className="text-[10px] font-black uppercase" style={{ color: "var(--text-muted)" }}>Progresso</span>
                          <span className="text-[10px] font-black text-purple-600">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card p-12 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center mx-auto mb-4 border border-dashed border-slate-300">
                  <Target size={32} className="text-slate-300" />
                </div>
                <h3 className="font-bold text-base mb-1" style={{ color: "var(--text-primary)" }}>Qual seu próximo sonho?</h3>
                <p className="text-sm max-w-xs mx-auto" style={{ color: "var(--text-muted)" }}>
                  Defina metas de economia para atingir seus objetivos financeiros.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Modals ── */}
      <Modal isOpen={modalOrc} onClose={() => setModalOrc(false)} title="Definir Limite Mensal">
        <form onSubmit={handleCreateOrc} className="space-y-5">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Categoria</label>
            <select required value={formOrc.categoria} onChange={(e) => setFormOrc({ ...formOrc, categoria: e.target.value })} className="input-field">
              {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Limite (R$)</label>
            <input type="number" step="0.01" required value={formOrc.limite} onChange={(e) => setFormOrc({ ...formOrc, limite: e.target.value })} className="input-field" placeholder="0,00" />
          </div>
          <div className="flex gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <button type="button" onClick={() => setModalOrc(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" className="btn-primary flex-1">Confirmar Limite</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={modalMeta} onClose={() => setModalMeta(false)} title={editingMetaId ? "Editar Meta" : "Nova Meta Financeira"}>
        <form onSubmit={handleSubmitMeta} className="space-y-5">
          <div>
            <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>O que você deseja conquistar?</label>
            <input type="text" required value={formMeta.descricao} onChange={(e) => setFormMeta({ ...formMeta, descricao: e.target.value })} className="input-field" placeholder="Ex: Viagem para o Japão" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Valor Alvo</label>
              <input type="number" step="0.01" required value={formMeta.valor_alvo} onChange={(e) => setFormMeta({ ...formMeta, valor_alvo: e.target.value })} className="input-field" placeholder="0,00" />
            </div>
            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Valor Já Salvo</label>
              <input type="number" step="0.01" value={formMeta.valor_atual} onChange={(e) => setFormMeta({ ...formMeta, valor_atual: e.target.value })} className="input-field" placeholder="0,00" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-black uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Prazo Estimado (Opcional)</label>
            <input type="date" value={formMeta.prazo} onChange={(e) => setFormMeta({ ...formMeta, prazo: e.target.value })} className="input-field" />
          </div>
          <div className="flex gap-3 pt-4 border-t border-[var(--border-subtle)]">
            <button type="button" onClick={() => setModalMeta(false)} className="btn-secondary flex-1">Depois</button>
            <button type="submit" className="btn-primary flex-1" style={{ background: "linear-gradient(135deg, #8b5cf6, #3366ff)" }}>{editingMetaId ? "Atualizar" : "Começar Agora"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

import Link from "next/link";
