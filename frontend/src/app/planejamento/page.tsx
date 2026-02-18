"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Trash2,
  Target,
  PiggyBank,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { orcamentoAPI, metasAPI, categoriasAPI } from "@/lib/api";
import { formatCurrency, getCurrentMonth, getCurrentYear } from "@/lib/utils";
import MonthSelector from "@/components/MonthSelector";
import Modal from "@/components/Modal";

interface OrcamentoResumo {
  id: number;
  categoria: string;
  limite: number;
  gasto: number;
  restante: number;
  percentual: number;
}

interface MetaItem {
  id: number;
  descricao: string;
  valor_alvo: number;
  valor_atual: number;
  prazo: string | null;
  concluida: boolean;
}

export default function PlanejamentoPage() {
  const [mes, setMes] = useState(getCurrentMonth());
  const [ano, setAno] = useState(getCurrentYear());
  const [orcamentos, setOrcamentos] = useState<OrcamentoResumo[]>([]);
  const [metas, setMetas] = useState<MetaItem[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalOrc, setModalOrc] = useState(false);
  const [formOrc, setFormOrc] = useState({ categoria: "", limite: "" });

  const [modalMeta, setModalMeta] = useState(false);
  const [editingMetaId, setEditingMetaId] = useState<number | null>(null);
  const [formMeta, setFormMeta] = useState({
    descricao: "",
    valor_alvo: "",
    valor_atual: "",
    prazo: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [orc, met, cats] = await Promise.all([
        orcamentoAPI.resumo(mes, ano),
        metasAPI.listar(),
        categoriasAPI.despesa(),
      ]);
      setOrcamentos(orc);
      setMetas(met);
      setCategorias(cats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [mes, ano]);

  const handleCreateOrc = async (e: React.FormEvent) => {
    e.preventDefault();
    await orcamentoAPI.criar({
      categoria: formOrc.categoria,
      limite: parseFloat(formOrc.limite),
      mes,
      ano,
    });
    setModalOrc(false);
    setFormOrc({ categoria: "", limite: "" });
    loadData();
  };

  const handleDeleteOrc = async (id: number) => {
    if (confirm("Remover este orçamento?")) {
      await orcamentoAPI.deletar(id);
      loadData();
    }
  };

  const openCreateMeta = () => {
    setEditingMetaId(null);
    setFormMeta({ descricao: "", valor_alvo: "", valor_atual: "", prazo: "" });
    setModalMeta(true);
  };

  const openEditMeta = (m: MetaItem) => {
    setEditingMetaId(m.id);
    setFormMeta({
      descricao: m.descricao,
      valor_alvo: String(m.valor_alvo),
      valor_atual: String(m.valor_atual),
      prazo: m.prazo || "",
    });
    setModalMeta(true);
  };

  const handleSubmitMeta = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      descricao: formMeta.descricao,
      valor_alvo: parseFloat(formMeta.valor_alvo),
      valor_atual: parseFloat(formMeta.valor_atual) || 0,
      prazo: formMeta.prazo || null,
    };
    if (editingMetaId) {
      await metasAPI.atualizar(editingMetaId, payload);
    } else {
      await metasAPI.criar(payload);
    }
    setModalMeta(false);
    loadData();
  };

  const handleToggleMeta = async (m: MetaItem) => {
    await metasAPI.atualizar(m.id, { concluida: !m.concluida });
    loadData();
  };

  const handleDeleteMeta = async (id: number) => {
    if (confirm("Remover esta meta?")) {
      await metasAPI.deletar(id);
      loadData();
    }
  };

  const getBarColor = (pct: number) => {
    if (pct >= 100) return "bg-red-500";
    if (pct >= 80) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const totalLimite = orcamentos.reduce((s, o) => s + o.limite, 0);
  const totalGasto = orcamentos.reduce((s, o) => s + o.gasto, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Planejamento</h1>
          <p className="page-subtitle">
            Orçamentos por categoria e metas financeiras
          </p>
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
      ) : (
        <>
          {/* ========== ORÇAMENTO ========== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <PiggyBank size={20} className="text-primary-600" />
                Orçamento por Categoria
              </h2>
              <button
                onClick={() => {
                  setFormOrc({ categoria: categorias[0] || "", limite: "" });
                  setModalOrc(true);
                }}
                className="btn-primary"
              >
                <Plus size={16} />
                Definir Limite
              </button>
            </div>

            {/* Summary bar */}
            {orcamentos.length > 0 && (
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-sm font-medium"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Orçamento Total
                  </span>
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {formatCurrency(totalGasto)} / {formatCurrency(totalLimite)}
                  </span>
                </div>
                <div
                  className="w-full rounded-full h-3"
                  style={{ background: "var(--bg-elevated)" }}
                >
                  <div
                    className={`h-3 rounded-full transition-all ${getBarColor(totalLimite > 0 ? (totalGasto / totalLimite) * 100 : 0)}`}
                    style={{
                      width: `${Math.min((totalGasto / (totalLimite || 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
                <p
                  className="text-xs mt-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  {totalLimite > totalGasto
                    ? `Restam ${formatCurrency(totalLimite - totalGasto)} no orçamento`
                    : `Orçamento excedido em ${formatCurrency(totalGasto - totalLimite)}`}
                </p>
              </div>
            )}

            {/* Budget cards */}
            {orcamentos.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {orcamentos.map((orc) => (
                  <div key={orc.id} className="glass-card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className="text-sm font-semibold"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {orc.categoria}
                      </span>
                      <button
                        onClick={() => handleDeleteOrc(orc.id)}
                        className="p-1 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={14} className="text-red-400" />
                      </button>
                    </div>
                    <div className="flex items-end justify-between mb-2">
                      <span
                        className="text-lg font-extrabold tracking-tight"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {formatCurrency(orc.gasto)}
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        de {formatCurrency(orc.limite)}
                      </span>
                    </div>
                    <div
                      className="w-full rounded-full h-2.5"
                      style={{ background: "var(--bg-elevated)" }}
                    >
                      <div
                        className={`h-2.5 rounded-full transition-all ${getBarColor(orc.percentual)}`}
                        style={{ width: `${Math.min(orc.percentual, 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span
                        className={`text-xs font-medium ${orc.percentual >= 100 ? "text-red-600" : orc.percentual >= 80 ? "text-amber-600" : "text-emerald-600"}`}
                      >
                        {orc.percentual}%
                      </span>
                      <span
                        className="text-xs"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {orc.restante >= 0
                          ? `Restam ${formatCurrency(orc.restante)}`
                          : `Excedido ${formatCurrency(Math.abs(orc.restante))}`}
                      </span>
                    </div>
                    {orc.percentual >= 80 && orc.percentual < 100 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                        <AlertTriangle size={12} />
                        Próximo do limite
                      </div>
                    )}
                    {orc.percentual >= 100 && (
                      <div className="flex items-center gap-1 mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded-lg">
                        <AlertTriangle size={12} />
                        Limite excedido!
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="glass-card p-10 text-center">
                <PiggyBank size={48} className="mx-auto text-slate-300 mb-4" />
                <p
                  className="font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Nenhum orçamento definido
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Defina limites de gastos por categoria para controlar melhor
                  suas despesas
                </p>
              </div>
            )}
          </div>

          {/* ========== METAS ========== */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Target size={20} className="text-purple-600" />
                Metas Financeiras
              </h2>
              <button
                onClick={openCreateMeta}
                className="btn-primary"
                style={{
                  background: "linear-gradient(135deg, #8b5cf6, #3366ff)",
                }}
              >
                <Plus size={16} />
                Nova Meta
              </button>
            </div>

            {metas.length > 0 ? (
              <div className="space-y-3">
                {metas.map((m) => {
                  const pct =
                    m.valor_alvo > 0 ? (m.valor_atual / m.valor_alvo) * 100 : 0;
                  return (
                    <div
                      key={m.id}
                      className={`glass-card p-5 ${m.concluida ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleToggleMeta(m)}
                            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                              m.concluida
                                ? "bg-emerald-500 border-emerald-500 text-white"
                                : "border-slate-300 hover:border-purple-400"
                            }`}
                          >
                            {m.concluida && <CheckCircle2 size={14} />}
                          </button>
                          <div>
                            <p
                              className={`font-semibold text-slate-700 ${m.concluida ? "line-through" : ""}`}
                            >
                              {m.descricao}
                            </p>
                            {m.prazo && (
                              <p className="text-xs text-slate-400 mt-0.5">
                                Prazo:{" "}
                                {new Date(m.prazo).toLocaleDateString("pt-BR")}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditMeta(m)}
                            className="text-xs text-primary-600 hover:underline px-2 py-1"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteMeta(m.id)}
                            className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} className="text-red-400" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-end justify-between mb-2">
                        <span
                          className="text-sm font-extrabold tracking-tight"
                          style={{ color: "var(--text-primary)" }}
                        >
                          {formatCurrency(m.valor_atual)}
                        </span>
                        <span
                          className="text-xs"
                          style={{ color: "var(--text-muted)" }}
                        >
                          de {formatCurrency(m.valor_alvo)}
                        </span>
                      </div>
                      <div
                        className="w-full rounded-full h-2.5"
                        style={{ background: "var(--bg-elevated)" }}
                      >
                        <div
                          className="h-2.5 rounded-full bg-purple-500 transition-all"
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <p
                        className="text-xs mt-1.5 text-right"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {pct.toFixed(1)}% concluído
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="glass-card p-10 text-center">
                <Target size={48} className="mx-auto text-slate-300 mb-4" />
                <p
                  className="font-semibold"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Nenhuma meta definida
                </p>
                <p
                  className="text-sm mt-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  Crie metas financeiras para acompanhar seus objetivos
                </p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Modal Orçamento */}
      <Modal
        isOpen={modalOrc}
        onClose={() => setModalOrc(false)}
        title="Definir Limite de Orçamento"
      >
        <form onSubmit={handleCreateOrc} className="space-y-4">
          <div>
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: "var(--text-secondary)" }}
            >
              Categoria
            </label>
            <select
              required
              value={formOrc.categoria}
              onChange={(e) =>
                setFormOrc({ ...formOrc, categoria: e.target.value })
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
              Limite Mensal (R$)
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formOrc.limite}
              onChange={(e) =>
                setFormOrc({ ...formOrc, limite: e.target.value })
              }
              className="input-field"
              placeholder="0,00"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOrc(false)}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary flex-1">
              Salvar
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Meta */}
      <Modal
        isOpen={modalMeta}
        onClose={() => setModalMeta(false)}
        title={editingMetaId ? "Editar Meta" : "Nova Meta"}
      >
        <form onSubmit={handleSubmitMeta} className="space-y-4">
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
              value={formMeta.descricao}
              onChange={(e) =>
                setFormMeta({ ...formMeta, descricao: e.target.value })
              }
              className="input-field"
              placeholder="Ex: Reserva de emergência"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Valor Alvo (R$)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formMeta.valor_alvo}
                onChange={(e) =>
                  setFormMeta({ ...formMeta, valor_alvo: e.target.value })
                }
                className="input-field"
                placeholder="0,00"
              />
            </div>
            <div>
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "var(--text-secondary)" }}
              >
                Valor Atual (R$)
              </label>
              <input
                type="number"
                step="0.01"
                value={formMeta.valor_atual}
                onChange={(e) =>
                  setFormMeta({ ...formMeta, valor_atual: e.target.value })
                }
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
              Prazo
            </label>
            <input
              type="date"
              value={formMeta.prazo}
              onChange={(e) =>
                setFormMeta({ ...formMeta, prazo: e.target.value })
              }
              className="input-field"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalMeta(false)}
              className="btn-secondary flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-primary flex-1"
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #3366ff)",
              }}
            >
              {editingMetaId ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
