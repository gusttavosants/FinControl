"use client";

import { useEffect, useState } from "react";
import {
  BarChart3, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight,
  Briefcase, Activity, Calendar, PieChart as PieIcon, Hash
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { relatoriosAPI, investimentosAPI, cotacoesAPI } from "@/lib/api";
import {
  formatCurrency, getCurrentMonth, getCurrentYear, COLORS
} from "@/lib/utils";
import MonthSelector from "@/components/MonthSelector";

// Interfaces
interface RelatorioMensal {
  mes: number; ano: number; total_receitas: number; total_despesas: number; saldo: number;
  total_pagas: number; total_pendentes: number;
  categorias_despesa: Record<string, number>; categorias_receita: Record<string, number>;
}
interface Comparativo { mes: string; receitas: number; despesas: number; saldo: number; economia: number; }

export default function RelatoriosPage() {
  const [mes, setMes] = useState(getCurrentMonth());
  const [ano, setAno] = useState(getCurrentYear());
  const [relatorio, setRelatorio] = useState<RelatorioMensal | null>(null);
  const [comparativo, setComparativo] = useState<Comparativo[]>([]);
  const [loading, setLoading] = useState(true);
  const [investResumo, setInvestResumo] = useState<{
    total_investido: number; total_ativos: number; tickers: string[];
    valor_atual: number; lucro: number; lucro_pct: number;
  } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rel, comp] = await Promise.all([
        relatoriosAPI.mensal(mes, ano),
        relatoriosAPI.comparativo(6),
      ]);
      setRelatorio(rel);
      setComparativo(comp);
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
        <p className="text-sm font-medium animate-pulse" style={{ color: "var(--text-muted)" }}>Gerando relatórios...</p>
      </div>
    );
  }

  const catDespesaData = relatorio ? Object.entries(relatorio.categorias_despesa).map(([cat, val]) => ({ name: cat, value: val })) : [];
  const catReceitaData = relatorio ? Object.entries(relatorio.categorias_receita).map(([cat, val]) => ({ name: cat, value: val })) : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title text-gradient">Relatórios</h1>
          <p className="page-subtitle">Análise detalhada da sua saúde financeira</p>
        </div>
        <MonthSelector mes={mes} ano={ano} onChange={(m, a) => { setMes(m); setAno(a); }} />
      </div>

      {/* ── KPI Grid ── */}
      {relatorio && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 stagger-children">
          <div className="kpi-card kpi-card-green">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Entradas</p>
            <p className="text-lg font-extrabold" style={{ color: "#10b981" }}>{formatCurrency(relatorio.total_receitas)}</p>
          </div>
          <div className="kpi-card kpi-card-red">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Saídas</p>
            <p className="text-lg font-extrabold" style={{ color: "#ef4444" }}>{formatCurrency(relatorio.total_despesas)}</p>
          </div>
          <div className="kpi-card kpi-card-blue">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Resultado</p>
            <p className={`text-lg font-extrabold ${relatorio.saldo >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{formatCurrency(relatorio.saldo)}</p>
          </div>
          <div className="kpi-card kpi-card-amber">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Contas Pagas</p>
            <p className="text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>{formatCurrency(relatorio.total_pagas)}</p>
          </div>
          <div className="kpi-card kpi-card-purple">
            <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Contas Pendentes</p>
            <p className="text-lg font-extrabold" style={{ color: "#818cf8" }}>{formatCurrency(relatorio.total_pendentes)}</p>
          </div>
        </div>
      )}

      {/* ── Main Trend Chart ── */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Activity size={18} style={{ color: "#818cf8" }} /> Fluxo Histórico (6 meses)
          </h3>
          <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: "#10b981" }} /> Receitas</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} /> Despesas</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border border-[#818cf8]" /> Saldo</div>
          </div>
        </div>
        
        <ResponsiveContainer width="100%" height={320}>
          <AreaChart data={comparativo}>
            <defs>
              <linearGradient id="gradReceitas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} dy={10} />
            <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v)=>`R$${v/1000}k`} />
            <Tooltip />
            <Area type="monotone" dataKey="receitas" name="Receitas" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#gradReceitas)" />
            <Area type="monotone" dataKey="despesas" name="Despesas" stroke="#ef4444" strokeWidth={2} fill="transparent" strokeDasharray="4 4" />
            <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#818cf8" strokeWidth={2} dot={{ r: 4, fill: "#fff", stroke: "#818cf8", strokeWidth: 2 }} />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* ── Category Breakdown ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Despesas */}
        <div className="glass-card p-6">
          <h3 className="font-bold flex items-center gap-2 mb-8" style={{ color: "var(--text-primary)" }}>
            <TrendingDown size={18} style={{ color: "#ef4444" }} /> Composição das Despesas
          </h3>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="w-full md:w-1/2">
               <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={catDespesaData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" strokeWidth={0}>
                    {catDespesaData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-full md:w-1/2 space-y-3 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin">
              {catDespesaData.sort((a,b)=>b.value-a.value).map((item, i) => (
                <div key={item.name} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span style={{ color: "var(--text-secondary)" }}>{item.name}</span>
                    <span style={{ color: "var(--text-primary)" }}>{formatCurrency(item.value)}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full" style={{ background: "var(--bg-elevated)" }}>
                    <div className="h-full rounded-full transition-all duration-700" 
                      style={{ width: `${(item.value / (relatorio?.total_despesas || 1)) * 100}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Receitas */}
        <div className="glass-card p-6">
          <h3 className="font-bold flex items-center gap-2 mb-8" style={{ color: "var(--text-primary)" }}>
            <TrendingUp size={18} style={{ color: "#10b981" }} /> Origem das Receitas
          </h3>
          <div className="space-y-4 pr-1">
            {catReceitaData.sort((a,b)=>b.value-a.value).map((item, i) => (
              <div key={item.name} className="p-4 rounded-xl transition-all hover:bg-emerald-500/5 group" style={{ background: "var(--bg-elevated)" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-8 rounded-full bg-emerald-500 opacity-20 group-hover:opacity-100 transition-opacity" />
                    <div>
                      <p className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>{item.name}</p>
                      <p className="text-[10px] uppercase font-bold tracking-widest" style={{ color: "var(--text-muted)" }}>Categoria</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-emerald-600">{formatCurrency(item.value)}</p>
                    <p className="text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
                      {((item.value / (relatorio?.total_receitas || 1)) * 100).toFixed(1)}% do total
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {catReceitaData.length === 0 && (
              <div className="h-[240px] flex flex-col items-center justify-center opacity-30 italic text-sm">Nenhuma receita registrada</div>
            )}
          </div>
        </div>
      </div>

      {/* ── Historical Table ── */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h3 className="font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Calendar size={18} /> Histórico de Lançamentos
          </h3>
          <div className="flex items-center gap-2 text-xs font-bold" style={{ color: "var(--text-muted)" }}>
             Últimos 6 meses
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Mês / Ano</th>
                <th style={{ textAlign: "right" }}>Entradas</th>
                <th style={{ textAlign: "right" }}>Saídas</th>
                <th style={{ textAlign: "right" }}>Resultado</th>
                <th style={{ textAlign: "center", width: 140 }}>Economia</th>
              </tr>
            </thead>
            <tbody>
              {comparativo.map((c) => (
                <tr key={c.mes}>
                  <td><p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>{c.mes}</p></td>
                  <td style={{ textAlign: "right" }}><span className="font-bold text-emerald-600">{formatCurrency(c.receitas)}</span></td>
                  <td style={{ textAlign: "right" }}><span className="font-bold text-rose-500">{formatCurrency(c.despesas)}</span></td>
                  <td style={{ textAlign: "right" }}>
                    <div className="flex flex-col items-end">
                      <span className={`font-black ${c.saldo >= 0 ? "text-emerald-600" : "text-rose-500"}`}>
                        {formatCurrency(c.saldo)}
                      </span>
                    </div>
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div className="flex items-center gap-2 justify-center">
                      <span className={`badge ${c.economia >= 0 ? "badge-success" : "badge-danger"}`}>
                        {c.economia >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                        {Math.abs(c.economia)}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
