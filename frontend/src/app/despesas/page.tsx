"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  TrendingDown,
  Check,
  X,
  Download,
} from "lucide-react";
import { despesasAPI, categoriasAPI, exportAPI } from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  getCurrentMonth,
  getCurrentYear,
} from "@/lib/utils";
import MonthSelector from "@/components/MonthSelector";
import Modal from "@/components/Modal";

interface Despesa {
  id: number;
  descricao: string;
  categoria: string;
  valor: number;
  data_vencimento: string;
  data_pagamento: string | null;
  parcela_atual: number | null;
  parcela_total: number | null;
  pago: boolean;
  observacoes: string | null;
  recorrente: boolean;
  frequencia_recorrencia: string | null;
  parcelas_restantes: number | null;
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
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");

  const [form, setForm] = useState({
    descricao: "",
    categoria: "",
    valor: "",
    data_vencimento: "",
    parcela_atual: "",
    parcela_total: "",
    observacoes: "",
    recorrente: false,
    frequencia_recorrencia: "",
    parcelas_restantes: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, cats] = await Promise.all([
        despesasAPI.listar(mes, ano),
        categoriasAPI.despesa(),
      ]);
      setDespesas(data);
      setCategorias(cats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [mes, ano]);

  const filtered = despesas
    .filter((d) => {
      if (filtro === "pago") return d.pago;
      if (filtro === "pendente") return !d.pago;
      return true;
    })
    .filter((d) => {
      if (categoriaFiltro === "todas") return true;
      return d.categoria === categoriaFiltro;
    });

  const totalDespesas = despesas.reduce((sum, d) => sum + d.valor, 0);
  const totalPagas = despesas
    .filter((d) => d.pago)
    .reduce((sum, d) => sum + d.valor, 0);
  const totalPendentes = totalDespesas - totalPagas;

  const openCreate = () => {
    setEditingId(null);
    setForm({
      descricao: "",
      categoria: categorias[0] || "",
      valor: "",
      data_vencimento: "",
      parcela_atual: "",
      parcela_total: "",
      observacoes: "",
      recorrente: false,
      frequencia_recorrencia: "",
      parcelas_restantes: "",
    });
    setModalOpen(true);
  };

  const openEdit = (d: Despesa) => {
    setEditingId(d.id);
    setForm({
      descricao: d.descricao,
      categoria: d.categoria,
      valor: String(d.valor),
      data_vencimento: d.data_vencimento,
      parcela_atual: d.parcela_atual ? String(d.parcela_atual) : "",
      parcela_total: d.parcela_total ? String(d.parcela_total) : "",
      observacoes: d.observacoes || "",
      recorrente: d.recorrente || false,
      frequencia_recorrencia: d.frequencia_recorrencia || "",
      parcelas_restantes: d.parcelas_restantes
        ? String(d.parcelas_restantes)
        : "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      descricao: form.descricao,
      categoria: form.categoria,
      valor: parseFloat(form.valor),
      data_vencimento: form.data_vencimento,
      parcela_atual: form.parcela_atual ? parseInt(form.parcela_atual) : null,
      parcela_total: form.parcela_total ? parseInt(form.parcela_total) : null,
      observacoes: form.observacoes || null,
      recorrente: form.recorrente,
      frequencia_recorrencia: form.recorrente
        ? form.frequencia_recorrencia
        : null,
      parcelas_restantes: form.recorrente
        ? form.parcelas_restantes
          ? parseInt(form.parcelas_restantes)
          : null
        : null,
      pago: false,
    };

    if (editingId) {
      await despesasAPI.atualizar(editingId, payload);
    } else {
      const result = await despesasAPI.criar(payload);
      if (Array.isArray(result) && result.length > 1) {
        alert(
          `${result.length} parcelas criadas automaticamente nos próximos meses!`,
        );
      }
    }
    setModalOpen(false);
    loadData();
  };

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta despesa?")) {
      await despesasAPI.deletar(id);
      loadData();
    }
  };

  const handleTogglePago = async (id: number) => {
    await despesasAPI.togglePago(id);
    loadData();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Despesas</h1>
          <p className="page-subtitle">Controle seus gastos e pagamentos</p>
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
          <button onClick={openCreate} className="btn-primary">
            <Plus size={16} />
            Nova Despesa
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-card stat-card-danger">
          <p
            className="text-sm font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            Total de Despesas
          </p>
          <p
            className="text-2xl font-extrabold tracking-tight mt-1"
            style={{ color: "var(--text-primary)" }}
          >
            {formatCurrency(totalDespesas)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {despesas.length} lançamentos
          </p>
        </div>
        <div className="stat-card stat-card-accent">
          <p
            className="text-sm font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            Pagas
          </p>
          <p className="text-2xl font-extrabold tracking-tight mt-1 text-accent-500">
            {formatCurrency(totalPagas)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {despesas.filter((d) => d.pago).length} itens
          </p>
        </div>
        <div className="stat-card stat-card-warn">
          <p
            className="text-sm font-medium"
            style={{ color: "var(--text-muted)" }}
          >
            Pendentes
          </p>
          <p className="text-2xl font-extrabold tracking-tight mt-1 text-warn-500">
            {formatCurrency(totalPendentes)}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {despesas.filter((d) => !d.pago).length} itens
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {(["todos", "pendente", "pago"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFiltro(f)}
            className={filtro === f ? "btn-primary" : "btn-secondary"}
          >
            {f === "todos" ? "Todos" : f === "pago" ? "Pagos" : "Pendentes"}
          </button>
        ))}

        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="input-field w-auto min-w-[220px]"
        >
          <option value="todas">Todas as Categorias</option>
          {categorias.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div
              className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin"
              style={{
                borderColor: "var(--brand)",
                borderTopColor: "transparent",
              }}
            />
          </div>
        ) : filtered.length === 0 ? (
          <div
            className="text-center py-16"
            style={{ color: "var(--text-muted)" }}
          >
            <TrendingDown size={48} className="mx-auto mb-4 opacity-30" />
            <p className="font-semibold">Nenhuma despesa encontrada</p>
            <p className="text-sm mt-1">
              Clique em "Nova Despesa" para adicionar
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <th
                    className="text-center py-3 px-3 text-xs font-bold uppercase tracking-wider w-12"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Status
                  </th>
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
                    Parcelas
                  </th>
                  <th
                    className="text-center py-3 px-4 text-xs font-bold uppercase tracking-wider"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((d) => (
                  <tr
                    key={d.id}
                    className={`transition-colors ${d.pago ? "opacity-60" : ""}`}
                    style={{ borderBottom: "1px solid var(--border-subtle)" }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "var(--bg-card-hover)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => handleTogglePago(d.id)}
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                          d.pago
                            ? "bg-emerald-500 border-emerald-500 text-white"
                            : "border-slate-300 hover:border-primary-400"
                        }`}
                      >
                        {d.pago && <Check size={12} />}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <p
                        className={`text-sm font-semibold ${d.pago ? "line-through" : ""}`}
                        style={{
                          color: d.pago
                            ? "var(--text-muted)"
                            : "var(--text-primary)",
                        }}
                      >
                        {d.descricao}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="badge badge-danger text-xs">
                        {d.categoria}
                      </span>
                    </td>
                    <td
                      className="py-3 px-4 text-sm font-bold text-right"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {formatCurrency(d.valor)}
                    </td>
                    <td
                      className="py-3 px-4 text-sm"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {formatDate(d.data_vencimento)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {d.parcela_atual && d.parcela_total ? (
                        <span className="badge badge-info text-xs">
                          {d.parcela_atual}/{d.parcela_total}
                        </span>
                      ) : (
                        <span
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          —
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEdit(d)}
                          className="btn-ghost px-2 py-1"
                        >
                          <Pencil size={14} className="text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(d.id)}
                          className="btn-ghost px-2 py-1"
                          style={{ color: "#f93a4a" }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingId ? "Editar Despesa" : "Nova Despesa"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Descrição
            </label>
            <input
              type="text"
              required
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="input-field"
              placeholder="Ex: Aluguel Apartamento"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Categoria
              </label>
              <select
                required
                value={form.categoria}
                onChange={(e) =>
                  setForm({ ...form, categoria: e.target.value })
                }
                className="input-field"
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                className="input-field"
                placeholder="0,00"
              />
            </div>
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Data de Vencimento
            </label>
            <input
              type="date"
              required
              value={form.data_vencimento}
              onChange={(e) =>
                setForm({ ...form, data_vencimento: e.target.value })
              }
              className="input-field"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Parcela Atual
              </label>
              <input
                type="number"
                min="1"
                value={form.parcela_atual}
                onChange={(e) =>
                  setForm({ ...form, parcela_atual: e.target.value })
                }
                className="input-field"
                placeholder="Ex: 3"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Total de Parcelas
              </label>
              <input
                type="number"
                min="1"
                value={form.parcela_total}
                onChange={(e) =>
                  setForm({ ...form, parcela_total: e.target.value })
                }
                className="input-field"
                placeholder="Ex: 10"
              />
            </div>
          </div>
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Observações
            </label>
            <textarea
              value={form.observacoes}
              onChange={(e) =>
                setForm({ ...form, observacoes: e.target.value })
              }
              className="input-field"
              rows={2}
              placeholder="Informações adicionais..."
            />
          </div>

          {/* Recorrente */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="recorrente"
              checked={form.recorrente}
              onChange={(e) =>
                setForm({ ...form, recorrente: e.target.checked })
              }
              className="w-4 h-4 text-red-600 bg-slate-100 border-slate-300 rounded focus:ring-red-500 focus:ring-2"
            />
            <label
              htmlFor="recorrente"
              className="text-sm font-medium"
              style={{ color: "var(--text-secondary)" }}
            >
              Despesa recorrente
            </label>
          </div>

          {form.recorrente && (
            <div
              className="grid grid-cols-2 gap-4 p-4 rounded-xl"
              style={{
                background: "rgba(249,58,74,0.06)",
                border: "1px solid rgba(249,58,74,0.18)",
              }}
            >
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Frequência
                </label>
                <select
                  value={form.frequencia_recorrencia}
                  onChange={(e) =>
                    setForm({ ...form, frequencia_recorrencia: e.target.value })
                  }
                  className="input-field"
                >
                  <option value="">Selecione...</option>
                  <option value="mensal">Mensal</option>
                  <option value="semanal">Semanal</option>
                  <option value="anual">Anual</option>
                </select>
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Parcelas restantes
                </label>
                <input
                  type="number"
                  min="1"
                  value={form.parcelas_restantes}
                  onChange={(e) =>
                    setForm({ ...form, parcelas_restantes: e.target.value })
                  }
                  className="input-field"
                  placeholder="Ex: 12"
                />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1">
              {editingId ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
