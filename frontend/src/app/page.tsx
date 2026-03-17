"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle, Clock,
  CheckCircle2, Database, Download, ArrowUpRight, ArrowDownRight,
  Briefcase, PieChart as PieIcon, Activity, Calendar, ExternalLink
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import {
  dashboardAPI, seedAPI, exportAPI, investimentosAPI, cotacoesAPI
} from "@/lib/api";
import {
  formatCurrency, formatDate, getCurrentMonth, getCurrentYear, COLORS
} from "@/lib/utils";
import MonthSelector from "@/components/MonthSelector";

// Interfaces
interface Summary {
  total_receitas: number; total_despesas: number; saldo: number;
  despesas_pagas: number; despesas_pendentes: number;
  total_receitas_count: number; total_despesas_count: number; despesas_pagas_count: number;
}
interface CatGasto { categoria: string; total: number; percentual: number; }
interface Evolucao { mes: string; receitas: number; despesas: number; saldo: number; }
interface Vencimento { id: number; descricao: string; categoria: string; valor: number; data_vencimento: string; dias_restantes: number; status: string; }

export default function DashboardPage() {
  const [mes, setMes] = useState(getCurrentMonth());
  const [ano, setAno] = useState(getCurrentYear());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categorias, setCategorias] = useState<CatGasto[]>([]);
  const [evolucao, setEvolucao] = useState<Evolucao[]>([]);
  const [vencimentos, setVencimentos] = useState<Vencimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [investResumo, setInvestResumo] = useState<{
    total_investido: number; total_ativos: number; tickers: string[];
    valor_atual?: number; lucro?: number; lucro_pct?: number;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sum, cats, evo, venc] = await Promise.all([
        dashboardAPI.resumo(mes, ano),
        dashboardAPI.categorias(mes, ano),
        dashboardAPI.evolucao(6),
        dashboardAPI.vencimentos(30),
      ]);
      setSummary(sum);
      setCategorias(cats);
      setEvolucao(evo);
      setVencimentos(venc);
    } catch (e) { console.error(e); }

    try {
      const resumo = await investimentosAPI.resumo();
      let valorAtual = resumo.total_investido;
      if (resumo.tickers && resumo.tickers.length > 0) {
        try {
          const cotacoes = await cotacoesAPI.batch(resumo.tickers);
          if (cotacoes?.results) {
            const invList = await investimentosAPI.listar();
            valorAtual = 0;
            for (const inv of invList) {
              const cot = cotacoes.results.find((c: any) => c.symbol === inv.ticker);
              valorAtual += cot ? inv.quantidade * cot.regularMarketPrice : inv.quantidade * inv.preco_medio;
            }
          }
        } catch {}
      }
      const lucro = valorAtual - resumo.total_investido;
      const lucroPct = resumo.total_investido > 0 ? (lucro / resumo.total_investido) * 100 : 0;
      setInvestResumo({ ...resumo, valor_atual: valorAtual, lucro, lucro_pct: lucroPct });
    } catch { setInvestResumo(null); }
    setLoading(false);
  };

  useEffect(() => { loadData(); }, [mes, ano]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border-default)", borderTopColor: "var(--brand)" }} />
        <p className="text-sm font-medium animate-pulse" style={{ color: "var(--text-muted)" }}>Carregando seus dados...</p>
      </div>
    );
  }

  const isEmpty = summary && summary.total_receitas === 0 && summary.total_despesas === 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title text-gradient">Dashboard</h1>
          <p className="page-subtitle">Sua saúde financeira em um só lugar</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <MonthSelector mes={mes} ano={ano} onChange={(m, a) => { setMes(m); setAno(a); }} />
          <a href={exportAPI.excel(mes, ano)} className="btn-secondary">
            <Download size={15} /> Exportar
          </a>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 stagger-children">
          <div className="glass-card hover-scale p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><TrendingUp size={80} /></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Entradas</span>
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-sm shadow-emerald-500/10"><TrendingUp size={20} /></div>
            </div>
            <p className="text-3xl font-black tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>{formatCurrency(summary.total_receitas)}</p>
            <div className="flex items-center gap-2 relative z-10">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600">{summary.total_receitas_count} transações</span>
            </div>
          </div>

          <div className="glass-card hover-scale p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><TrendingDown size={80} /></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Saídas</span>
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-sm shadow-rose-500/10"><TrendingDown size={20} /></div>
            </div>
            <p className="text-3xl font-black tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>{formatCurrency(summary.total_despesas)}</p>
            <div className="flex items-center gap-2 relative z-10">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-600">{summary.total_despesas_count} lançamentos</span>
            </div>
          </div>

          <div className="glass-card hover-scale p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><Wallet size={80} /></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Saldo Líquido</span>
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-sm ${summary.saldo >= 0 ? 'bg-blue-500/10 text-blue-500 shadow-blue-500/10' : 'bg-amber-500/10 text-amber-500 shadow-amber-500/10'}`}><Wallet size={20} /></div>
            </div>
            <p className={`text-3xl font-black tracking-tight mb-2 ${summary.saldo >= 0 ? "text-blue-500" : "text-amber-500"}`}>{formatCurrency(summary.saldo)}</p>
            <div className="flex items-center gap-2 relative z-10">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${summary.saldo >= 0 ? 'bg-blue-500/10 text-blue-600' : 'bg-amber-500/10 text-amber-600'}`}>Em conta hoje</span>
            </div>
          </div>

          <div className="glass-card hover-scale p-6 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><Clock size={80} /></div>
            <div className="flex items-center justify-between mb-4 relative z-10">
              <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Pendências</span>
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-sm shadow-amber-500/10"><Clock size={20} /></div>
            </div>
            <p className="text-3xl font-black tracking-tight mb-2" style={{ color: "var(--text-primary)" }}>{formatCurrency(summary.despesas_pendentes)}</p>
            <div className="mt-2 text-[10px] font-bold opacity-60">
              {summary.despesas_pagas_count} de {summary.total_despesas_count} pagas
            </div>
          </div>
        </div>
      )}

      {/* ── Investimentos Alert ── */}
      {investResumo && investResumo.total_ativos > 0 && (
        <div className="glass-card p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity rotate-12">
            <Briefcase size={120} />
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 relative z-10">
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-xl" 
                style={{ background: "linear-gradient(135deg, var(--brand), #8b5cf6)", boxShadow: "0 8px 32px rgba(var(--brand-rgb, 51, 102, 255), 0.3)" }}>
                <Activity size={26} className="text-white" />
              </div>
              <div>
                <h3 className="font-black text-xl mb-1" style={{ color: "var(--text-primary)" }}>Carteira Consolidada</h3>
                <p className="text-xs font-bold uppercase tracking-widest opacity-40">{investResumo.total_ativos} ativos em carteira</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Total Investido</p>
                <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{formatCurrency(investResumo.total_investido)}</p>
              </div>
              <div className="hidden sm:block">
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Valor Atual</p>
                <p className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{formatCurrency(investResumo.valor_atual || 0)}</p>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2">Performance</p>
                <div className="flex items-center gap-2">
                  <p className={`text-xl font-black ${ (investResumo.lucro||0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                    {(investResumo.lucro||0) >= 0 ? "+" : ""}{(investResumo.lucro_pct||0).toFixed(2)}%
                  </p>
                </div>
              </div>
            </div>

            <Link href="/investimentos" className="btn-primary py-3 px-8 shadow-lg shadow-brand/10">
              Gerenciar Ativos <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      )}

      {/* ── Main Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold flex items-center gap-2 text-base" style={{ color: "var(--text-primary)" }}>
              <TrendingUp size={18} style={{ color: "#10b981" }} /> Receitas vs Despesas
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={evolucao} barGap={6}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize:11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fontSize:11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v)=>`R$${v/1000}k`} />
              <Tooltip cursor={{ fill: "rgba(0,0,0,0.02)" }} />
              <Bar dataKey="receitas" name="Receitas" fill="#10b981" radius={[4,4,0,0]} barSize={20} />
              <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4,4,0,0]} barSize={20} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-bold flex items-center gap-2 text-base" style={{ color: "var(--text-primary)" }}>
              <Activity size={18} style={{ color: "#818cf8" }} /> Evolução do Patrimônio
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={evolucao}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#818cf8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#818cf8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
              <XAxis dataKey="mes" tick={{ fontSize:11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} dy={10} />
              <YAxis tick={{ fontSize:11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v)=>`R$${v/1000}k`} />
              <Tooltip />
              <Area type="monotone" dataKey="saldo" name="Saldo" stroke="#818cf8" strokeWidth={3} fillOpacity={1} fill="url(#colorSaldo)" 
                dot={{ r:4, fill: "#fff", stroke: "#818cf8", strokeWidth: 2 }} activeDot={{ r:6, strokeWidth:0 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Grid of 3 Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pies / Categories */}
        <div className="glass-card p-6 flex flex-col">
          <h3 className="font-bold flex items-center gap-2 mb-6" style={{ color: "var(--text-primary)" }}>
            <PieIcon size={18} style={{ color: "#ef4444" }} /> Gastos por Categoria
          </h3>
          <div className="flex-1 min-h-[220px]">
            {categorias.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie data={categorias} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="total" nameKey="categoria" strokeWidth={0}>
                      {categorias.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-4 space-y-2 max-h-[140px] overflow-y-auto scrollbar-thin pr-1">
                  {categorias.map((cat, i) => (
                    <div key={cat.categoria} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="font-medium" style={{ color: "var(--text-secondary)" }}>{cat.categoria}</span>
                      </div>
                      <span className="font-bold" style={{ color: "var(--text-primary)" }}>{formatCurrency(cat.total)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                <PieIcon size={40} className="mb-2" />
                <p className="text-xs">Sem dados</p>
              </div>
            )}
          </div>
        </div>

        {/* Alertas */}
        <div className="glass-card p-6">
          <h3 className="font-bold flex items-center gap-2 mb-6" style={{ color: "var(--text-primary)" }}>
            <AlertTriangle size={18} style={{ color: "#f59e0b" }} /> Alertas Críticos
          </h3>
          <div className="space-y-3">
            {vencimentos.filter(v => v.dias_restantes <= 5).length > 0 ? (
              vencimentos.filter(v => v.dias_restantes <= 5).slice(0, 5).map(v => (
                <div key={v.id} className="p-3 rounded-xl border transition-all hover:scale-[1.02]" 
                  style={{ background: v.dias_restantes <= 1 ? "rgba(239,68,68,.05)" : "rgba(245,158,11,.05)", borderColor: v.dias_restantes <= 1 ? "rgba(239,68,68,.1)" : "rgba(245,158,11,.1)" }}>
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-xs font-bold truncate pr-2" style={{ color: "var(--text-primary)" }}>{v.descricao}</span>
                    <span className="text-xs font-extrabold" style={{ color: v.dias_restantes <= 1 ? "#ef4444" : "#f59e0b" }}>{formatCurrency(v.valor)}</span>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: "var(--text-muted)" }}>{v.categoria}</span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${v.dias_restantes <= 1 ? "bg-red-100 text-red-600" : "bg-orange-100 text-orange-600"}`}>
                      {v.dias_restantes <= 0 ? "Vencido" : v.dias_restantes === 1 ? "Amanhã" : `Em ${v.dias_restantes} dias`}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-[240px] flex flex-col items-center justify-center text-center opacity-40">
                <CheckCircle2 size={40} className="mb-2 text-emerald-500" />
                <p className="text-xs font-medium">Tudo sob controle!</p>
              </div>
            )}
          </div>
        </div>

        {/* Fluxo / Summary Card */}
        <div className="glass-card p-6">
          <h3 className="font-bold flex items-center gap-2 mb-6" style={{ color: "var(--text-primary)" }}>
            <Calendar size={18} style={{ color: "var(--brand)" }} /> Fluxo de Caixa
          </h3>
          {summary && (
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <p className="text-xs font-bold text-muted uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Execução Mensal</p>
                <p className="text-[10px] font-bold" style={{ color: "var(--text-secondary)" }}>{summary.despesas_pagas_count}/{summary.total_despesas_count} pagas</p>
              </div>
              <div className="w-full h-2.5 rounded-full overflow-hidden" style={{ background: "var(--bg-elevated)" }}>
                <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000" 
                  style={{ width: `${(summary.despesas_pagas / (summary.total_despesas || 1)) * 100}%` }} />
              </div>
              <div className="pt-2 space-y-3">
                <div className="flex justify-between items-center p-3 rounded-xl border border-dashed border-emerald-500/20 bg-emerald-500/5">
                  <span className="text-sm font-medium text-emerald-600">Entradas</span>
                  <span className="font-bold text-emerald-600">{formatCurrency(summary.total_receitas)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl border border-dashed border-rose-500/20 bg-rose-500/5">
                  <span className="text-sm font-medium text-rose-600">Saídas</span>
                  <span className="font-bold text-rose-600">{formatCurrency(summary.total_despesas)}</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl border border-dashed border-slate-500/20 bg-slate-500/5">
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>Resultado</span>
                  <span className={`font-bold ${summary.saldo >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatCurrency(summary.saldo)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Table Row ── */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2 text-base" style={{ color: "var(--text-primary)" }}>
            <Calendar size={18} /> Próximos Pagamentos
          </h3>
          <Link href="/despesas" className="text-xs font-semibold hover:underline flex items-center gap-1" style={{ color: "#10b981" }}>
            Ver todas <ExternalLink size={12} />
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Descrição</th>
                <th>Categoria</th>
                <th style={{ textAlign: "right" }}>Valor</th>
                <th>Vencimento</th>
                <th style={{ textAlign: "center" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {vencimentos.map((v) => (
                <tr key={v.id}>
                  <td><p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{v.descricao}</p></td>
                  <td><span className="badge badge-neutral">{v.categoria}</span></td>
                  <td style={{ textAlign: "right" }}><span className="font-extrabold text-sm" style={{ color: "var(--text-primary)" }}>{formatCurrency(v.valor)}</span></td>
                  <td><span className="text-sm" style={{ color: "var(--text-secondary)" }}>{formatDate(v.data_vencimento)}</span></td>
                  <td style={{ textAlign: "center" }}>
                    <span className={`badge ${v.status === "URGENTE" ? "badge-danger" : v.status === "PROXIMO" ? "badge-warn" : "badge-info"}`}>
                      {v.dias_restantes <= 0 ? "Atrasado" : v.dias_restantes === 1 ? "Amanhã" : `Em ${v.dias_restantes} dias`}
                    </span>
                  </td>
                </tr>
              ))}
              {vencimentos.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-sm italic" style={{ color: "var(--text-muted)" }}>Nenhum vencimento próximo agendado</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";
