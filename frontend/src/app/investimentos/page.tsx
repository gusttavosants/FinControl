"use client";

import { useState, useEffect, useCallback } from "react";
import { investimentosAPI, cotacoesAPI } from "@/lib/api";
import {
  TrendingUp, TrendingDown, Plus, Trash2, Edit3, RefreshCw,
  Search, BarChart3, DollarSign, PieChart, ArrowUpRight,
  ArrowDownRight, Briefcase, X, LineChart, Building2,
  Landmark, Globe, Info, ExternalLink, Activity, Percent
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell
} from "recharts";

// Interfaces
interface Investimento { id: number; ticker: string; tipo: string; quantidade: number; preco_medio: number; data_compra: string; observacoes?: string; }
interface CotacaoData { 
  symbol: string; shortName: string; longName: string; regularMarketPrice: number; 
  regularMarketChange: number; regularMarketChangePercent: number; regularMarketDayHigh: number; 
  regularMarketDayLow: number; regularMarketVolume: number; regularMarketPreviousClose: number; 
  logourl?: string; currency?: string; marketCap?: number; fiftyTwoWeekHigh?: number; 
  fiftyTwoWeekLow?: number; regularMarketOpen?: number; historicalDataPrice?: any[];
}
interface CarteiraItem extends Investimento { cotacao?: CotacaoData; valorAtual?: number; valorInvestido: number; lucro?: number; lucroPct?: number; }

const TIPO_LABELS: Record<string, string> = { acao: "Ação", fii: "FII", bdr: "BDR", etf: "ETF" };
const TIPO_COLORS: Record<string, string> = { acao: "#3366ff", fii: "#10b981", bdr: "#f59e0b", etf: "#8b5cf6" };
const PIE_COLORS = ["#3366ff", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4", "#ec4899"];

export default function InvestimentosPage() {
  const [investimentos, setInvestimentos] = useState<Investimento[]>([]);
  const [carteira, setCarteira] = useState<CarteiraItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingCotacoes, setLoadingCotacoes] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [tickerDetail, setTickerDetail] = useState<CotacaoData | null>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [historicoRange, setHistoricoRange] = useState("1mo");
  const [searchTicker, setSearchTicker] = useState("");
  const [searchResult, setSearchResult] = useState<CotacaoData | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState("");

  const [form, setForm] = useState({ ticker: "", tipo: "acao", quantidade: "", preco_medio: "", data_compra: new Date().toISOString().split("T")[0], observacoes: "" });

  const loadInvestimentos = useCallback(async () => {
    try { setLoading(true); const data = await investimentosAPI.listar(); setInvestimentos(data); } 
    catch { /* ignore */ } finally { setLoading(false); }
  }, []);

  const loadCotacoes = useCallback(async () => {
    if (investimentos.length === 0) { setCarteira([]); return; }
    try {
      setLoadingCotacoes(true);
      const tickers = Array.from(new Set(investimentos.map(i => i.ticker)));
      const resp = await cotacoesAPI.batch(tickers);
      const cotacoesMap: Record<string, CotacaoData> = {};
      if (resp?.results) resp.results.forEach((r: CotacaoData) => { cotacoesMap[r.symbol] = r; });

      const items: CarteiraItem[] = investimentos.map(inv => {
        const cotacao = cotacoesMap[inv.ticker];
        const valorInvestido = inv.quantidade * inv.preco_medio;
        const valorAtual = cotacao ? inv.quantidade * cotacao.regularMarketPrice : undefined;
        const lucro = valorAtual !== undefined ? valorAtual - valorInvestido : undefined;
        const lucroPct = lucro !== undefined && valorInvestido > 0 ? (lucro / valorInvestido) * 100 : undefined;
        return { ...inv, cotacao, valorAtual, valorInvestido, lucro, lucroPct };
      });
      setCarteira(items);
    } catch {
      setCarteira(investimentos.map(inv => ({ ...inv, valorInvestido: inv.quantidade * inv.preco_medio })));
    } finally { setLoadingCotacoes(false); }
  }, [investimentos]);

  useEffect(() => { loadInvestimentos(); }, [loadInvestimentos]);
  useEffect(() => { if (investimentos.length > 0) loadCotacoes(); else setCarteira([]); }, [investimentos, loadCotacoes]);

  const loadTickerDetail = async (ticker: string, range: string = "1mo") => {
    setSelectedTicker(ticker); setHistoricoRange(range);
    try {
      const resp = await cotacoesAPI.historico(ticker, range);
      if (resp?.results?.[0]) {
        setTickerDetail(resp.results[0]);
        const hist = resp.results[0].historicalDataPrice || [];
        setHistorico(hist.map((h: any) => ({
          date: new Date(h.date * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          preco: h.close
        })));
      }
    } catch { /* ignore */ }
  };

  const handleSearch = async () => {
    if (!searchTicker.trim()) return;
    setSearchLoading(true); setSearchError(""); setSearchResult(null);
    try {
      const resp = await cotacoesAPI.cotacao(searchTicker.trim());
      if (resp?.results?.[0]) setSearchResult(resp.results[0]);
      else setSearchError("Ativo não encontrado na B3");
    } catch {
      setSearchError("Erro ao consultar mercado. Tente PETR4, ITUB4, etc.");
    } finally { setSearchLoading(false); }
  };

  const handleSubmit = async () => {
    try {
      const payload = { ticker: form.ticker.toUpperCase().trim(), tipo: form.tipo, quantidade: parseFloat(form.quantidade), preco_medio: parseFloat(form.preco_medio), data_compra: form.data_compra, observacoes: form.observacoes || null };
      if (editingId) await investimentosAPI.atualizar(editingId, payload);
      else await investimentosAPI.criar(payload);
      setShowModal(false); setEditingId(null); setForm({ ticker: "", tipo: "acao", quantidade: "", preco_medio: "", data_compra: new Date().toISOString().split("T")[0], observacoes: "" }); loadInvestimentos();
    } catch { /* ignore */ }
  };

  const handleEdit = (inv: Investimento) => {
    setForm({ ticker: inv.ticker, tipo: inv.tipo, quantidade: String(inv.quantidade), preco_medio: String(inv.preco_medio), data_compra: inv.data_compra, observacoes: inv.observacoes || "" });
    setEditingId(inv.id); setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deseja realmente excluir este investimento?")) return;
    await investimentosAPI.deletar(id); loadInvestimentos();
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

  const totalInvestido = carteira.reduce((s, c) => s + c.valorInvestido, 0);
  const totalAtual = carteira.reduce((s, c) => s + (c.valorAtual || c.valorInvestido), 0);
  const totalLucro = totalAtual - totalInvestido;
  const totalLucroPct = totalInvestido > 0 ? (totalLucro / totalInvestido) * 100 : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title text-gradient">Investimentos</h1>
          <p className="page-subtitle">Gestão dinâmica de patrimônio e renda variável</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => loadCotacoes()} className="btn-secondary" disabled={loadingCotacoes}>
            <RefreshCw size={16} className={loadingCotacoes ? "animate-spin" : ""} /> Atualizar Mercado
          </button>
          <button onClick={() => { setEditingId(null); setForm({ ticker: "", tipo: "acao", quantidade: "", preco_medio: "", data_compra: new Date().toISOString().split("T")[0], observacoes: "" }); setShowModal(true); }} className="btn-primary">
            <Plus size={16} /> Novo Aporte
          </button>
        </div>
      </div>

      {/* ── Search Bar ── */}
      <div className="glass-card p-5 border-l-4 border-l-brand relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:rotate-12 transition-transform"><Search size={80} /></div>
        <div className="relative z-10">
          <h2 className="text-sm font-bold uppercase tracking-widest mb-4" style={{ color: "var(--text-muted)" }}>Discovery Mercado</h2>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30" size={18} />
              <input type="text" value={searchTicker} onChange={(e) => setSearchTicker(e.target.value.toUpperCase())} 
                onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="Busque por Ticker (ex: VALE3, BCFF11...)" 
                className="input-field pl-10" />
            </div>
            <button onClick={handleSearch} className="btn-primary px-6" disabled={searchLoading}>
              {searchLoading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />} Consultar
            </button>
          </div>
          {searchError && <p className="text-xs mt-2 font-bold text-rose-500">{searchError}</p>}
        </div>

        {searchResult && (
          <div className="mt-5 p-5 rounded-2xl bg-white/40 dark:bg-white/5 border border-white/50 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 animate-fade-in">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-white shadow-sm ring-1 ring-slate-200">
                {searchResult.logourl ? <img src={searchResult.logourl} className="w-12 h-12 object-contain" /> : <Activity size={30} className="text-brand" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{searchResult.symbol}</h3>
                  <span className={`badge ${searchResult.regularMarketChangePercent >= 0 ? "badge-success" : "badge-danger"}`}>
                    {fmtPct(searchResult.regularMarketChangePercent)}
                  </span>
                </div>
                <p className="text-sm font-medium opacity-60" style={{ color: "var(--text-secondary)" }}>{searchResult.longName || searchResult.shortName}</p>
              </div>
            </div>
            <div className="flex items-center gap-8">
              <div className="text-right">
                <p className="text-2xl font-black text-gradient">{fmt(searchResult.regularMarketPrice)}</p>
                <p className={`text-xs font-bold ${searchResult.regularMarketChange >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                  {searchResult.regularMarketChange >= 0 ? "+" : ""}{fmt(searchResult.regularMarketChange)} (Hoje)
                </p>
              </div>
              <button onClick={() => { setForm({ ...form, ticker: searchResult.symbol }); setSearchResult(null); setSearchTicker(""); setShowModal(true); }} className="btn-primary">
                Adicionar à Carteira
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Stats Highlights ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <div className="kpi-card kpi-card-blue">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Patrimônio Alocado</p>
          <p className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{fmt(totalInvestido)}</p>
          <div className="mt-3 flex items-center gap-1.5 opacity-60">
            <DollarSign size={12} /> <span className="text-[10px] font-bold">Total depositado em ativos</span>
          </div>
        </div>
        <div className="kpi-card kpi-card-purple">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Valor de Mercado</p>
          <p className="text-2xl font-black text-gradient">{fmt(totalAtual)}</p>
          <div className="mt-3 flex items-center gap-1.5 opacity-60">
            <Activity size={12} /> <span className="text-[10px] font-bold">Avaliação em tempo real</span>
          </div>
        </div>
        <div className={`kpi-card ${totalLucro >= 0 ? "kpi-card-green" : "kpi-card-red"}`}>
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Lucro / Prejuízo</p>
          <p className={`text-2xl font-black ${totalLucro >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{fmt(totalLucro)}</p>
          <div className="mt-3">
             <span className={`badge ${totalLucro >= 0 ? "badge-success text-[10px]" : "badge-danger text-[10px]"}`}>
               {totalLucro >= 0 ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />} {Math.abs(totalLucroPct).toFixed(2)}%
             </span>
          </div>
        </div>
        <div className="kpi-card kpi-card-amber">
          <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Ativos na Carteira</p>
          <p className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{carteira.length}</p>
          <div className="mt-3 flex items-center gap-1.5 opacity-60">
            <Briefcase size={12} /> <span className="text-[10px] font-bold">Diversificação por tickers</span>
          </div>
        </div>
      </div>

      {/* ── Portfolio Analytics ── */}
      {carteira.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6">
            <h3 className="font-bold flex items-center gap-2 mb-8" style={{ color: "var(--text-primary)" }}>
              <PieChart size={18} style={{ color: "var(--brand)" }} /> Distribuição por Classe
            </h3>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="w-full md:w-1/2 min-h-[220px]">
                <ResponsiveContainer width="100%" height={220}>
                  <RechartsPie>
                    <Pie data={Object.entries(carteira.reduce((r:any,c)=>{r[c.tipo]=(r[c.tipo]||0)+(c.valorAtual||c.valorInvestido);return r;},{})).map(([k,v])=>({name:TIPO_LABELS[k],value:v}))}
                      cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={4} dataKey="value" strokeWidth={0}>
                      {PIE_COLORS.map((col, i) => <Cell key={i} fill={col} />)}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
              <div className="w-full md:w-1/2 space-y-3">
                {Object.entries(carteira.reduce((r:any,c)=>{r[c.tipo]=(r[c.tipo]||0)+(c.valorAtual||c.valorInvestido);return r;},{})).map(([k,v]:any, i) => (
                   <div key={k} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center group hover:bg-white dark:hover:bg-slate-800 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                        <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>{TIPO_LABELS[k]}</span>
                      </div>
                      <p className="text-xs font-black" style={{ color: "var(--text-primary)" }}>{fmt(v)}</p>
                   </div>
                ))}
              </div>
            </div>
          </div>

          <div className="glass-card p-6">
            <h3 className="font-bold flex items-center gap-2 mb-8" style={{ color: "var(--text-primary)" }}>
              <Activities size={18} style={{ color: "var(--brand)" }} /> Ativos Relevantes
            </h3>
            <div className="space-y-3">
               {carteira.sort((a,b)=>(b.valorAtual||0)-(a.valorAtual||0)).slice(0, 4).map((item) => (
                 <div key={item.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
                   onClick={()=>loadTickerDetail(item.ticker)}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-100 p-1">
                        {item.cotacao?.logourl ? <img src={item.cotacao.logourl} className="w-full h-full object-contain" /> : <p className="text-[10px] font-black">{item.ticker.slice(0,2)}</p>}
                      </div>
                      <div>
                        <p className="text-sm font-black" style={{ color: "var(--text-primary)" }}>{item.ticker}</p>
                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>{item.quantidade} cotas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black" style={{ color: "var(--text-primary)" }}>{fmt(item.valorAtual || item.valorInvestido)}</p>
                      <span className={`text-[10px] font-bold ${item.lucro && item.lucro >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                        {item.lucroPct ? fmtPct(item.lucroPct) : "—"}
                      </span>
                    </div>
                 </div>
               ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Ticker Detail ── */}
      {selectedTicker && tickerDetail && (
        <div className="glass-card p-6 border-2 border-brand/20 bg-brand/5 animate-in slide-in-from-top-4">
          <div className="flex items-start justify-between mb-8">
            <div className="flex gap-4">
               <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center border shadow-sm">
                 {tickerDetail.logourl ? <img src={tickerDetail.logourl} className="w-10 h-10 object-contain" /> : <Activity size={30} className="text-brand" />}
               </div>
               <div>
                 <div className="flex items-center gap-2">
                   <h2 className="text-2xl font-black" style={{ color: "var(--text-primary)" }}>{tickerDetail.symbol}</h2>
                   <Link href={`https://statusinvest.com.br/${tickerDetail.symbol.includes('.') ? 'acoes' : 'acoes'}/${tickerDetail.symbol.replace('.SA', '').toLowerCase()}`} target="_blank" className="p-1.5 hover:bg-white rounded-lg opacity-40 hover:opacity-100"><ExternalLink size={14} /></Link>
                 </div>
                 <p className="text-sm font-bold opacity-60" style={{ color: "var(--text-secondary)" }}>{tickerDetail.longName}</p>
               </div>
            </div>
            <button onClick={() => { setSelectedTicker(null); setTickerDetail(null); }} className="p-2 hover:bg-white rounded-xl"><X size={20} /></button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
             <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Preço Atual</p>
                <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{fmt(tickerDetail.regularMarketPrice)}</p>
             </div>
             <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Variação %</p>
                <p className={`text-lg font-black ${tickerDetail.regularMarketChangePercent >= 0 ? "text-emerald-500" : "text-rose-500"}`}>{fmtPct(tickerDetail.regularMarketChangePercent)}</p>
             </div>
             <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Máxima Dia</p>
                <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{fmt(tickerDetail.regularMarketDayHigh)}</p>
             </div>
             <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Mínima Dia</p>
                <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{fmt(tickerDetail.regularMarketDayLow)}</p>
             </div>
             <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Cap. Mercado</p>
                <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{tickerDetail.marketCap ? `R$ ${(tickerDetail.marketCap/1e9).toFixed(1)}B` : "—"}</p>
             </div>
             <div className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <p className="text-[10px] font-black opacity-40 uppercase tracking-widest mb-1">Volume</p>
                <p className="text-lg font-black" style={{ color: "var(--text-primary)" }}>{(tickerDetail.regularMarketVolume/1e6).toFixed(1)}M</p>
             </div>
          </div>

          <div className="flex gap-2 mb-6">
            {["5d","1mo","3mo","6mo","1y","5y"].map(r => (
              <button key={r} onClick={() => loadTickerDetail(selectedTicker!, r)} 
                className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all ${historicoRange === r ? "bg-brand text-white shadow-lg shadow-brand/20" : "bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-100 dark:border-slate-800"}`}>
                {r.toUpperCase()}
              </button>
            ))}
          </div>

          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={historico}>
                <defs>
                  <linearGradient id="detailGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3366ff" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#3366ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="date" tick={{fontSize:10, fill: "var(--text-muted)"}} axisLine={false} tickLine={false} />
                <YAxis domain={['auto','auto']} tick={{fontSize:10, fill: "var(--text-muted)"}} axisLine={false} tickLine={false} tickFormatter={(v)=>`R$ ${v}`} />
                <Tooltip />
                <Area type="monotone" dataKey="preco" stroke="var(--brand)" strokeWidth={3} fillOpacity={1} fill="url(#detailGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── Table Board ── */}
      <div className="glass-card overflow-hidden">
        <div className="p-6 border-b border-[var(--border-subtle)] flex items-center justify-between">
          <h2 className="font-black flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
            <Activity size={18} /> Detalhamento da Carteira
          </h2>
          <div className="flex items-center gap-4">
             <span className="text-[10px] font-black opacity-40 uppercase">ORDERNAR POR VALOR</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table">
            <thead>
              <tr>
                <th>Ativo</th>
                <th>Tipo</th>
                <th style={{ textAlign: "right" }}>Qtd</th>
                <th style={{ textAlign: "right" }}>P. Médio</th>
                <th style={{ textAlign: "right" }}>Cotação</th>
                <th style={{ textAlign: "right" }}>Total</th>
                <th style={{ textAlign: "center" }}>Resultado</th>
                <th style={{ textAlign: "center" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {carteira.map((item) => (
                <tr key={item.id} className="cursor-pointer group" onClick={()=>loadTickerDetail(item.ticker)}>
                  <td>
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-slate-50 dark:bg-slate-900 flex items-center justify-center border border-slate-100 group-hover:border-brand/40 transition-colors">
                        {item.cotacao?.logourl ? <img src={item.cotacao.logourl} className="w-6 h-6 object-contain" /> : <p className="text-[10px] font-black">{item.ticker.slice(0,2)}</p>}
                      </div>
                      <div>
                        <p className="font-black text-sm" style={{ color: "var(--text-primary)" }}>{item.ticker}</p>
                        <p className="text-[10px] font-bold opacity-40 truncate max-w-[120px]">{item.cotacao?.shortName}</p>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-neutral" style={{ color: TIPO_COLORS[item.tipo] }}>{TIPO_LABELS[item.tipo]}</span></td>
                  <td style={{ textAlign: "right" }}><span className="font-bold text-sm">{item.quantidade}</span></td>
                  <td style={{ textAlign: "right" }}><span className="font-bold text-sm text-slate-400">{fmt(item.preco_medio)}</span></td>
                  <td style={{ textAlign: "right" }}>
                    <div className="flex flex-col items-end">
                      <span className="font-black text-sm">{item.cotacao ? fmt(item.cotacao.regularMarketPrice) : "—"}</span>
                      {item.cotacao && <span className={`text-[9px] font-black ${item.cotacao.regularMarketChangePercent>=0 ? "text-emerald-500" : "text-rose-500"}`}>{fmtPct(item.cotacao.regularMarketChangePercent)}</span>}
                    </div>
                  </td>
                  <td style={{ textAlign: "right" }}><span className="font-black text-sm text-gradient">{fmt(item.valorAtual || item.valorInvestido)}</span></td>
                  <td style={{ textAlign: "center" }}>
                    {item.lucro !== undefined ? (
                      <div className="inline-flex flex-col items-center">
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded ${item.lucro >= 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"}`}>
                           {item.lucro >= 0 ? "+" : ""}{item.lucroPct?.toFixed(1)}%
                        </span>
                      </div>
                    ) : "—"}
                  </td>
                  <td style={{ textAlign: "center" }}>
                    <div className="flex items-center justify-center gap-1" onClick={(e)=>e.stopPropagation()}>
                       <button onClick={(e) => { e.stopPropagation(); handleEdit(item); }} className="p-2 hover:bg-slate-100 rounded-lg text-slate-400"><Edit3 size={14} /></button>
                       <button onClick={(e) => { e.stopPropagation(); handleDelete(item.id); }} className="p-2 hover:bg-rose-50 rounded-lg text-rose-400"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modals ── */}
      {showModal && (
        <>
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] animate-in fade-in" onClick={() => setShowModal(false)} />
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 pointer-events-none" onClick={() => setShowModal(false)}>
            <div className="glass-card p-8 w-full max-w-lg pointer-events-auto shadow-2xl animate-in slide-in-from-bottom-5" onClick={e => e.stopPropagation()}>
               <div className="flex items-center justify-between mb-8">
                 <h2 className="text-xl font-black" style={{ color: "var(--text-primary)" }}>{editingId ? "Editar Posição" : "Novo Aporte Ativo"}</h2>
                 <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-xl"><X size={20} /></button>
               </div>
               
               <div className="space-y-5">
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Cód. Ticker</label>
                      <input type="text" value={form.ticker} onChange={e => setForm({ ...form, ticker: e.target.value.toUpperCase() })} placeholder="Ex: PETR4" className="input-field" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Tipo de Ativo</label>
                      <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })} className="input-field">
                        <option value="acao">Ação (B3)</option>
                        <option value="fii">Fundos Imob.</option>
                        <option value="bdr">BDR (Global)</option>
                        <option value="etf">ETF Index</option>
                      </select>
                    </div>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Quantidade</label>
                      <input type="number" step="any" value={form.quantidade} onChange={e => setForm({ ...form, quantidade: e.target.value })} placeholder="0.00" className="input-field" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Preço Pago (Médio)</label>
                      <input type="number" step="0.01" value={form.preco_medio} onChange={e => setForm({ ...form, preco_medio: e.target.value })} placeholder="R$ 0,00" className="input-field" />
                    </div>
                 </div>

                 <div>
                    <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Dta do Primeiro Aporte</label>
                    <input type="date" value={form.data_compra} onChange={e => setForm({ ...form, data_compra: e.target.value })} className="input-field" />
                 </div>

                 <div className="flex gap-3 pt-6 border-t border-slate-100 dark:border-slate-800">
                    <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">Desistir</button>
                    <button onClick={handleSubmit} className="btn-primary flex-1" disabled={!form.ticker || !form.quantidade || !form.preco_medio}>
                       {editingId ? "Salvar Posição" : "Confirmar Aporte"}
                    </button>
                 </div>
               </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

import Link from "next/link";
const Activities = Activity;
const TrendingDownIcon = TrendingDown;
const TrendingUpIcon = TrendingUp;
