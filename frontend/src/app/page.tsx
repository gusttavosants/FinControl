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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  const isEmpty =
    summary && summary.total_receitas === 0 && summary.total_despesas === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-[#a1a7b8] mt-1">
            Visão geral das suas finanças
          </p>
        </div>
        <div className="flex items-center gap-3">
          <MonthSelector
            mes={mes}
            ano={ano}
            onChange={(m, a) => {
              setMes(m);
              setAno(a);
            }}
          />
          <a
            href={exportAPI.excel(mes, ano)}
            className="flex items-center gap-2 bg-[#a3e635] text-[#0b0d14] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#84cc16] transition-colors"
          >
            <Download size={16} />
            Exportar Excel
          </a>
          {isEmpty && (
            <button
              onClick={handleSeed}
              className="flex items-center gap-2 bg-[#1a1d2e] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-[#242740] transition-colors border border-[#2a2d3e]"
            >
              <Database size={16} />
              Carregar Dados de Exemplo
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#1a1d2e] rounded-2xl p-5 border border-[#2a2d3e] hover:border-[#353849] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[#a1a7b8]">
                Receitas
              </span>
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <TrendingUp size={20} className="text-emerald-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(summary.total_receitas)}
            </p>
            <p className="text-xs text-[#6b7280] mt-1">
              {summary.total_receitas_count} lançamentos
            </p>
          </div>

          <div className="bg-[#1a1d2e] rounded-2xl p-5 border border-[#2a2d3e] hover:border-[#353849] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[#a1a7b8]">
                Despesas
              </span>
              <div className="w-10 h-10 bg-red-500/10 rounded-xl flex items-center justify-center">
                <TrendingDown size={20} className="text-red-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(summary.total_despesas)}
            </p>
            <p className="text-xs text-[#6b7280] mt-1">
              {summary.total_despesas_count} lançamentos
            </p>
          </div>

          <div className="bg-[#1a1d2e] rounded-2xl p-5 border border-[#2a2d3e] hover:border-[#353849] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[#a1a7b8]">Saldo</span>
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center ${summary.saldo >= 0 ? "bg-[#a3e635]/10" : "bg-red-500/10"}`}
              >
                <Wallet
                  size={20}
                  className={
                    summary.saldo >= 0 ? "text-[#a3e635]" : "text-red-400"
                  }
                />
              </div>
            </div>
            <p
              className={`text-2xl font-bold ${summary.saldo >= 0 ? "text-[#a3e635]" : "text-red-400"}`}
            >
              {formatCurrency(summary.saldo)}
            </p>
            <p className="text-xs text-[#6b7280] mt-1">
              {summary.saldo >= 0 ? "Saldo positivo" : "Saldo negativo"}
            </p>
          </div>

          <div className="bg-[#1a1d2e] rounded-2xl p-5 border border-[#2a2d3e] hover:border-[#353849] transition-colors">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-[#a1a7b8]">
                Pendentes
              </span>
              <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                <Clock size={20} className="text-amber-400" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">
              {formatCurrency(summary.despesas_pendentes)}
            </p>
            <p className="text-xs text-[#6b7280] mt-1">
              {formatCurrency(summary.despesas_pagas)} já pagas
            </p>
          </div>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução Receitas vs Despesas */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">
            Evolução Receitas vs Despesas
          </h3>
          {evolucao.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  stroke="#2a2d3e"
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  stroke="#2a2d3e"
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #2a2d3e",
                    backgroundColor: "#1a1d2e",
                    color: "#f0f2f5",
                  }}
                  labelStyle={{ color: "#a1a7b8" }}
                />
                <Legend wrapperStyle={{ color: "#a1a7b8" }} />
                <Bar
                  dataKey="receitas"
                  name="Receitas"
                  fill="#a3e635"
                  radius={[6, 6, 0, 0]}
                />
                <Bar
                  dataKey="despesas"
                  name="Despesas"
                  fill="#ef4444"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400">
              Sem dados para exibir
            </div>
          )}
        </div>

        {/* Evolução do Saldo */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">
            Evolução do Saldo
          </h3>
          {evolucao.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={evolucao}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2d3e" />
                <XAxis
                  dataKey="mes"
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  stroke="#2a2d3e"
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#6b7280" }}
                  stroke="#2a2d3e"
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{
                    borderRadius: "12px",
                    border: "1px solid #2a2d3e",
                    backgroundColor: "#1a1d2e",
                    color: "#f0f2f5",
                  }}
                  labelStyle={{ color: "#a1a7b8" }}
                />
                <Legend wrapperStyle={{ color: "#a1a7b8" }} />
                <Line
                  type="monotone"
                  dataKey="saldo"
                  name="Saldo"
                  stroke="#a3e635"
                  strokeWidth={3}
                  dot={{ fill: "#a3e635", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400">
              Sem dados para exibir
            </div>
          )}
        </div>
      </div>

      {/* Second Row: Categories and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Categorias Pie */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">
            Despesas por Categoria
          </h3>
          {categorias.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categorias}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="total"
                    nameKey="categoria"
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
              <div className="space-y-2 mt-4 max-h-[180px] overflow-y-auto scrollbar-thin">
                {categorias.map((cat, i) => (
                  <div
                    key={cat.categoria}
                    className="flex items-center justify-between text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: COLORS[i % COLORS.length] }}
                      />
                      <span className="text-slate-600">{cat.categoria}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-medium text-slate-700">
                        {formatCurrency(cat.total)}
                      </span>
                      <span className="text-slate-400 ml-2 text-xs">
                        {cat.percentual}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-400">
              Sem dados para exibir
            </div>
          )}
        </div>

        {/* Alertas de Vencimento */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} />
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
                    className={`p-3 rounded-lg border-l-4 ${
                      v.dias_restantes <= 0
                        ? "bg-red-50 border-red-500"
                        : v.dias_restantes <= 1
                          ? "bg-orange-50 border-orange-500"
                          : "bg-amber-50 border-amber-500"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-800 text-sm">
                        {v.descricao}
                      </span>
                      <span className="font-bold text-slate-700">
                        {formatCurrency(v.valor)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-slate-500">
                        {v.categoria}
                      </span>
                      <span
                        className={`text-xs font-medium ${
                          v.dias_restantes <= 0
                            ? "text-red-600"
                            : v.dias_restantes <= 1
                              ? "text-orange-600"
                              : "text-amber-600"
                        }`}
                      >
                        {v.dias_restantes <= 0
                          ? "Vencida!"
                          : `${v.dias_restantes} dia(s)`}
                      </span>
                    </div>
                  </div>
                ))}
              {vencimentos.filter(
                (v) =>
                  v.dias_restantes <= 3 &&
                  !v.descricao.toLowerCase().includes("pago"),
              ).length > 5 && (
                <p className="text-xs text-slate-400 text-center mt-2">
                  +
                  {vencimentos.filter(
                    (v) =>
                      v.dias_restantes <= 3 &&
                      !v.descricao.toLowerCase().includes("pago"),
                  ).length - 5}{" "}
                  mais alertas...
                </p>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-400">
              <div className="text-center">
                <CheckCircle2
                  size={32}
                  className="mx-auto mb-2 text-emerald-500"
                />
                <p className="text-sm">Nenhum alerta ativo</p>
              </div>
            </div>
          )}
        </div>

        {/* Resumo do Mês Atual */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">
            Resumo do Mês
          </h3>
          {summary ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-emerald-600" />
                  <span className="text-sm font-medium text-emerald-700">
                    Receitas
                  </span>
                </div>
                <span className="font-bold text-emerald-600">
                  {formatCurrency(summary.total_receitas)}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <TrendingDown size={16} className="text-red-600" />
                  <span className="text-sm font-medium text-red-700">
                    Despesas
                  </span>
                </div>
                <span className="font-bold text-red-600">
                  {formatCurrency(summary.total_despesas)}
                </span>
              </div>

              <div
                className={`flex items-center justify-between p-3 rounded-lg ${
                  summary.saldo >= 0 ? "bg-blue-50" : "bg-orange-50"
                }`}
              >
                <div className="flex items-center gap-2">
                  <Wallet
                    size={16}
                    className={
                      summary.saldo >= 0 ? "text-blue-600" : "text-orange-600"
                    }
                  />
                  <span
                    className={`text-sm font-medium ${
                      summary.saldo >= 0 ? "text-blue-700" : "text-orange-700"
                    }`}
                  >
                    Saldo
                  </span>
                </div>
                <span
                  className={`font-bold ${
                    summary.saldo >= 0 ? "text-blue-600" : "text-orange-600"
                  }`}
                >
                  {formatCurrency(summary.saldo)}
                </span>
              </div>

              <div className="pt-2 border-t border-slate-200">
                <div className="text-xs text-slate-500 text-center">
                  {summary.despesas_pagas_count} de{" "}
                  {summary.total_despesas_count} despesas pagas
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{
                      width:
                        summary.total_despesas_count > 0
                          ? `${(summary.despesas_pagas_count / summary.total_despesas_count) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-400">
              Carregando...
            </div>
          )}
        </div>
      </div>

      {/* Próximos Vencimentos */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-4">
          Próximos Vencimentos
        </h3>
        {vencimentos.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">
                    Descrição
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">
                    Categoria
                  </th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">
                    Valor
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">
                    Vencimento
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {vencimentos.map((v) => (
                  <tr
                    key={v.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-slate-700">
                      {v.descricao}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
                        {v.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-slate-700 text-right">
                      {formatCurrency(v.valor)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {formatDate(v.data_vencimento)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${
                          v.status === "URGENTE"
                            ? "bg-red-50 text-red-700"
                            : v.status === "PROXIMO"
                              ? "bg-amber-50 text-amber-700"
                              : "bg-blue-50 text-blue-700"
                        }`}
                      >
                        {v.status === "URGENTE" && <AlertTriangle size={12} />}
                        {v.status === "PROXIMO" && <Clock size={12} />}
                        {v.status === "NORMAL" && <CheckCircle2 size={12} />}
                        {v.dias_restantes}d
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-400 text-center py-8">
            Nenhum vencimento próximo
          </p>
        )}
      </div>
    </div>
  );
}
