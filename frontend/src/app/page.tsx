"use client";

import { useEffect, useState, Suspense } from "react";
import {
  TrendingUp, TrendingDown, Wallet, AlertTriangle, Clock,
  CheckCircle2, Database, Download, ArrowUpRight, ArrowDownRight,
  Briefcase, PieChart as PieIcon, Activity, Calendar, ExternalLink, X, ChevronRight, Sparkles, Leaf, ShieldCheck, Star, Users, Layout, ShieldAlert
} from "lucide-react";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import {
  dashboardAPI, seedAPI, exportAPI, investimentosAPI, cotacoesAPI, authAPI
} from "@/lib/api";
import {
  formatCurrency, formatDate, getCurrentMonth, getCurrentYear, COLORS
} from "@/lib/utils";
import MonthSelector from "@/components/MonthSelector";
import LandingPage from "@/components/LandingPage";
import Link from "next/link";

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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [welcomeMsg, setWelcomeMsg] = useState<string | null>(null);
  const [tourStep, setTourStep] = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsAuthenticated(!!token);

    if (token) {
      const msg = sessionStorage.getItem("welcomeMessage");
      const tour = sessionStorage.getItem("showTour");
      
      if (msg) {
        setWelcomeMsg(msg);
        sessionStorage.removeItem("welcomeMessage");
        setTimeout(() => setWelcomeMsg(null), 8000);
      }
      
      if (tour === "true") {
        setTourStep(1);
        sessionStorage.removeItem("showTour");
      }
    }
  }, []);

  const finishTour = async () => {
    setTourStep(null);
    try {
       await authAPI.markTourSeen();
    } catch (e) {
       console.error("Error marking tour as seen:", e);
    }
  };

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
    } catch (e: any) { 
      if (e.message === "Sessão expirada") {
        setIsAuthenticated(false);
      }
      console.error("Dashboard Load Error:", e); 
    }

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

  useEffect(() => {
    const handleStorage = () => {
      const token = localStorage.getItem("token");
      setIsAuthenticated(!!token);
    };
    window.addEventListener("storage", handleStorage);
    handleStorage();
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (isAuthenticated === true && token) {
      loadData();
    }
  }, [mes, ano, isAuthenticated]);

  if (isAuthenticated === null || loading && isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
        <div className="relative">
          <div className="absolute -inset-4 bg-[var(--brand)]/10 rounded-full blur-xl animate-pulse"></div>
          <div className="relative w-16 h-16 rounded-[22px] bg-white/40 border border-white/20 backdrop-blur-md flex items-center justify-center">
            <Leaf size={32} className="text-[var(--brand)] animate-bounce" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-[11px] font-black uppercase tracking-[0.4em] text-[var(--brand)] opacity-60">ZenCash</p>
          <div className="w-24 h-0.5 bg-[var(--border-subtle)] rounded-full overflow-hidden relative">
            <div className="absolute inset-y-0 left-0 w-1/2 bg-[var(--brand)] animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LandingPage />;
  }

  const isEmpty = summary && summary.total_receitas === 0 && summary.total_despesas === 0;

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      {/* ── Welcome Message Banner ── */}
      {welcomeMsg && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md animate-bounce-in">
          <div className="mx-4 p-4 rounded-3xl bg-[var(--brand)] text-[var(--brand-text)] shadow-2xl shadow-[var(--brand)]/40 flex items-center justify-between border border-white/10 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                <Sparkles size={20} />
              </div>
              <p className="text-sm font-black">{welcomeMsg}</p>
            </div>
            <button onClick={() => setWelcomeMsg(null)} className="p-1 hover:bg-white/10 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* ── Dashboard Header ── */}
      <section className="relative pt-6">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 relative z-10">
          <div className="space-y-4">
             <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand)]/5 border border-[var(--brand)]/10">
                <ShieldCheck size={14} className="text-[var(--brand)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--brand)]">Santuário Financeiro</span>
             </div>
             <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none" style={{ color: "var(--text-primary)" }}>
                Sua <span className="opacity-30 italic">paz</span> em números.
             </h1>
             <p className="text-lg md:text-2xl text-[var(--text-secondary)] font-medium max-w-xl">
                Gerencie sua riqueza com a clareza de quem governa o próprio destino.
             </p>
          </div>
          <div className="flex items-center gap-4 bg-white/40 dark:bg-black/20 p-2 rounded-[28px] border border-white/20 backdrop-blur-xl shadow-xl">
            <MonthSelector mes={mes} ano={ano} onChange={(m, a) => { setMes(m); setAno(a); }} />
            <a href={exportAPI.excel(mes, ano)} className="bg-[var(--brand)] text-[var(--brand-text)] px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-[var(--brand)]/20">
              <Download size={16} /> Relatórios
            </a>
          </div>
        </div>
      </section>

      {/* ── KPI Grid (Premium Jewelry Style) ── */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Entradas" 
            value={formatCurrency(summary.total_receitas)} 
            subtitle={`${summary.total_receitas_count} transações`} 
            icon={TrendingUp} 
            color="emerald" 
          />
          <StatCard 
            title="Saídas" 
            value={formatCurrency(summary.total_despesas)} 
            subtitle={`${summary.total_despesas_count} lançamentos`} 
            icon={TrendingDown} 
            color="rose" 
          />
          <StatCard 
            title="Saldo Líquido" 
            value={formatCurrency(summary.saldo)} 
            subtitle="Disponibilidade Real" 
            icon={Wallet} 
            color={summary.saldo >= 0 ? "brand" : "amber"} 
          />
          <StatCard 
            title="Pendências" 
            value={formatCurrency(summary.despesas_pendentes)} 
            subtitle={`${summary.despesas_pagas_count} de ${summary.total_despesas_count} pagas`} 
            icon={Clock} 
            color="amber" 
          />
        </div>
      )}

      {/* ── Investimentos Highlight ── */}
      {investResumo && investResumo.total_ativos > 0 && (
        <div className="bg-white/60 dark:bg-black/40 rounded-[48px] p-8 md:p-12 border border-white/10 relative overflow-hidden shadow-2xl shadow-black/[0.02] group">
          <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--brand)]/5 blur-[100px] -translate-y-1/2 translate-x-1/2" />
          
          <div className="flex flex-col lg:flex-row items-center justify-between gap-12 relative z-10">
             <div className="flex items-center gap-8 text-left">
                <div className="w-16 h-16 rounded-[24px] bg-[var(--brand)] text-[var(--brand-text)] flex items-center justify-center shadow-2xl shadow-[var(--brand)]/30 transition-transform group-hover:scale-110">
                   <Briefcase size={32} />
                </div>
                <div>
                   <h3 className="text-3xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>Carteira Zen</h3>
                   <p className="text-xs font-black uppercase tracking-widest opacity-40">{investResumo.total_ativos} ativos cultivados</p>
                </div>
             </div>

             <div className="grid grid-cols-2 md:grid-cols-3 gap-12 xl:gap-24">
                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Patrimônio Investido</p>
                   <p className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{formatCurrency(investResumo.total_investido)}</p>
                </div>
                <div className="space-y-1 hidden md:block">
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Valor Atualizado</p>
                   <p className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{formatCurrency(investResumo.valor_atual || 0)}</p>
                </div>
                <div className="space-y-1">
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Performance</p>
                   <div className="flex items-center gap-2">
                     <p className={`text-2xl font-black ${ (investResumo.lucro||0) >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                       {(investResumo.lucro||0) >= 0 ? "+" : ""}{(investResumo.lucro_pct||0).toFixed(2)}%
                     </p>
                   </div>
                </div>
             </div>

             <Link href="/investimentos" className="bg-white/80 dark:bg-black/40 px-10 py-5 rounded-[24px] border border-white/20 text-sm font-black uppercase tracking-widest hover:bg-[var(--brand)] hover:text-[var(--brand-text)] transition-all shadow-xl shadow-black/[0.05]">
                Explorar Ativos
             </Link>
          </div>
        </div>
      )}

      {/* ── Charts & Analysis Bento Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Main Flow Chart */}
        <div className="lg:col-span-8 bg-white/40 dark:bg-black/20 p-8 md:p-12 rounded-[54px] border border-white/20 backdrop-blur-xl shadow-2xl shadow-black/[0.02]">
          <div className="flex items-center justify-between mb-12">
             <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/5">
                   <Activity size={24} />
                </div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>Fluxo de Caixa</h3>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Análise de Performance Mensal</p>
                </div>
             </div>
          </div>
          <ResponsiveContainer width="100%" height={340}>
            <BarChart data={evolucao} barGap={12}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} opacity={0.5} />
              <XAxis dataKey="mes" tick={{ fontSize:12, fontWeight: 800, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} dy={15} />
              <YAxis tick={{ fontSize:10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} tickFormatter={(v)=>`R$ ${v/1000}k`} />
              <Tooltip cursor={{ fill: "var(--brand-muted)", radius: 8 }} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="receitas" name="Receitas" fill="var(--brand)" radius={[8,8,0,0]} barSize={24} />
              <Bar dataKey="despesas" name="Despesas" fill="var(--accent)" radius={[8,8,0,0]} barSize={24} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Categories Analysis */}
        <div className="lg:col-span-4 bg-white/40 dark:bg-black/20 p-8 md:p-10 rounded-[54px] border border-white/20 backdrop-blur-xl shadow-2xl shadow-black/[0.02]">
           <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-lg shadow-rose-500/5">
                 <PieIcon size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>Destinos</h3>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Categorização de Gastos</p>
              </div>
           </div>
           
           <div className="h-[260px] relative">
              {categorias.length > 0 ? (
                 <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                       <Pie data={categorias} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={8} dataKey="total" nameKey="categoria" strokeWidth={0}>
                          {categorias.map((_, i) => <Cell key={i} fill={i % 3 === 0 ? 'var(--brand)' : i % 3 === 1 ? 'var(--accent)' : 'var(--text-muted)'} opacity={1 - (i * 0.15)} />)}
                       </Pie>
                       <Tooltip contentStyle={{ borderRadius: '16px' }} />
                    </PieChart>
                 </ResponsiveContainer>
              ) : (
                <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                   <p className="text-xs font-black uppercase tracking-widest">Sem Registros</p>
                </div>
              )}
           </div>

           <div className="mt-10 space-y-3 max-h-[160px] overflow-y-auto pr-2 scrollbar-thin">
              {categorias.map((cat, i) => (
                <div key={cat.categoria} className="flex items-center justify-between p-3 rounded-2xl hover:bg-white/60 dark:hover:bg-black/20 transition-all">
                  <div className="flex items-center gap-3">
                     <div className="w-2.5 h-2.5 rounded-full" style={{ background: i % 3 === 0 ? 'var(--brand)' : i % 3 === 1 ? 'var(--accent)' : 'var(--text-muted)' }} />
                     <span className="text-sm font-bold opacity-60">{cat.categoria}</span>
                  </div>
                  <span className="text-sm font-black">{formatCurrency(cat.total)}</span>
                </div>
              ))}
           </div>
        </div>
      </div>

      {/* ── Secondary Analysis Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Alerts & Critical Payments */}
        <div className="bg-white/40 dark:bg-black/20 p-8 md:p-10 rounded-[54px] border border-white/20 backdrop-blur-xl overflow-hidden">
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-4">
                 <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500 shadow-lg shadow-amber-500/5">
                    <AlertTriangle size={24} />
                 </div>
                 <div>
                   <h3 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>Atenção</h3>
                   <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Vencimentos Próximos</p>
                 </div>
              </div>
              <Link href="/despesas" className="text-[10px] font-black uppercase tracking-widest text-[var(--brand)] hover:underline underline-offset-4 transition-all">Ver Todas</Link>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {vencimentos.filter(v => v.dias_restantes <= 7).slice(0, 4).map(v => (
                 <div key={v.id} className="p-6 rounded-[32px] border border-white/20 bg-white/40 dark:bg-black/20 hover:scale-[1.03] transition-all group relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--brand)]/5 blur-[40px] opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="flex justify-between items-start mb-4">
                       <span className="text-[10px] font-black uppercase tracking-widest opacity-30">{v.categoria}</span>
                       <span className={`text-[10px] font-black px-2 py-1 rounded-full ${v.dias_restantes <= 1 ? "bg-rose-500/10 text-rose-600" : "bg-amber-500/10 text-amber-600"}`}>
                          {v.dias_restantes <= 0 ? "Vencido" : v.dias_restantes === 1 ? "Amanhã" : `D-${v.dias_restantes}`}
                       </span>
                    </div>
                    <p className="text-base font-black truncate mb-1" style={{ color: "var(--text-primary)" }}>{v.descricao}</p>
                    <p className="text-xl font-black" style={{ color: v.dias_restantes <= 1 ? "var(--danger)" : "var(--text-primary)" }}>{formatCurrency(v.valor)}</p>
                 </div>
              ))}
              {vencimentos.filter(v => v.dias_restantes <= 7).length === 0 && (
                <div className="col-span-2 py-12 flex flex-col items-center justify-center opacity-30 text-center">
                   <CheckCircle2 size={48} className="text-[var(--brand)] mb-3" />
                   <p className="text-sm font-black uppercase tracking-widest">Sem pendências iminentes</p>
                </div>
              )}
           </div>
        </div>

        {/* Wealth Performance Line */}
        <div className="bg-white/40 dark:bg-black/20 p-8 md:p-10 rounded-[54px] border border-white/20 backdrop-blur-xl overflow-hidden">
           <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-2xl bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] shadow-lg shadow-[var(--brand)]/5">
                 <TrendingUp size={24} />
              </div>
              <div>
                <h3 className="text-2xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>Patrimônio</h3>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Evolução de Saldo Real</p>
              </div>
           </div>
           
           <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={evolucao}>
                <defs>
                   <linearGradient id="colorSaldoZen" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.15} />
                      <stop offset="95%" stopColor="var(--brand)" stopOpacity={0} />
                   </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} opacity={0.3} />
                <XAxis dataKey="mes" tick={{ fontSize:11, fontWeight:700, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} dy={15} />
                <YAxis hide />
                <Tooltip contentStyle={{ borderRadius: '20px', border:'none', boxShadow:'0 10px 40px rgba(0,0,0,0.1)' }} />
                <Area type="monotone" dataKey="saldo" name="Saldo" stroke="var(--brand)" strokeWidth={4} fillOpacity={1} fill="url(#colorSaldoZen)" dot={{ r:6, fill: "var(--bg-card)", stroke: "var(--brand)", strokeWidth: 3 }} activeDot={{ r:8, strokeWidth:0 }} />
              </AreaChart>
           </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, subtitle, icon: Icon, color }: { title: string, value: string, subtitle: string, icon: any, color: string }) {
  const colorMap: Record<string, string> = {
    emerald: "text-emerald-500 bg-emerald-500/10 border-emerald-500/10 shadow-emerald-500/5",
    rose: "text-rose-500 bg-rose-500/10 border-rose-500/10 shadow-rose-500/5",
    brand: "text-[var(--brand)] bg-[var(--brand)]/10 border-[var(--brand)]/10 shadow-[var(--brand)]/5",
    amber: "text-amber-500 bg-amber-500/10 border-amber-500/10 shadow-amber-500/5",
    blue: "text-blue-500 bg-blue-500/10 border-blue-500/10 shadow-blue-500/5",
  };

  return (
    <div className="bg-white/40 dark:bg-black/20 p-8 rounded-[40px] border border-white/20 backdrop-blur-xl hover:-translate-y-2 transition-all duration-500 relative overflow-hidden group">
      <div className={`absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity ${colorMap[color].split(' ')[0]}`}>
        <Icon size={100} />
      </div>
      <div className="flex items-center justify-between mb-8 relative z-10">
        <span className="text-[11px] font-black uppercase tracking-[.3em] opacity-40">{title}</span>
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${colorMap[color]}`}>
          <Icon size={24} />
        </div>
      </div>
      <div className="space-y-2 relative z-10">
        <p className={`text-3xl xl:text-4xl font-black tracking-tighter ${color === 'rose' ? 'text-rose-600' : color === 'emerald' ? 'text-emerald-600' : 'text-[var(--text-primary)]'}`}>
          {value}
        </p>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{subtitle}</p>
      </div>
    </div>
  );
}
