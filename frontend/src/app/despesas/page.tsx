"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, TrendingDown, Check, Hash, AlertCircle, CheckCircle2 } from "lucide-react";
import { despesasAPI, categoriasAPI } from "@/lib/api";
import { formatCurrency, formatDate, getCurrentMonth, getCurrentYear } from "@/lib/utils";
import MonthSelector from "@/components/MonthSelector";
import Modal from "@/components/Modal";

interface Despesa {
  id: number; descricao: string; categoria: string; valor: number;
  data_vencimento: string; data_pagamento: string | null;
  parcela_atual: number | null; parcela_total: number | null;
  pago: boolean; observacoes: string | null;
  recorrente: boolean; frequencia_recorrencia: string | null; parcelas_restantes: number | null;
}

function EmptyDespesas() {
  return (
    <div className="empty-state animate-fade-in">
      <div className="empty-state-icon">
        <TrendingDown size={28} style={{ color: "#ef4444" }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)", marginBottom: 4 }}>Nenhuma despesa encontrada</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Registre seus gastos para manter o controle financeiro</p>
      </div>
    </div>
  );
}

export default function DespesasPage() {
  const [mes, setMes] = useState(getCurrentMonth());
  const [ano, setAno] = useState(getCurrentYear());
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [filtro, setFiltro] = useState<"todos" | "pago" | "pendente">("todos");
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [form, setForm] = useState({ descricao: "", categoria: "", valor: "", data_vencimento: "", parcela_atual: "", parcela_total: "", observacoes: "", recorrente: false, frequencia_recorrencia: "", parcelas_restantes: "" });

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, cats] = await Promise.all([despesasAPI.listar(mes, ano), categoriasAPI.despesa()]);
      setDespesas(data); setCategorias(cats);
    } catch {}
    setLoading(false);
  };
  useEffect(() => { loadData(); }, [mes, ano]);

  const filtered = despesas
    .filter(d => filtro === "todos" || (filtro === "pago" ? d.pago : !d.pago))
    .filter(d => categoriaFiltro === "todas" || d.categoria === categoriaFiltro);

  const totalDespesas = despesas.reduce((s, d) => s + d.valor, 0);
  const totalPagas = despesas.filter(d => d.pago).reduce((s, d) => s + d.valor, 0);
  const totalPendentes = totalDespesas - totalPagas;
  const pctPago = totalDespesas > 0 ? (totalPagas / totalDespesas) * 100 : 0;

  const catStats = categorias.map(c => ({
    name: c, total: despesas.filter(d => d.categoria === c).reduce((s, d) => s + d.valor, 0),
    count: despesas.filter(d => d.categoria === c).length,
  })).filter(c => c.count > 0).sort((a, b) => b.total - a.total);

  const openCreate = () => { setEditingId(null); setForm({ descricao: "", categoria: categorias[0] || "", valor: "", data_vencimento: "", parcela_atual: "", parcela_total: "", observacoes: "", recorrente: false, frequencia_recorrencia: "", parcelas_restantes: "" }); setModalOpen(true); };
  const openEdit = (d: Despesa) => { setEditingId(d.id); setForm({ descricao: d.descricao, categoria: d.categoria, valor: String(d.valor), data_vencimento: d.data_vencimento, parcela_atual: d.parcela_atual ? String(d.parcela_atual) : "", parcela_total: d.parcela_total ? String(d.parcela_total) : "", observacoes: d.observacoes || "", recorrente: d.recorrente || false, frequencia_recorrencia: d.frequencia_recorrencia || "", parcelas_restantes: d.parcelas_restantes ? String(d.parcelas_restantes) : "" }); setModalOpen(true); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const p: any = { descricao: form.descricao, categoria: form.categoria, valor: parseFloat(form.valor), data_vencimento: form.data_vencimento, parcela_atual: form.parcela_atual ? parseInt(form.parcela_atual) : null, parcela_total: form.parcela_total ? parseInt(form.parcela_total) : null, observacoes: form.observacoes || null, recorrente: form.recorrente, frequencia_recorrencia: form.recorrente ? form.frequencia_recorrencia : null, parcelas_restantes: form.recorrente && form.parcelas_restantes ? parseInt(form.parcelas_restantes) : null, pago: false };
    if (editingId) await despesasAPI.atualizar(editingId, p);
    else { const r = await despesasAPI.criar(p); if (Array.isArray(r) && r.length > 1) alert(`${r.length} parcelas criadas!`); }
    setModalOpen(false); loadData();
  };
  const handleDelete = async (id: number) => { if (confirm("Excluir esta despesa?")) { await despesasAPI.deletar(id); loadData(); } };
  const handleTogglePago = async (id: number) => { await despesasAPI.togglePago(id); loadData(); };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Despesas</h1>
          <p className="page-subtitle">Controle seus gastos e pagamentos</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <MonthSelector mes={mes} ano={ano} onChange={(m, a) => { setMes(m); setAno(a); }} />
          <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Nova Despesa</button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
        <div className="kpi-card kpi-card-red">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(239,68,68,.1)" }}>
              <TrendingDown size={19} style={{ color: "#ef4444" }} />
            </div>
            <span className="badge badge-danger">{despesas.length} lanç.</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Total Despesas</p>
          <p className="text-2xl font-extrabold" style={{ color: "var(--text-primary)" }}>{formatCurrency(totalDespesas)}</p>
          {/* progress bar */}
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
              <span>Pago</span><span>{pctPago.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 rounded-full" style={{ background: "var(--bg-elevated)" }}>
              <div className="h-1.5 rounded-full transition-all duration-700" style={{ width: `${pctPago}%`, background: "#10b981" }} />
            </div>
          </div>
        </div>

        <div className="kpi-card kpi-card-green">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,.1)" }}>
              <CheckCircle2 size={19} style={{ color: "#10b981" }} />
            </div>
            <span className="badge badge-success">{despesas.filter(d => d.pago).length} itens</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Pagas</p>
          <p className="text-2xl font-extrabold" style={{ color: "#059669" }}>{formatCurrency(totalPagas)}</p>
        </div>

        <div className="kpi-card kpi-card-amber">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(245,158,11,.1)" }}>
              <AlertCircle size={19} style={{ color: "#f59e0b" }} />
            </div>
            <span className="badge badge-warn">{despesas.filter(d => !d.pago).length} itens</span>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Pendentes</p>
          <p className="text-2xl font-extrabold" style={{ color: "#d97706" }}>{formatCurrency(totalPendentes)}</p>
        </div>
      </div>

      {/* Category breakdown */}
      {catStats.length > 0 && (
        <div className="glass-card p-5">
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Gastos por Categoria</p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {catStats.slice(0, 5).map(c => (
              <div key={c.name} className="p-3 rounded-lg" style={{ background: "var(--bg-elevated)" }}>
                <p className="text-xs font-semibold truncate" style={{ color: "var(--text-secondary)" }}>{c.name}</p>
                <p className="text-sm font-bold mt-1" style={{ color: "#ef4444" }}>{formatCurrency(c.total)}</p>
                <div className="h-1 rounded-full mt-2" style={{ background: "var(--border-subtle)" }}>
                  <div className="h-1 rounded-full" style={{ width: `${(c.total / (catStats[0].total || 1)) * 100}%`, background: "#ef4444" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["todos","pendente","pago"] as const).map(f => (
          <button key={f} onClick={() => setFiltro(f)}
            className={`filter-chip ${filtro === f ? (f === "pago" ? "filter-chip-green-active" : f === "pendente" ? "filter-chip-amber-active" : "filter-chip-active") : ""}`}>
            {f === "todos" ? "Todos" : f === "pago" ? "✓ Pagos" : "⏳ Pendentes"}
          </button>
        ))}
        <div className="w-px h-5" style={{ background: "var(--border-subtle)" }} />
        <button onClick={() => setCategoriaFiltro("todas")}
          className={`filter-chip ${categoriaFiltro === "todas" ? "filter-chip-active" : ""}`}>
          <Hash size={12} /> Todas categorias
        </button>
        {categorias.map(c => (
          <button key={c} onClick={() => setCategoriaFiltro(c)}
            className={`filter-chip ${categoriaFiltro === c ? "filter-chip-red-active" : ""}`}>{c}</button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border-default)", borderTopColor: "#ef4444" }} />
          </div>
        ) : filtered.length === 0 ? <EmptyDespesas /> : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 52, textAlign: "center" }}>Pago</th>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th style={{ textAlign: "right" }}>Valor</th>
                  <th>Vencimento</th>
                  <th style={{ textAlign: "center" }}>Parcelas</th>
                  <th style={{ textAlign: "center", width: 90 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(d => (
                  <tr key={d.id}
                    style={{ opacity: d.pago ? 0.65 : 1, borderLeft: `3px solid ${d.pago ? "rgba(16,185,129,.4)" : "rgba(239,68,68,.4)"}` }}>
                    <td style={{ textAlign: "center" }}>
                      <button onClick={() => handleTogglePago(d.id)}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center mx-auto transition-all ${d.pago ? "bg-emerald-500 border-emerald-500 text-white" : ""}`}
                        style={{ borderColor: d.pago ? "#10b981" : "var(--border-default)" }}>
                        {d.pago && <Check size={12} strokeWidth={3} />}
                      </button>
                    </td>
                    <td>
                      <p className={`font-semibold text-sm ${d.pago ? "line-through" : ""}`} style={{ color: d.pago ? "var(--text-muted)" : "var(--text-primary)" }}>{d.descricao}</p>
                      {d.observacoes && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{d.observacoes}</p>}
                    </td>
                    <td><span className="badge badge-danger">{d.categoria}</span></td>
                    <td style={{ textAlign: "right" }}>
                      <span className="font-bold text-sm" style={{ color: d.pago ? "var(--text-muted)" : "var(--text-primary)" }}>{formatCurrency(d.valor)}</span>
                    </td>
                    <td><span className="text-sm" style={{ color: "var(--text-secondary)" }}>{formatDate(d.data_vencimento)}</span></td>
                    <td style={{ textAlign: "center" }}>
                      {d.parcela_atual && d.parcela_total
                        ? <span className="badge badge-purple">{d.parcela_atual}/{d.parcela_total}</span>
                        : <span style={{ color: "var(--text-muted)" }}>—</span>}
                    </td>
                    <td>
                      <div className="flex items-center justify-center gap-1">
                        <button onClick={() => openEdit(d)} className="btn-ghost px-2 py-1.5"><Pencil size={13} /></button>
                        <button onClick={() => handleDelete(d.id)} className="btn-ghost px-2 py-1.5" style={{ color: "#ef4444" }}><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
                  <td colSpan={3} className="py-3 px-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    {filtered.length} {filtered.length === 1 ? "despesa" : "despesas"}
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-base" style={{ color: "var(--text-primary)" }}>
                    {formatCurrency(filtered.reduce((s, d) => s + d.valor, 0))}
                  </td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Editar Despesa" : "Nova Despesa"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Descrição</label>
            <input type="text" required value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="input-field" placeholder="Ex: Aluguel" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Categoria</label>
              <select required value={form.categoria} onChange={e => setForm({ ...form, categoria: e.target.value })} className="input-field">
                {categorias.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Valor (R$)</label>
              <input type="number" step="0.01" required value={form.valor} onChange={e => setForm({ ...form, valor: e.target.value })} className="input-field" placeholder="0,00" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Data de Vencimento</label>
            <input type="date" required value={form.data_vencimento} onChange={e => setForm({ ...form, data_vencimento: e.target.value })} className="input-field" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Parcela Atual</label>
              <input type="number" min="1" value={form.parcela_atual} onChange={e => setForm({ ...form, parcela_atual: e.target.value })} className="input-field" placeholder="Ex: 3" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Total de Parcelas</label>
              <input type="number" min="1" value={form.parcela_total} onChange={e => setForm({ ...form, parcela_total: e.target.value })} className="input-field" placeholder="Ex: 12" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="input-field" rows={2} placeholder="Informações adicionais..." />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.recorrente} onChange={e => setForm({ ...form, recorrente: e.target.checked })} className="w-4 h-4 rounded" style={{ accentColor: "#ef4444" }} />
            <span className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Despesa recorrente</span>
          </label>
          {form.recorrente && (
            <div className="grid grid-cols-2 gap-4 p-4 rounded-xl" style={{ background: "rgba(239,68,68,.06)", border: "1px solid rgba(239,68,68,.15)" }}>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Frequência</label>
                <select value={form.frequencia_recorrencia} onChange={e => setForm({ ...form, frequencia_recorrencia: e.target.value })} className="input-field">
                  <option value="">Selecione...</option>
                  <option value="mensal">Mensal</option>
                  <option value="semanal">Semanal</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Parcelas restantes</label>
                <input type="number" min="1" value={form.parcelas_restantes} onChange={e => setForm({ ...form, parcelas_restantes: e.target.value })} className="input-field" placeholder="Ex: 12" />
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" className="btn-primary flex-1">{editingId ? "Salvar alterações" : "Criar Despesa"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
