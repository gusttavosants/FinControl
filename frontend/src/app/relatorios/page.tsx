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
import { formatCurrency, getCurrentMonth, getCurrentYear, MESES, COLORS } from "@/lib/utils";
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Relatórios</h1>
          <p className="text-sm text-slate-500 mt-1">Análise detalhada das suas finanças</p>
        </div>
        <MonthSelector mes={mes} ano={ano} onChange={(m, a) => { setMes(m); setAno(a); }} />
      </div>

      {/* Monthly Summary */}
      {relatorio && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase">Receitas</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrency(relatorio.total_receitas)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase">Despesas</p>
            <p className="text-xl font-bold text-red-600 mt-1">{formatCurrency(relatorio.total_despesas)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase">Saldo</p>
            <p className={`text-xl font-bold mt-1 ${relatorio.saldo >= 0 ? "text-blue-600" : "text-red-600"}`}>
              {formatCurrency(relatorio.saldo)}
            </p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase">Pagas</p>
            <p className="text-xl font-bold text-slate-700 mt-1">{formatCurrency(relatorio.total_pagas)}</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <p className="text-xs font-medium text-slate-400 uppercase">Pendentes</p>
            <p className="text-xl font-bold text-amber-600 mt-1">{formatCurrency(relatorio.total_pendentes)}</p>
          </div>
        </div>
      )}

      {/* Comparativo Chart */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-4">Comparativo Mensal (Últimos 6 meses)</h3>
        {comparativo.length > 0 ? (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={comparativo}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} stroke="#94a3b8" />
              <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: number) => `R$${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
              <Legend />
              <Line type="monotone" dataKey="receitas" name="Receitas" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="despesas" name="Despesas" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="saldo" name="Saldo" stroke="#6366f1" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-[350px] text-slate-400">Sem dados</div>
        )}
      </div>

      {/* Category Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Despesas por Categoria */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">Despesas por Categoria</h3>
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
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {catDespesaData
                  .sort((a, b) => b.value - a.value)
                  .map((item, i) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <span className="font-medium text-slate-700">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-slate-400">Sem dados</div>
          )}
        </div>

        {/* Receitas por Categoria */}
        <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <h3 className="text-base font-bold text-slate-800 mb-4">Receitas por Categoria</h3>
          {catReceitaData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={catReceitaData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#94a3b8" tickFormatter={(v: number) => `R$${(v / 1000).toFixed(1)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} stroke="#94a3b8" width={100} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} contentStyle={{ borderRadius: "12px", border: "1px solid #e2e8f0" }} />
                  <Bar dataKey="value" name="Valor" fill="#22c55e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {catReceitaData
                  .sort((a, b) => b.value - a.value)
                  .map((item) => (
                    <div key={item.name} className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">{item.name}</span>
                      <span className="font-medium text-emerald-600">{formatCurrency(item.value)}</span>
                    </div>
                  ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-slate-400">Sem dados</div>
          )}
        </div>
      </div>

      {/* Comparativo Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-4">Histórico Mensal</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Mês</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Receitas</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Despesas</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Saldo</th>
                <th className="text-right py-3 px-4 text-xs font-semibold text-slate-400 uppercase">Economia</th>
              </tr>
            </thead>
            <tbody>
              {comparativo.map((c) => (
                <tr key={c.mes} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-sm font-medium text-slate-700">{c.mes}</td>
                  <td className="py-3 px-4 text-sm text-emerald-600 font-medium text-right">
                    {formatCurrency(c.receitas)}
                  </td>
                  <td className="py-3 px-4 text-sm text-red-600 font-medium text-right">
                    {formatCurrency(c.despesas)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${c.saldo >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      {c.saldo >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {formatCurrency(Math.abs(c.saldo))}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                      c.economia > 0 ? "bg-emerald-50 text-emerald-700" : c.economia < 0 ? "bg-red-50 text-red-700" : "bg-slate-50 text-slate-500"
                    }`}>
                      {c.economia > 0 ? "+" : ""}{c.economia}%
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
