"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { relatoriosAPI } from "@/lib/api";
import {
  formatCurrency,
  getCurrentMonth,
  getCurrentYear,
  MESES,
  COLORS,
} from "@/lib/utils";
import MonthSelector from "@/components/MonthSelector";

interface RelatorioMensal {
  mes: number;
  ano: number;
  total_receitas: number;
  total_despesas: number;
  saldo: number;
  total_pagas: number;
  total_pendentes: number;
  categorias_despesa: Record<string, number>;
  categorias_receita: Record<string, number>;
}

interface Comparativo {
  mes: string;
  receitas: number;
  despesas: number;
  saldo: number;
  economia: number;
}

export default function RelatoriosPage() {
  const [mes, setMes] = useState(getCurrentMonth());
  const [ano, setAno] = useState(getCurrentYear());
  const [relatorio, setRelatorio] = useState<RelatorioMensal | null>(null);
  const [comparativo, setComparativo] = useState<Comparativo[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rel, comp] = await Promise.all([
        relatoriosAPI.mensal(mes, ano),
        relatoriosAPI.comparativo(6),
      ]);
      setRelatorio(rel);
      setComparativo(comp);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [mes, ano]);

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

  const catDespesaData = relatorio
    ? Object.entries(relatorio.categorias_despesa).map(([cat, val]) => ({
        name: cat,
        value: val,
      }))
    : [];

  const catReceitaData = relatorio
    ? Object.entries(relatorio.categorias_receita).map(([cat, val]) => ({
        name: cat,
        value: val,
      }))
    : [];

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Relatórios</h1>
          <p className="page-subtitle">Análise detalhada das suas finanças</p>
        </div>
        <MonthSelector
          mes={mes}
          ano={ano}
          onChange={(m, a) => {
            setMes(m);
            setAno(a);
          }}
        />
      </div>

      {/* Monthly Summary */}
      {relatorio && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="stat-card stat-card-accent">
            <p
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Receitas
            </p>
            <p className="text-xl font-extrabold tracking-tight mt-1 text-accent-500">
              {formatCurrency(relatorio.total_receitas)}
            </p>
          </div>
          <div className="stat-card stat-card-danger">
            <p
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Despesas
            </p>
            <p className="text-xl font-extrabold tracking-tight mt-1 text-danger-500">
              {formatCurrency(relatorio.total_despesas)}
            </p>
          </div>
          <div className="stat-card stat-card-brand">
            <p
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Saldo
            </p>
            <p
              className={`text-xl font-extrabold tracking-tight mt-1 ${relatorio.saldo >= 0 ? "text-accent-500" : "text-danger-500"}`}
            >
              {formatCurrency(relatorio.saldo)}
            </p>
          </div>
          <div className="stat-card">
            <p
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Pagas
            </p>
            <p
              className="text-xl font-extrabold tracking-tight mt-1"
              style={{ color: "var(--text-primary)" }}
            >
              {formatCurrency(relatorio.total_pagas)}
            </p>
          </div>
          <div className="stat-card stat-card-warn">
            <p
              className="text-xs font-bold uppercase tracking-wider"
              style={{ color: "var(--text-muted)" }}
            >
              Pendentes
            </p>
            <p className="text-xl font-extrabold tracking-tight mt-1 text-warn-500">
              {formatCurrency(relatorio.total_pendentes)}
            </p>
          </div>
        </div>
      )}

      {/* Comparativo Chart */}
      <div className="glass-card p-6">
        <h3 className="section-title mb-4">
          Comparativo Mensal (Últimos 6 meses)
        </h3>
        {comparativo.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={comparativo}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border-subtle)"
                vertical={false}
              />
              <XAxis
                dataKey="mes"
                tick={{ fontSize: 11 }}
                stroke="var(--border-subtle)"
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11 }}
                stroke="var(--border-subtle)"
                tickLine={false}
                axisLine={false}
                tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line
                type="monotone"
                dataKey="receitas"
                name="Receitas"
                stroke="#17b364"
                strokeWidth={2.5}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="despesas"
                name="Despesas"
                stroke="#f93a4a"
                strokeWidth={2.5}
                dot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="saldo"
                name="Saldo"
                stroke="#3366ff"
                strokeWidth={2}
                strokeDasharray="5 5"
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div
            className="flex items-center justify-center h-[350px]"
            style={{ color: "var(--text-muted)" }}
          >
            Sem dados
          </div>
        )}
      </div>

      {/* Category Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Despesas por Categoria */}
        <div className="glass-card p-6">
          <h3 className="section-title mb-4">Despesas por Categoria</h3>
          {catDespesaData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={catDespesaData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {catDespesaData.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {catDespesaData
                  .sort((a, b) => b.value - a.value)
                  .map((item, i) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        />
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <span className="font-medium text-slate-700">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div
              className="flex items-center justify-center h-[250px]"
              style={{ color: "var(--text-muted)" }}
            >
              Sem dados
            </div>
          )}
        </div>

        {/* Receitas por Categoria */}
        <div className="glass-card p-6">
          <h3 className="section-title mb-4">Receitas por Categoria</h3>
          {catReceitaData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={catReceitaData} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border-subtle)"
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11 }}
                    stroke="var(--border-subtle)"
                    tickFormatter={(v: number) => `R$${(v / 1000).toFixed(1)}k`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 11 }}
                    stroke="var(--border-subtle)"
                    width={100}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Bar
                    dataKey="value"
                    name="Valor"
                    fill="#17b364"
                    radius={[0, 6, 6, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {catReceitaData
                  .sort((a, b) => b.value - a.value)
                  .map((item) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-slate-600">{item.name}</span>
                      <span className="font-medium text-emerald-600">
                        {formatCurrency(item.value)}
                      </span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div
              className="flex items-center justify-center h-[250px]"
              style={{ color: "var(--text-muted)" }}
            >
              Sem dados
            </div>
          )}
        </div>
      </div>

      {/* Comparativo Table */}
      <div className="glass-card p-6">
        <h3 className="section-title mb-4">Histórico Mensal</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <th
                  className="text-left py-3 px-4 text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Mês
                </th>
                <th
                  className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Receitas
                </th>
                <th
                  className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Despesas
                </th>
                <th
                  className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Saldo
                </th>
                <th
                  className="text-right py-3 px-4 text-xs font-bold uppercase tracking-wider"
                  style={{ color: "var(--text-muted)" }}
                >
                  Economia
                </th>
              </tr>
            </thead>
            <tbody>
              {comparativo.map((c) => (
                <tr
                  key={c.mes}
                  className="transition-colors"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-card-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = "transparent")
                  }
                >
                  <td
                    className="py-3 px-4 text-sm font-semibold"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {c.mes}
                  </td>
                  <td className="py-3 px-4 text-sm font-bold text-right text-accent-500">
                    {formatCurrency(c.receitas)}
                  </td>
                  <td className="py-3 px-4 text-sm font-bold text-right text-danger-500">
                    {formatCurrency(c.despesas)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`inline-flex items-center gap-1 text-sm font-bold ${c.saldo >= 0 ? "text-accent-500" : "text-danger-500"}`}
                    >
                      {c.saldo >= 0 ? (
                        <ArrowUpRight size={14} />
                      ) : (
                        <ArrowDownRight size={14} />
                      )}
                      {formatCurrency(Math.abs(c.saldo))}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        c.economia > 0
                          ? "badge badge-success"
                          : c.economia < 0
                            ? "badge badge-danger"
                            : "badge badge-neutral"
                      }`}
                    >
                      {c.economia > 0 ? "+" : ""}
                      {c.economia}%
                    </span>
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
