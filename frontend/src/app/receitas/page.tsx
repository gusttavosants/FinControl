"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, TrendingUp, ArrowUpRight, Hash } from "lucide-react";
import { receitasAPI, categoriasAPI } from "@/lib/api";
import { formatCurrency, formatDate, getCurrentMonth, getCurrentYear, maskCurrency, parseCurrencyToNumber } from "@/lib/utils";
import MonthSelector from "@/components/MonthSelector";
import Modal from "@/components/Modal";

interface Receita { id: number; descricao: string; categoria: string; valor: number; data: string; observacoes: string | null; }

/* Ícone SVG de estado vazio */
function EmptyReceitas() {
  return (
    <div className="empty-state animate-fade-in">
      <div className="empty-state-icon">
        <TrendingUp size={28} style={{ color: "#10b981" }} />
      </div>
      <div style={{ textAlign: "center" }}>
        <p className="text-base font-semibold" style={{ color: "var(--text-primary)", marginBottom: 4 }}>Nenhuma receita em {new Date().toLocaleDateString("pt-BR",{month:"long"})}</p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Registre suas fontes de renda para acompanhar seu progresso</p>
      </div>
    </div>
  );
}

export default function ReceitasPage() {
  const [mes, setMes] = useState(getCurrentMonth());
  const [ano, setAno] = useState(getCurrentYear());
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState("todas");
  const [syncing, setSyncing] = useState<number | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);
  const [form, setForm] = useState({ descricao: "", categoria: "", valor: "", data: "", observacoes: "" });

  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [data, cats] = await Promise.all([receitasAPI.listar(mes, ano), categoriasAPI.receita()]);
      setReceitas(data); setCategorias(cats);
    } catch {}
    if (!silent) setLoading(false);
  };
  useEffect(() => { loadData(); }, [mes, ano]);

  const filtered = receitas.filter(r => categoriaFiltro === "todas" || r.categoria === categoriaFiltro);
  const total = filtered.reduce((s, r) => s + r.valor, 0);
  const maxVal = receitas.length ? Math.max(...receitas.map(r => r.valor)) : 1;

  /* categoria stats */
  const catStats = categorias.map(c => ({
    name: c,
    total: receitas.filter(r => r.categoria === c).reduce((s, r) => s + r.valor, 0),
    count: receitas.filter(r => r.categoria === c).length,
  })).filter(c => c.count > 0).sort((a, b) => b.total - a.total);

  const openCreate = () => { setEditingId(null); setForm({ descricao: "", categoria: categorias[0] || "", valor: "", data: "", observacoes: "" }); setModalOpen(true); };
  const openEdit = (r: Receita) => { setEditingId(r.id); setForm({ descricao: r.descricao, categoria: r.categoria, valor: String(r.valor), data: r.data, observacoes: r.observacoes || "" }); setModalOpen(true); };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const valorNum = parseFloat(form.valor);
    const p = { descricao: form.descricao, categoria: form.categoria, valor: valorNum, data: form.data, observacoes: form.observacoes || null };
    
    try {
      if (editingId) {
        setSyncing(editingId);
        await receitasAPI.atualizar(editingId, p);
        setReceitas(prev => prev.map(r => r.id === editingId ? { ...r, ...p, id: editingId } : r));
      } else {
        const res = await receitasAPI.criar(p);
        const newId = res.id;
        if (newId) setReceitas(prev => [...prev, { ...p, id: newId }]);
        else loadData();
      }
    } catch {
      loadData();
    } finally {
      setSyncing(null);
      setModalOpen(false);
    }
  };

  const openDeleteModal = (id: number) => {
    setIdToDelete(id);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!idToDelete) return;
    const original = [...receitas];
    setReceitas(prev => prev.filter(r => r.id !== idToDelete));
    try {
      await receitasAPI.deletar(idToDelete);
    } catch {
      setReceitas(original);
      alert("Erro ao excluir");
    } finally {
      setShowDeleteModal(false);
      setIdToDelete(null);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Receitas</h1>
          <p className="page-subtitle">Gerencie suas fontes de renda</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <MonthSelector mes={mes} ano={ano} onChange={(m, a) => { setMes(m); setAno(a); }} />
          <button onClick={openCreate} className="btn-primary"><Plus size={15} /> Nova Receita</button>
        </div>
      </div>

      {/* KPI + Category Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 stagger-children">
        {/* Main KPI */}
        <div className="kpi-card kpi-card-green lg:col-span-1">
          <div className="flex items-start justify-between mb-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,.12)" }}>
              <TrendingUp size={19} style={{ color: "#10b981" }} />
            </div>
            <span className="badge badge-success">
              <ArrowUpRight size={10} /> {receitas.length} lanç.
            </span>
          </div>
          <p className="text-xs font-bold uppercase tracking-wider mb-1" style={{ color: "var(--text-muted)" }}>Total de Receitas</p>
          <p className="text-3xl font-extrabold tracking-tight" style={{ color: "#059669" }}>{formatCurrency(total)}</p>
          {catStats.length > 0 && (
            <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
              Maior: <span style={{ color: "var(--text-secondary)", fontWeight: 600 }}>{catStats[0].name}</span> · {formatCurrency(catStats[0].total)}
            </p>
          )}
        </div>

        {/* Category breakdown */}
        <div className="glass-card p-5 lg:col-span-2">
          <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "var(--text-muted)" }}>Por Categoria</p>
          {loading ? (
            <div className="space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-6" />)}</div>
          ) : catStats.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Sem dados ainda</p>
          ) : (
            <div className="space-y-2.5">
              {catStats.slice(0, 5).map(c => (
                <div key={c.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>{c.name}</span>
                    <span className="text-sm font-bold" style={{ color: "#059669" }}>{formatCurrency(c.total)}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: "var(--bg-elevated)" }}>
                    <div className="h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${(c.total / (catStats[0].total || 1)) * 100}%`, background: "linear-gradient(90deg,#10b981,#34d399)" }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={() => setCategoriaFiltro("todas")}
          className={`filter-chip ${categoriaFiltro === "todas" ? "filter-chip-active" : ""}`}>
          <Hash size={12} /> Todas
        </button>
        {categorias.map(c => (
          <button key={c} onClick={() => setCategoriaFiltro(c)}
            className={`filter-chip ${categoriaFiltro === c ? "filter-chip-green-active" : ""}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 rounded-full border-2 animate-spin" style={{ borderColor: "var(--border-default)", borderTopColor: "#10b981" }} />
          </div>
        ) : filtered.length === 0 ? <EmptyReceitas /> : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Categoria</th>
                  <th style={{ textAlign: "right" }}>Valor</th>
                  <th>Data</th>
                  <th style={{ textAlign: "right", width: 80 }}>% do Total</th>
                  <th style={{ textAlign: "center", width: 90 }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const pct = total > 0 ? (r.valor / total) * 100 : 0;
                  return (
                    <tr key={r.id} style={{ borderLeft: "3px solid rgba(16,185,129,.4)" }}>
                      <td>
                        <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{r.descricao}</p>
                        {r.observacoes && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{r.observacoes}</p>}
                      </td>
                      <td><span className="badge badge-success">{r.categoria}</span></td>
                      <td style={{ textAlign: "right" }}>
                        <span className="font-bold text-sm" style={{ color: "#059669" }}>{formatCurrency(r.valor)}</span>
                      </td>
                      <td><span className="text-sm" style={{ color: "var(--text-secondary)" }}>{formatDate(r.data)}</span></td>
                      <td>
                        <div className="flex items-center gap-2 justify-end">
                          <span className="text-xs font-medium" style={{ color: "var(--text-muted)" }}>{pct.toFixed(0)}%</span>
                          <div className="w-16 h-1.5 rounded-full" style={{ background: "var(--bg-elevated)" }}>
                            <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: "#10b981" }} />
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(r)} disabled={syncing === r.id} className="btn-ghost px-2 py-1.5" title="Editar">
                            {syncing === r.id ? <div className="w-3 h-3 border-2 border-brand/30 border-t-brand rounded-full animate-spin" /> : <Pencil size={13} />}
                          </button>
                          <button onClick={() => openDeleteModal(r.id)} className="btn-ghost px-2 py-1.5" style={{ color: "#ef4444" }} title="Excluir"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid var(--border-subtle)", background: "var(--bg-elevated)" }}>
                  <td colSpan={2} className="py-3 px-4 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>
                    {filtered.length} {filtered.length === 1 ? "receita" : "receitas"}
                  </td>
                  <td className="py-3 px-4 text-right font-extrabold text-base" style={{ color: "#059669" }}>{formatCurrency(total)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? "Editar Receita" : "Nova Receita"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Descrição</label>
            <input type="text" required value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })} className="input-field" placeholder="Ex: Salário Mensal" />
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
              <input
                type="text"
                required
                value={maskCurrency(form.valor || 0)}
                onChange={e => setForm({ ...form, valor: parseCurrencyToNumber(e.target.value).toString() })}
                className="input-field"
                placeholder="0,00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Data</label>
            <input type="date" required value={form.data} onChange={e => setForm({ ...form, data: e.target.value })} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm({ ...form, observacoes: e.target.value })} className="input-field" rows={2} placeholder="Informações adicionais..." />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary flex-1">Cancelar</button>
            <button type="submit" className="btn-primary flex-1">{editingId ? "Salvar" : "Criar Receita"}</button>
          </div>
        </form>
      </Modal>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in-fast" onClick={() => setShowDeleteModal(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#161920] rounded-[32px] p-8 shadow-2xl animate-in fade-in zoom-in-95 border border-white/10">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-6 mx-auto">
              <Trash2 size={32} />
            </div>
            <div className="text-center space-y-2 mb-8">
              <h3 className="text-2xl font-black">Apagar Receita?</h3>
              <p className="text-muted text-sm px-4">Esta ação é permanente e não poderá ser desfeita.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDelete}
                className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-sm hover:bg-rose-600 transition-all active:scale-95 shadow-lg shadow-rose-500/20"
              >
                SIM, APAGAR RECEITA
              </button>
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="w-full py-4 bg-slate-100 dark:bg-white/5 text-slate-600 dark:text-white rounded-2xl font-bold text-sm hover:bg-slate-200 dark:hover:bg-white/10 transition-all active:scale-95"
              >
                CANCELAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
