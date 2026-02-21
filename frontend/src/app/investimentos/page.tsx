"use client";

import { useState, useEffect, useCallback } from "react";
import { investimentosAPI, cotacoesAPI } from "@/lib/api";
import {
  TrendingUp,
  TrendingDown,
  Plus,
  Trash2,
  Edit3,
  RefreshCw,
  Search,
  BarChart3,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  X,
  LineChart,
  Building2,
  Landmark,
  Globe,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
} from "recharts";

interface Investimento {
  id: number;
  ticker: string;
  tipo: string;
  quantidade: number;
  preco_medio: number;
  data_compra: string;
  observacoes?: string;
}

interface CotacaoData {
  symbol: string;
  shortName: string;
  longName: string;
  regularMarketPrice: number;
  regularMarketChange: number;
  regularMarketChangePercent: number;
  regularMarketDayHigh: number;
  regularMarketDayLow: number;
  regularMarketVolume: number;
  regularMarketPreviousClose: number;
  logourl?: string;
  currency?: string;
  marketCap?: number;
  fiftyTwoWeekHigh?: number;
  fiftyTwoWeekLow?: number;
  regularMarketOpen?: number;
}

interface CarteiraItem extends Investimento {
  cotacao?: CotacaoData;
  valorAtual?: number;
  valorInvestido: number;
  lucro?: number;
  lucroPct?: number;
}

const TIPO_LABELS: Record<string, string> = {
  acao: "Ação",
  fii: "FII",
  bdr: "BDR",
  etf: "ETF",
};

const TIPO_ICONS: Record<string, any> = {
  acao: TrendingUp,
  fii: Building2,
  bdr: Globe,
  etf: Landmark,
};

const PIE_COLORS = [
  "#3366ff",
  "#17b364",
  "#f98307",
  "#8b5cf6",
  "#f93a4a",
  "#06b6d4",
  "#ec4899",
];

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

  const [form, setForm] = useState({
    ticker: "",
    tipo: "acao",
    quantidade: "",
    preco_medio: "",
    data_compra: new Date().toISOString().split("T")[0],
    observacoes: "",
  });

  const loadInvestimentos = useCallback(async () => {
    try {
      setLoading(true);
      const data = await investimentosAPI.listar();
      setInvestimentos(data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCotacoes = useCallback(async () => {
    if (investimentos.length === 0) {
      setCarteira([]);
      return;
    }
    try {
      setLoadingCotacoes(true);
      const tickers = Array.from(new Set(investimentos.map((i) => i.ticker)));
      const resp = await cotacoesAPI.batch(tickers);
      const cotacoesMap: Record<string, CotacaoData> = {};
      if (resp?.results) {
        resp.results.forEach((r: CotacaoData) => {
          cotacoesMap[r.symbol] = r;
        });
      }

      const items: CarteiraItem[] = investimentos.map((inv) => {
        const cotacao = cotacoesMap[inv.ticker];
        const valorInvestido = inv.quantidade * inv.preco_medio;
        const valorAtual = cotacao
          ? inv.quantidade * cotacao.regularMarketPrice
          : undefined;
        const lucro =
          valorAtual !== undefined ? valorAtual - valorInvestido : undefined;
        const lucroPct =
          lucro !== undefined && valorInvestido > 0
            ? (lucro / valorInvestido) * 100
            : undefined;
        return { ...inv, cotacao, valorAtual, valorInvestido, lucro, lucroPct };
      });
      setCarteira(items);
    } catch {
      const items: CarteiraItem[] = investimentos.map((inv) => ({
        ...inv,
        valorInvestido: inv.quantidade * inv.preco_medio,
      }));
      setCarteira(items);
    } finally {
      setLoadingCotacoes(false);
    }
  }, [investimentos]);

  useEffect(() => {
    loadInvestimentos();
  }, [loadInvestimentos]);

  useEffect(() => {
    if (investimentos.length > 0) {
      loadCotacoes();
    } else {
      setCarteira([]);
    }
  }, [investimentos, loadCotacoes]);

  const loadTickerDetail = async (ticker: string, range: string = "1mo") => {
    setSelectedTicker(ticker);
    setHistoricoRange(range);
    try {
      const resp = await cotacoesAPI.historico(ticker, range);
      if (resp?.results?.[0]) {
        setTickerDetail(resp.results[0]);
        const hist = resp.results[0].historicalDataPrice || [];
        setHistorico(
          hist.map((h: any) => ({
            date: new Date(h.date * 1000).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
            }),
            preco: h.close,
          })),
        );
      }
    } catch {
      // ignore
    }
  };

  const handleSearch = async () => {
    if (!searchTicker.trim()) return;
    setSearchLoading(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const resp = await cotacoesAPI.cotacao(searchTicker.trim());
      if (resp?.results?.[0]) {
        setSearchResult(resp.results[0]);
      } else {
        setSearchError("Ticker não encontrado");
      }
    } catch {
      setSearchError("Erro ao buscar ticker. Verifique o código.");
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const payload = {
        ticker: form.ticker.toUpperCase().trim(),
        tipo: form.tipo,
        quantidade: parseFloat(form.quantidade),
        preco_medio: parseFloat(form.preco_medio),
        data_compra: form.data_compra,
        observacoes: form.observacoes || null,
      };
      if (editingId) {
        await investimentosAPI.atualizar(editingId, payload);
      } else {
        await investimentosAPI.criar(payload);
      }
      setShowModal(false);
      setEditingId(null);
      resetForm();
      loadInvestimentos();
    } catch {
      // ignore
    }
  };

  const handleEdit = (inv: Investimento) => {
    setForm({
      ticker: inv.ticker,
      tipo: inv.tipo,
      quantidade: String(inv.quantidade),
      preco_medio: String(inv.preco_medio),
      data_compra: inv.data_compra,
      observacoes: inv.observacoes || "",
    });
    setEditingId(inv.id);
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Deseja realmente excluir este investimento?")) return;
    await investimentosAPI.deletar(id);
    loadInvestimentos();
  };

  const resetForm = () => {
    setForm({
      ticker: "",
      tipo: "acao",
      quantidade: "",
      preco_medio: "",
      data_compra: new Date().toISOString().split("T")[0],
      observacoes: "",
    });
  };

  const addFromSearch = () => {
    if (searchResult) {
      setForm({
        ...form,
        ticker: searchResult.symbol,
      });
      setSearchResult(null);
      setSearchTicker("");
      setShowModal(true);
    }
  };

  // Cálculos da carteira
  const totalInvestido = carteira.reduce((s, c) => s + c.valorInvestido, 0);
  const totalAtual = carteira.reduce(
    (s, c) => s + (c.valorAtual || c.valorInvestido),
    0,
  );
  const totalLucro = totalAtual - totalInvestido;
  const totalLucroPct =
    totalInvestido > 0 ? (totalLucro / totalInvestido) * 100 : 0;

  // Dados para gráfico de pizza por tipo
  const porTipo: Record<string, number> = {};
  carteira.forEach((c) => {
    const val = c.valorAtual || c.valorInvestido;
    porTipo[c.tipo] = (porTipo[c.tipo] || 0) + val;
  });
  const pieData = Object.entries(porTipo).map(([tipo, valor]) => ({
    name: TIPO_LABELS[tipo] || tipo,
    value: valor,
  }));

  // Dados para pizza por ticker
  const porTicker: Record<string, number> = {};
  carteira.forEach((c) => {
    const val = c.valorAtual || c.valorInvestido;
    porTicker[c.ticker] = (porTicker[c.ticker] || 0) + val;
  });
  const pieTickerData = Object.entries(porTicker)
    .map(([ticker, valor]) => ({ name: ticker, value: valor }))
    .sort((a, b) => b.value - a.value);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="page-title flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #3366ff, #8b5cf6)",
              }}
            >
              <Briefcase className="text-white" size={20} />
            </div>
            Investimentos
          </h1>
          <p className="page-subtitle">
            Acompanhe sua carteira de investimentos em tempo real
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => loadCotacoes()}
            className="btn-secondary"
            disabled={loadingCotacoes}
          >
            <RefreshCw
              size={16}
              className={loadingCotacoes ? "animate-spin" : ""}
            />
            Atualizar
          </button>
          <button
            onClick={() => {
              resetForm();
              setEditingId(null);
              setShowModal(true);
            }}
            className="btn-primary"
          >
            <Plus size={16} />
            Novo Investimento
          </button>
        </div>
      </div>

      {/* Buscar Ticker */}
      <div className="glass-card p-5">
        <h2 className="section-title flex items-center gap-2 mb-4">
          <Search size={18} style={{ color: "var(--brand)" }} />
          Pesquisar Ativo
        </h2>
        <div className="flex gap-3">
          <input
            type="text"
            value={searchTicker}
            onChange={(e) => setSearchTicker(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Digite o ticker (ex: PETR4, VALE3, ITUB4)"
            className="input-field flex-1"
          />
          <button
            onClick={handleSearch}
            className="btn-primary"
            disabled={searchLoading}
          >
            {searchLoading ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : (
              <Search size={16} />
            )}
            Buscar
          </button>
        </div>
        {searchError && (
          <p className="text-sm mt-2" style={{ color: "var(--danger)" }}>
            {searchError}
          </p>
        )}
        {searchResult && (
          <div
            className="mt-4 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            style={{
              background: "var(--bg-elevated)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div className="flex items-center gap-4">
              {searchResult.logourl ? (
                <img
                  src={searchResult.logourl}
                  alt={searchResult.symbol}
                  className="w-12 h-12 rounded-xl object-contain shadow-sm"
                  style={{
                    background: "white",
                    padding: "4px",
                    border: "1px solid var(--border-subtle)",
                  }}
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--brand), #8b5cf6)",
                    color: "#fff",
                  }}
                >
                  {searchResult.symbol.slice(0, 2)}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className="font-bold text-lg"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {searchResult.symbol}
                  </span>
                  <span
                    className={`badge ${searchResult.regularMarketChangePercent >= 0 ? "badge-success" : "badge-danger"}`}
                  >
                    {searchResult.regularMarketChangePercent >= 0 ? (
                      <ArrowUpRight size={12} />
                    ) : (
                      <ArrowDownRight size={12} />
                    )}
                    {fmtPct(searchResult.regularMarketChangePercent)}
                  </span>
                </div>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {searchResult.longName || searchResult.shortName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {fmt(searchResult.regularMarketPrice)}
                </p>
                <p
                  className="text-sm font-medium"
                  style={{
                    color:
                      searchResult.regularMarketChange >= 0
                        ? "var(--accent)"
                        : "var(--danger)",
                  }}
                >
                  {searchResult.regularMarketChange >= 0 ? "+" : ""}
                  {fmt(searchResult.regularMarketChange)}
                </p>
              </div>
              <button onClick={addFromSearch} className="btn-primary">
                <Plus size={16} />
                Adicionar
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="stat-card stat-card-brand">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "var(--brand-muted)" }}
            >
              <DollarSign size={18} style={{ color: "var(--brand)" }} />
            </div>
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Total Investido
            </span>
          </div>
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {fmt(totalInvestido)}
          </p>
        </div>

        <div className="stat-card stat-card-accent">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(23, 179, 100, 0.1)" }}
            >
              <BarChart3 size={18} style={{ color: "var(--accent)" }} />
            </div>
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Valor Atual
            </span>
          </div>
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {fmt(totalAtual)}
          </p>
        </div>

        <div
          className={`stat-card ${totalLucro >= 0 ? "stat-card-accent" : "stat-card-danger"}`}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{
                background:
                  totalLucro >= 0
                    ? "rgba(23, 179, 100, 0.1)"
                    : "rgba(249, 58, 74, 0.1)",
              }}
            >
              {totalLucro >= 0 ? (
                <TrendingUp size={18} style={{ color: "var(--accent)" }} />
              ) : (
                <TrendingDown size={18} style={{ color: "var(--danger)" }} />
              )}
            </div>
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Lucro / Prejuízo
            </span>
          </div>
          <p
            className="text-2xl font-bold"
            style={{
              color: totalLucro >= 0 ? "var(--accent)" : "var(--danger)",
            }}
          >
            {fmt(totalLucro)}
          </p>
          <p
            className="text-sm font-semibold mt-1"
            style={{
              color: totalLucro >= 0 ? "var(--accent)" : "var(--danger)",
            }}
          >
            {fmtPct(totalLucroPct)}
          </p>
        </div>

        <div className="stat-card stat-card-warn">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(249, 131, 7, 0.1)" }}
            >
              <PieChart size={18} style={{ color: "var(--warn)" }} />
            </div>
            <span
              className="text-sm font-medium"
              style={{ color: "var(--text-muted)" }}
            >
              Total de Ativos
            </span>
          </div>
          <p
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {carteira.length}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
            {Object.keys(porTicker).length} tickers diferentes
          </p>
        </div>
      </div>

      {/* Charts Row */}
      {carteira.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Distribuição por Tipo */}
          <div className="glass-card p-5">
            <h2 className="section-title mb-4">Distribuição por Tipo</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => fmt(value)}
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "12px",
                    }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribuição por Ativo */}
          <div className="glass-card p-5">
            <h2 className="section-title mb-4">Distribuição por Ativo</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPie>
                  <Pie
                    data={pieTickerData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {pieTickerData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => fmt(value)}
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "12px",
                    }}
                  />
                </RechartsPie>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Ticker Detail Modal */}
      {selectedTicker && tickerDetail && (
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              {tickerDetail.logourl ? (
                <img
                  src={tickerDetail.logourl}
                  alt={tickerDetail.symbol}
                  className="w-12 h-12 rounded-xl object-contain shadow-sm"
                  style={{
                    background: "white",
                    padding: "4px",
                    border: "1px solid var(--border-subtle)",
                  }}
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-bold shadow-sm"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--brand), #8b5cf6)",
                    color: "#fff",
                  }}
                >
                  {tickerDetail.symbol.slice(0, 2)}
                </div>
              )}
              <div>
                <h2 className="section-title flex items-center gap-2">
                  {tickerDetail.symbol}
                  <span
                    className={`badge ${tickerDetail.regularMarketChangePercent >= 0 ? "badge-success" : "badge-danger"}`}
                  >
                    {tickerDetail.regularMarketChangePercent >= 0 ? (
                      <ArrowUpRight size={12} />
                    ) : (
                      <ArrowDownRight size={12} />
                    )}
                    {fmtPct(tickerDetail.regularMarketChangePercent)}
                  </span>
                </h2>
                <p
                  className="text-sm"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {tickerDetail.longName || tickerDetail.shortName}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {fmt(tickerDetail.regularMarketPrice)}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedTicker(null);
                  setTickerDetail(null);
                }}
                className="btn-ghost"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              {
                label: "Abertura",
                value: tickerDetail.regularMarketOpen
                  ? fmt(tickerDetail.regularMarketOpen)
                  : "-",
              },
              {
                label: "Máxima",
                value: fmt(tickerDetail.regularMarketDayHigh),
              },
              { label: "Mínima", value: fmt(tickerDetail.regularMarketDayLow) },
              {
                label: "Fech. Anterior",
                value: fmt(tickerDetail.regularMarketPreviousClose),
              },
              {
                label: "Volume",
                value:
                  tickerDetail.regularMarketVolume?.toLocaleString("pt-BR") ||
                  "-",
              },
              {
                label: "Máx. 52 sem",
                value: tickerDetail.fiftyTwoWeekHigh
                  ? fmt(tickerDetail.fiftyTwoWeekHigh)
                  : "-",
              },
              {
                label: "Mín. 52 sem",
                value: tickerDetail.fiftyTwoWeekLow
                  ? fmt(tickerDetail.fiftyTwoWeekLow)
                  : "-",
              },
              {
                label: "Market Cap",
                value: tickerDetail.marketCap
                  ? `${(tickerDetail.marketCap / 1e9).toFixed(1)}B`
                  : "-",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="p-3 rounded-xl"
                style={{ background: "var(--bg-elevated)" }}
              >
                <p
                  className="text-xs font-medium mb-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  {item.label}
                </p>
                <p
                  className="text-sm font-bold"
                  style={{ color: "var(--text-primary)" }}
                >
                  {item.value}
                </p>
              </div>
            ))}
          </div>

          {/* Range Selector */}
          <div className="flex gap-2 mb-4">
            {[
              { label: "1S", value: "5d" },
              { label: "1M", value: "1mo" },
              { label: "3M", value: "3mo" },
              { label: "6M", value: "6mo" },
              { label: "1A", value: "1y" },
              { label: "5A", value: "5y" },
            ].map((r) => (
              <button
                key={r.value}
                onClick={() => loadTickerDetail(selectedTicker, r.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all`}
                style={{
                  background:
                    historicoRange === r.value
                      ? "var(--brand)"
                      : "var(--bg-elevated)",
                  color:
                    historicoRange === r.value
                      ? "#fff"
                      : "var(--text-secondary)",
                }}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Chart */}
          {historico.length > 0 && (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={historico}>
                  <defs>
                    <linearGradient id="colorPreco" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3366ff" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3366ff" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis
                    domain={["auto", "auto"]}
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `R$${v.toFixed(0)}`}
                  />
                  <Tooltip
                    formatter={(value: number) => [fmt(value), "Preço"]}
                    contentStyle={{
                      background: "var(--bg-card)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="preco"
                    stroke="#3366ff"
                    strokeWidth={2}
                    fill="url(#colorPreco)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Tabela de Investimentos */}
      <div className="glass-card overflow-hidden">
        <div className="p-5 flex items-center justify-between">
          <h2 className="section-title flex items-center gap-2">
            <LineChart size={18} style={{ color: "var(--brand)" }} />
            Minha Carteira
          </h2>
          {loadingCotacoes && (
            <span className="badge badge-info">
              <RefreshCw size={12} className="animate-spin" />
              Atualizando cotações...
            </span>
          )}
        </div>

        {loading ? (
          <div
            className="p-10 text-center"
            style={{ color: "var(--text-muted)" }}
          >
            Carregando...
          </div>
        ) : carteira.length === 0 ? (
          <div className="p-10 text-center">
            <Briefcase
              size={48}
              className="mx-auto mb-4"
              style={{ color: "var(--text-muted)" }}
            />
            <p
              className="text-lg font-semibold mb-2"
              style={{ color: "var(--text-primary)" }}
            >
              Nenhum investimento cadastrado
            </p>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
              Adicione seus investimentos para acompanhar sua carteira em tempo
              real
            </p>
            <button
              onClick={() => {
                resetForm();
                setEditingId(null);
                setShowModal(true);
              }}
              className="btn-primary"
            >
              <Plus size={16} />
              Adicionar Primeiro Investimento
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  {[
                    "Ativo",
                    "Tipo",
                    "Qtd",
                    "Preço Médio",
                    "Cotação Atual",
                    "Investido",
                    "Valor Atual",
                    "Lucro/Prejuízo",
                    "Ações",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {carteira.map((item) => {
                  const TipoIcon = TIPO_ICONS[item.tipo] || TrendingUp;
                  return (
                    <tr
                      key={item.id}
                      className="transition-colors cursor-pointer"
                      style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      onClick={() => loadTickerDetail(item.ticker)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "var(--bg-card-hover)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.cotacao?.logourl ? (
                            <img
                              src={item.cotacao.logourl}
                              alt={item.ticker}
                              className="w-10 h-10 rounded-xl object-contain shadow-sm"
                              style={{
                                background: "white",
                                padding: "3px",
                                border: "1px solid var(--border-subtle)",
                              }}
                            />
                          ) : (
                            <div
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shadow-sm"
                              style={{
                                background:
                                  "linear-gradient(135deg, var(--brand), #8b5cf6)",
                                color: "#fff",
                              }}
                            >
                              {item.ticker.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            <p
                              className="font-bold text-sm"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {item.ticker}
                            </p>
                            <p
                              className="text-xs"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {item.cotacao?.shortName ||
                                item.cotacao?.longName ||
                                ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="badge badge-info">
                          {TIPO_LABELS[item.tipo] || item.tipo}
                        </span>
                      </td>
                      <td
                        className="px-4 py-3 text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {item.quantidade}
                      </td>
                      <td
                        className="px-4 py-3 text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {fmt(item.preco_medio)}
                      </td>
                      <td className="px-4 py-3">
                        {item.cotacao ? (
                          <div>
                            <p
                              className="text-sm font-bold"
                              style={{ color: "var(--text-primary)" }}
                            >
                              {fmt(item.cotacao.regularMarketPrice)}
                            </p>
                            <p
                              className="text-xs font-medium"
                              style={{
                                color:
                                  item.cotacao.regularMarketChangePercent >= 0
                                    ? "var(--accent)"
                                    : "var(--danger)",
                              }}
                            >
                              {fmtPct(item.cotacao.regularMarketChangePercent)}
                            </p>
                          </div>
                        ) : (
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td
                        className="px-4 py-3 text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {fmt(item.valorInvestido)}
                      </td>
                      <td
                        className="px-4 py-3 text-sm font-medium"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {item.valorAtual ? fmt(item.valorAtual) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        {item.lucro !== undefined ? (
                          <div>
                            <p
                              className="text-sm font-bold"
                              style={{
                                color:
                                  item.lucro >= 0
                                    ? "var(--accent)"
                                    : "var(--danger)",
                              }}
                            >
                              {fmt(item.lucro)}
                            </p>
                            <p
                              className="text-xs font-medium"
                              style={{
                                color:
                                  item.lucroPct! >= 0
                                    ? "var(--accent)"
                                    : "var(--danger)",
                              }}
                            >
                              {fmtPct(item.lucroPct!)}
                            </p>
                          </div>
                        ) : (
                          <span
                            className="text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: "var(--text-muted)" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "var(--brand-muted)";
                              e.currentTarget.style.color = "var(--brand)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "var(--text-muted)";
                            }}
                            title="Editar"
                          >
                            <Edit3 size={14} />
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="p-2 rounded-lg transition-colors"
                            style={{ color: "var(--text-muted)" }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background =
                                "rgba(249, 58, 74, 0.1)";
                              e.currentTarget.style.color = "var(--danger)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = "transparent";
                              e.currentTarget.style.color = "var(--text-muted)";
                            }}
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Adicionar/Editar */}
      {showModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={() => setShowModal(false)}
          />
          <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            onClick={() => setShowModal(false)}
          >
            <div
              className="glass-card p-6 w-full max-w-lg animate-in slide-in-from-bottom-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="section-title">
                  {editingId ? "Editar Investimento" : "Novo Investimento"}
                </h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="btn-ghost p-2"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-xs font-semibold mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Ticker
                    </label>
                    <input
                      type="text"
                      value={form.ticker}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          ticker: e.target.value.toUpperCase(),
                        })
                      }
                      placeholder="PETR4"
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs font-semibold mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Tipo
                    </label>
                    <select
                      value={form.tipo}
                      onChange={(e) =>
                        setForm({ ...form, tipo: e.target.value })
                      }
                      className="input-field"
                    >
                      <option value="acao">Ação</option>
                      <option value="fii">FII</option>
                      <option value="bdr">BDR</option>
                      <option value="etf">ETF</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label
                      className="block text-xs font-semibold mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Quantidade
                    </label>
                    <input
                      type="number"
                      value={form.quantidade}
                      onChange={(e) =>
                        setForm({ ...form, quantidade: e.target.value })
                      }
                      placeholder="100"
                      className="input-field"
                      step="any"
                    />
                  </div>
                  <div>
                    <label
                      className="block text-xs font-semibold mb-1.5"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Preço Médio (R$)
                    </label>
                    <input
                      type="number"
                      value={form.preco_medio}
                      onChange={(e) =>
                        setForm({ ...form, preco_medio: e.target.value })
                      }
                      placeholder="25.50"
                      className="input-field"
                      step="0.01"
                    />
                  </div>
                </div>

                <div>
                  <label
                    className="block text-xs font-semibold mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Data da Compra
                  </label>
                  <input
                    type="date"
                    value={form.data_compra}
                    onChange={(e) =>
                      setForm({ ...form, data_compra: e.target.value })
                    }
                    className="input-field"
                  />
                </div>

                <div>
                  <label
                    className="block text-xs font-semibold mb-1.5"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Observações (opcional)
                  </label>
                  <textarea
                    value={form.observacoes}
                    onChange={(e) =>
                      setForm({ ...form, observacoes: e.target.value })
                    }
                    placeholder="Notas sobre o investimento..."
                    className="input-field"
                    rows={2}
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowModal(false)}
                    className="btn-secondary flex-1"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="btn-primary flex-1"
                    disabled={
                      !form.ticker || !form.quantidade || !form.preco_medio
                    }
                  >
                    {editingId ? "Salvar" : "Adicionar"}
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
