"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  Wallet,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Database,
  Download,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
  BarChart,
  Bar,
} from "recharts";
import { dashboardAPI, seedAPI, exportAPI } from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  getCurrentMonth,
  getCurrentYear,
  COLORS,
} from "@/lib/utils";
import MonthSelector from "@/components/MonthSelector";

interface Summary {
  total_receitas: number;
  total_despesas: number;
  saldo: number;
  despesas_pagas: number;
  despesas_pendentes: number;
  total_receitas_count: number;
  total_despesas_count: number;
  despesas_pagas_count: number;
}

interface CatGasto {
  categoria: string;
  total: number;
  percentual: number;
}

interface Evolucao {
  mes: string;
  receitas: number;
  despesas: number;
  saldo: number;
}

interface Vencimento {
  id: number;
  descricao: string;
  categoria: string;
  valor: number;
  data_vencimento: string;
  dias_restantes: number;
  status: string;
}

export default function DashboardPage() {
  const [mes, setMes] = useState(getCurrentMonth());
  const [ano, setAno] = useState(getCurrentYear());
  const [summary, setSummary] = useState<Summary | null>(null);
  const [categorias, setCategorias] = useState<CatGasto[]>([]);
  const [evolucao, setEvolucao] = useState<Evolucao[]>([]);
  const [vencimentos, setVencimentos] = useState<Vencimento[]>([]);
  const [loading, setLoading] = useState(true);

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
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [mes, ano]);

  const handleSeed = async () => {
    await seedAPI.seed();
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div
          className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: "var(--brand)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  const isEmpty =
    summary && summary.total_receitas === 0 && summary.total_despesas === 0;

  const CHART_COLORS = {
    receitas: "#17b364",
    despesas: "#f93a4a",
    saldo: "#3366ff",
    grid: "var(--border-subtle)",
    text: "var(--text-muted)",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral das suas finanças</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <MonthSelector
            mes={mes}
            ano={ano}
            onChange={(m, a) => {
              setMes(m);
              setAno(a);
            }}
          />
          <a href={exportAPI.excel(mes, ano)} className="btn-secondary">
            <Download size={15} />
            Exportar
          </a>
          {isEmpty && (
            <button onClick={handleSeed} className="btn-primary">
              <Database size={15} />
              Carregar Dados
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card stat-card-accent">
            <div className="flex items-center justify-between mb-4">
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                Receitas
              </span>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(23, 179, 100, 0.1)" }}
              >
                <TrendingUp size={18} className="text-accent-500" />
              </div>
            </div>
            <p
              className="text-2xl font-extrabold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {formatCurrency(summary.total_receitas)}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <ArrowUpRight size={14} className="text-accent-500" />
              <span className="text-xs font-medium text-accent-500">
                {summary.total_receitas_count} lançamentos
              </span>
            </div>
          </div>

          <div className="stat-card stat-card-danger">
            <div className="flex items-center justify-between mb-4">
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                Despesas
              </span>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(249, 58, 74, 0.1)" }}
              >
                <TrendingDown size={18} className="text-danger-500" />
              </div>
            </div>
            <p
              className="text-2xl font-extrabold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {formatCurrency(summary.total_despesas)}
            </p>
            <div className="flex items-center gap-1 mt-2">
              <ArrowDownRight size={14} className="text-danger-500" />
              <span className="text-xs font-medium text-danger-500">
                {summary.total_despesas_count} lançamentos
              </span>
            </div>
          </div>

          <div className="stat-card stat-card-brand">
            <div className="flex items-center justify-between mb-4">
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                Saldo
              </span>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{
                  background:
                    summary.saldo >= 0
                      ? "rgba(23, 179, 100, 0.1)"
                      : "rgba(249, 58, 74, 0.1)",
                }}
              >
                <Wallet
                  size={18}
                  className={
                    summary.saldo >= 0 ? "text-accent-500" : "text-danger-500"
                  }
                />
              </div>
            </div>
            <p
              className={`text-2xl font-extrabold tracking-tight ${summary.saldo >= 0 ? "text-accent-500" : "text-danger-500"}`}
            >
              {formatCurrency(summary.saldo)}
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              {summary.saldo >= 0 ? "Saldo positivo" : "Saldo negativo"}
            </p>
          </div>

          <div className="stat-card stat-card-warn">
            <div className="flex items-center justify-between mb-4">
              <span
                className="text-sm font-medium"
                style={{ color: "var(--text-muted)" }}
              >
                Pendentes
              </span>
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(249, 131, 7, 0.1)" }}
              >
                <Clock size={18} className="text-warn-500" />
              </div>
            </div>
            <p
              className="text-2xl font-extrabold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {formatCurrency(summary.despesas_pendentes)}
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              {formatCurrency(summary.despesas_pagas)} já pagas
            </p>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="section-title mb-5">Receitas vs Despesas</h3>
          {evolucao.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={evolucao} barGap={4}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                  vertical={false}
                />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 12 }}
                  stroke="var(--border-subtle)"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="var(--border-subtle)"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar
                  dataKey="receitas"
                  name="Receitas"
                  fill="#17b364"
                  radius={[8, 8, 0, 0]}
                  barSize={24}
                />
                <Bar
                  dataKey="despesas"
                  name="Despesas"
                  fill="#f93a4a"
                  radius={[8, 8, 0, 0]}
                  barSize={24}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div
              className="flex items-center justify-center h-[300px]"
              style={{ color: "var(--text-muted)" }}
            >
              Sem dados para exibir
            </div>
          )}
        </div>

        <div className="glass-card p-6">
          <h3 className="section-title mb-5">Evolução do Saldo</h3>
          {evolucao.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={evolucao}>
                <defs>
                  <linearGradient id="saldoGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3366ff" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#3366ff" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--border-subtle)"
                  vertical={false}
                />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 12 }}
                  stroke="var(--border-subtle)"
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  stroke="var(--border-subtle)"
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Area
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo"
                  stroke="#3366ff"
                  strokeWidth={2.5}
                  fill="url(#saldoGrad)"
                  dot={{ fill: "#3366ff", strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div
              className="flex items-center justify-center h-[300px]"
              style={{ color: "var(--text-muted)" }}
            >
              Sem dados para exibir
            </div>
          )}
        </div>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categorias */}
        <div className="glass-card p-6">
          <h3 className="section-title mb-5">Despesas por Categoria</h3>
          {categorias.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categorias}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="total"
                    nameKey="categoria"
                    strokeWidth={0}
                  >
                    {categorias.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2.5 mt-4 max-h-[180px] overflow-y-auto scrollbar-thin">
                {categorias.map((cat, i) => (
                  <div
                    key={cat.categoria}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span style={{ color: "var(--text-secondary)" }}>
                        {cat.categoria}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatCurrency(cat.total)}
                      </span>
                      <span className="badge badge-neutral text-[10px]">
                        {cat.percentual}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div
              className="flex items-center justify-center h-[300px]"
              style={{ color: "var(--text-muted)" }}
            >
              Sem dados para exibir
            </div>
          )}
        </div>

        {/* Alertas */}
        <div className="glass-card p-6">
          <h3 className="section-title mb-5 flex items-center gap-2">
            <AlertTriangle className="text-danger-500" size={18} />
            Alertas de Vencimento
          </h3>
          {vencimentos.filter(
            (v) =>
              v.dias_restantes <= 3 &&
              !v.descricao.toLowerCase().includes("pago"),
          ).length > 0 ? (
            <div className="space-y-3">
              {vencimentos
                .filter(
                  (v) =>
                    v.dias_restantes <= 3 &&
                    !v.descricao.toLowerCase().includes("pago"),
                )
                .slice(0, 5)
                .map((v) => (
                  <div
                    key={v.id}
                    className="p-3 rounded-xl"
                    style={{
                      background:
                        v.dias_restantes <= 0
                          ? "rgba(249,58,74,0.06)"
                          : v.dias_restantes <= 1
                            ? "rgba(249,131,7,0.06)"
                            : "rgba(249,165,7,0.06)",
                      borderLeft: `3px solid ${v.dias_restantes <= 0 ? "#f93a4a" : v.dias_restantes <= 1 ? "#f98307" : "#ffa520"}`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className="font-semibold text-sm"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {v.descricao}
                      </span>
                      <span
                        className="font-bold text-sm"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatCurrency(v.valor)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {v.categoria}
                      </span>
                      <span
                        className={`badge ${v.dias_restantes <= 0 ? "badge-danger" : "badge-warn"}`}
                      >
                        {v.dias_restantes <= 0
                          ? "Vencida!"
                          : `${v.dias_restantes}d`}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div
              className="flex items-center justify-center h-[200px]"
              style={{ color: "var(--text-muted)" }}
            >
              <div className="text-center">
                <CheckCircle2
                  size={32}
                  className="mx-auto mb-2 text-accent-500"
                />
                <p className="text-sm font-medium">Nenhum alerta ativo</p>
              </div>
            </div>
          )}
        </div>

        {/* Resumo */}
        <div className="glass-card p-6">
          <h3 className="section-title mb-5">Resumo do Mês</h3>
          {summary ? (
            <div className="space-y-3">
              <div
                className="flex items-center justify-between p-3.5 rounded-xl"
                style={{ background: "rgba(23,179,100,0.06)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(23,179,100,0.15)" }}
                  >
                    <TrendingUp size={14} className="text-accent-500" />
                  </div>
                  <span className="text-sm font-medium text-accent-600">
                    Receitas
                  </span>
                </div>
                <span className="font-bold text-accent-600">
                  {formatCurrency(summary.total_receitas)}
                </span>
              </div>

              <div
                className="flex items-center justify-between p-3.5 rounded-xl"
                style={{ background: "rgba(249,58,74,0.06)" }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(249,58,74,0.15)" }}
                  >
                    <TrendingDown size={14} className="text-danger-500" />
                  </div>
                  <span className="text-sm font-medium text-danger-600">
                    Despesas
                  </span>
                </div>
                <span className="font-bold text-danger-600">
                  {formatCurrency(summary.total_despesas)}
                </span>
              </div>

              <div
                className="flex items-center justify-between p-3.5 rounded-xl"
                style={{
                  background:
                    summary.saldo >= 0
                      ? "rgba(51,102,255,0.06)"
                      : "rgba(249,131,7,0.06)",
                }}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{
                      background:
                        summary.saldo >= 0
                          ? "rgba(51,102,255,0.15)"
                          : "rgba(249,131,7,0.15)",
                    }}
                  >
                    <Wallet
                      size={14}
                      className={
                        summary.saldo >= 0 ? "text-brand-500" : "text-warn-500"
                      }
                    />
                  </div>
                  <span
                    className={`text-sm font-medium ${summary.saldo >= 0 ? "text-brand-600" : "text-warn-600"}`}
                  >
                    Saldo
                  </span>
                </div>
                <span
                  className={`font-bold ${summary.saldo >= 0 ? "text-brand-600" : "text-warn-600"}`}
                >
                  {formatCurrency(summary.saldo)}
                </span>
              </div>

              <div
                className="pt-3 mt-1"
                style={{ borderTop: "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-xs font-medium"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Despesas pagas
                  </span>
                  <span
                    className="text-xs font-bold"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {summary.despesas_pagas_count}/
                    {summary.total_despesas_count}
                  </span>
                </div>
                <div
                  className="w-full rounded-full h-2"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  <div
                    className="h-2 rounded-full transition-all duration-500"
                    style={{
                      width:
                        summary.total_despesas_count > 0
                          ? `${(summary.despesas_pagas_count / summary.total_despesas_count) * 100}%`
                          : "0%",
                      background: "linear-gradient(90deg, #3366ff, #8b5cf6)",
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center justify-center h-[200px]"
              style={{ color: "var(--text-muted)" }}
            >
              Carregando...
            </div>
          )}
        </div>
      </div>

      {/* Próximos Vencimentos */}
      <div className="glass-card p-6">
        <h3 className="section-title mb-5">Próximos Vencimentos</h3>
        {vencimentos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <th
                    className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Descrição
                  </th>
                  <th
                    className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Categoria
                  </th>
                  <th
                    className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Valor
                  </th>
                  <th
                    className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Vencimento
                  </th>
                  <th
                    className="text-center py-3 px-4 text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {vencimentos.map((v) => (
                  <tr
                    key={v.id}
                    className="transition-colors"
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "var(--bg-card-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td
                      className="py-3.5 px-4 text-sm font-semibold"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {v.descricao}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="badge badge-neutral">{v.categoria}</span>
                    </td>
                    <td
                      className="py-3.5 px-4 text-sm font-bold text-right"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {formatCurrency(v.valor)}
                    </td>
                    <td
                      className="py-3.5 px-4 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {formatDate(v.data_vencimento)}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`badge ${v.status === "URGENTE" ? "badge-danger" : v.status === "PROXIMO" ? "badge-warn" : "badge-info"}`}
                      >
                        {v.status === "URGENTE" && <AlertTriangle size={11} />}
                        {v.status === "PROXIMO" && <Clock size={11} />}
                        {v.status === "NORMAL" && <CheckCircle2 size={11} />}
                        {v.dias_restantes}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p
            className="text-sm text-center py-8"
            style={{ color: "var(--text-muted)" }}
          >
            Nenhum vencimento próximo
          </p>
        )}
      </div>
    </div>
  );
}
