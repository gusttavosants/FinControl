"use client";

import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, TrendingUp } from "lucide-react";
import { receitasAPI, categoriasAPI } from "@/lib/api";
import {
  formatCurrency,
  formatDate,
  getCurrentMonth,
  getCurrentYear,
} from "@/lib/utils";
import MonthSelector from "@/components/MonthSelector";
import Modal from "@/components/Modal";

interface Receita {
  id: number;
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  observacoes: string | null;
}

export default function ReceitasPage() {
  const [mes, setMes] = useState(getCurrentMonth());
  const [ano, setAno] = useState(getCurrentYear());
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todas");

  const [form, setForm] = useState({
    descricao: "",
    categoria: "",
    valor: "",
    data: "",
    observacoes: "",
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, cats] = await Promise.all([
        receitasAPI.listar(mes, ano),
        categoriasAPI.receita(),
      ]);
      setReceitas(data);
      setCategorias(cats);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [mes, ano]);

  const filteredReceitas = receitas.filter((r) => {
    if (categoriaFiltro === "todas") return true;
    return r.categoria === categoriaFiltro;
  });

  const totalReceitas = filteredReceitas.reduce((sum, r) => sum + r.valor, 0);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      descricao: "",
      categoria: categorias[0] || "",
      valor: "",
      data: "",
      observacoes: "",
    });
    setModalOpen(true);
  };

  const openEdit = (r: Receita) => {
    setEditingId(r.id);
    setForm({
      descricao: r.descricao,
      categoria: r.categoria,
      valor: String(r.valor),
      data: r.data,
      observacoes: r.observacoes || "",
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      descricao: form.descricao,
      categoria: form.categoria,
      valor: parseFloat(form.valor),
      data: form.data,
      observacoes: form.observacoes || null,
    };

    if (editingId) {
      await receitasAPI.atualizar(editingId, payload);
    } else {
      await receitasAPI.criar(payload);
    }
    setModalOpen(false);
    loadData();
  };

  const handleDelete = async (id: number) => {
    if (confirm("Tem certeza que deseja excluir esta receita?")) {
      await receitasAPI.deletar(id);
      loadData();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Receitas</h1>
          <p className="text-sm text-[#a1a7b8] mt-1">
            Gerencie suas fontes de renda
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
          <button
            onClick={openCreate}
            className="flex items-center gap-2 bg-[#a3e635] text-[#0b0d14] px-4 py-2 rounded-xl text-sm font-semibold hover:bg-[#84cc16] transition-colors"
          >
            <Plus size={16} />
            Nova Receita
          </button>
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-gradient-to-br from-emerald-500/20 to-teal-600/10 rounded-2xl p-6 border border-emerald-500/20">
        <div className="flex items-center gap-3 mb-2">
          <TrendingUp size={24} className="text-emerald-400" />
          <span className="text-sm font-medium text-emerald-400">
            Total de Receitas do Mês
          </span>
        </div>
        <p className="text-3xl font-bold text-white">
          {formatCurrency(totalReceitas)}
        </p>
        <p className="text-sm text-[#6b7280] mt-1">
          {receitas.length} lançamentos
        </p>
      </div>

      {/* Filtro por Categoria */}
      <div className="flex gap-2 flex-wrap">
        <select
          value={categoriaFiltro}
          onChange={(e) => setCategoriaFiltro(e.target.value)}
          className="px-4 py-2 rounded-xl text-sm font-medium bg-[#1a1d2e] text-[#a1a7b8] border border-[#2a2d3e] hover:bg-[#1f2237] focus:outline-none focus:ring-2 focus:ring-[#a3e635]/30 focus:border-[#a3e635]"
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
      <div className="bg-[#1a1d2e] rounded-2xl border border-[#2a2d3e] overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#a3e635]" />
          </div>
        ) : filteredReceitas.length === 0 ? (
          <div className="text-center py-16">
            <TrendingUp size={48} className="mx-auto text-[#6b7280] mb-4" />
            <p className="text-[#a1a7b8] font-medium">
              Nenhuma receita encontrada
            </p>
            <p className="text-sm text-[#6b7280] mt-1">
              Clique em "Nova Receita" para adicionar
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
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
                    Data
                  </th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-slate-400 uppercase">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredReceitas.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-slate-50 hover:bg-slate-50 transition-colors"
                  >
                    <td className="py-3 px-4 text-sm font-medium text-slate-700">
                      {r.descricao}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                        {r.categoria}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm font-semibold text-emerald-600 text-right">
                      {formatCurrency(r.valor)}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {formatDate(r.data)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(r)}
                          className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          <Pencil size={14} className="text-slate-400" />
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={14} className="text-red-400" />
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
        title={editingId ? "Editar Receita" : "Nova Receita"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Descrição
            </label>
            <input
              type="text"
              required
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              placeholder="Ex: Salário Mensal"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Categoria
              </label>
              <select
                required
                value={form.categoria}
                onChange={(e) =>
                  setForm({ ...form, categoria: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Valor (R$)
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={form.valor}
                onChange={(e) => setForm({ ...form, valor: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                placeholder="0,00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Data
            </label>
            <input
              type="date"
              required
              value={form.data}
              onChange={(e) => setForm({ ...form, data: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Observações
            </label>
            <textarea
              value={form.observacoes}
              onChange={(e) =>
                setForm({ ...form, observacoes: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
              rows={3}
              placeholder="Informações adicionais..."
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="flex-1 px-4 py-2.5 border border-[#2a2d3e] rounded-xl text-sm font-medium text-[#a1a7b8] hover:bg-[#242740] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-[#a3e635] text-[#0b0d14] rounded-xl text-sm font-semibold hover:bg-[#84cc16] transition-colors"
            >
              {editingId ? "Salvar" : "Criar"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
