"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Check, Trash, AlertCircle, LayoutTemplate, Columns, FileSpreadsheet, X } from "lucide-react";
import { receitasAPI, despesasAPI, categoriasAPI } from "@/lib/api";
import { getCurrentMonth, getCurrentYear } from "@/lib/utils";
import MonthSelector from "@/components/MonthSelector";
import Modal from "@/components/Modal";

// --- Types for Principal API-based Sheet ---
interface RowData {
  _id: string;
  originalId: number | null;
  tipo: "receita" | "despesa";
  descricao: string;
  categoria: string;
  valor: number;
  data: string;
  pago: boolean | null;
  isNew: boolean;
  isSaving?: boolean;
  error?: string;
}

// --- Types for Custom LocalStorage Sheets ---
interface CustomColumn {
  id: string;
  name: string;
}

interface CustomSheet {
  id: string;
  name: string;
  columns: CustomColumn[];
  rows: Record<string, string>[]; // Must contain an '_id' key
}

const generateTempId = () => `id-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const formatToYMD = (dateString: string) => {
  if (!dateString) return "";
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) return dateString;
  try {
    const d = new Date(dateString);
    return d.toISOString().split("T")[0];
  } catch {
    return dateString;
  }
};

export default function PlanilhasPage() {
  // Global State
  const [activeTab, setActiveTab] = useState<string>("principal");
  
  // Principal Sheet State
  const [mes, setMes] = useState(getCurrentMonth());
  const [ano, setAno] = useState(getCurrentYear());
  const [rows, setRows] = useState<RowData[]>([]);
  const [loadingTop, setLoadingTop] = useState(true);
  const [catsReceita, setCatsReceita] = useState<string[]>([]);
  const [catsDespesa, setCatsDespesa] = useState<string[]>([]);

  // Custom Sheets State
  const [customSheets, setCustomSheets] = useState<CustomSheet[]>([]);
  
  // Modals
  const [modalNewPageOpen, setModalNewPageOpen] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  
  const [modalNewColOpen, setModalNewColOpen] = useState(false);
  const [newColName, setNewColName] = useState("");

  // --- LOCAL STORAGE SYNC FOR CUSTOM SHEETS ---
  useEffect(() => {
    const saved = localStorage.getItem("fincontrol_custom_sheets");
    if (saved) {
      try {
        setCustomSheets(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse custom sheets");
      }
    }
  }, []);

  const saveCustomSheets = (sheets: CustomSheet[]) => {
    setCustomSheets(sheets);
    localStorage.setItem("fincontrol_custom_sheets", JSON.stringify(sheets));
  };


  // --- PRINCIPAL SHEET LOGIC ---
  const loadData = useCallback(async () => {
    if (activeTab !== "principal") return;
    setLoadingTop(true);
    try {
      const [receitas, despesas, cReceita, cDespesa] = await Promise.all([
        receitasAPI.listar(mes, ano),
        despesasAPI.listar(mes, ano),
        categoriasAPI.receita(),
        categoriasAPI.despesa(),
      ]);

      setCatsReceita(cReceita);
      setCatsDespesa(cDespesa);

      const combinedRows: RowData[] = [];
      receitas.forEach((r: any) => {
        combinedRows.push({
          _id: `r-${r.id}`, originalId: r.id, tipo: "receita",
          descricao: r.descricao, categoria: r.categoria, valor: r.valor,
          data: formatToYMD(r.data), pago: null, isNew: false,
        });
      });
      despesas.forEach((d: any) => {
        combinedRows.push({
          _id: `d-${d.id}`, originalId: d.id, tipo: "despesa",
          descricao: d.descricao, categoria: d.categoria, valor: d.valor,
          data: formatToYMD(d.data_vencimento), pago: d.pago || false, isNew: false,
        });
      });

      combinedRows.sort((a, b) => a.data.localeCompare(b.data));
      setRows(combinedRows);
    } catch (e) {
      console.error(e);
    }
    setLoadingTop(false);
  }, [mes, ano, activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddPrincipalRow = () => {
    const newRow: RowData = {
      _id: generateTempId(), originalId: null, tipo: "despesa",
      descricao: "", categoria: catsDespesa[0] || "", valor: 0,
      data: new Date().toISOString().split("T")[0], pago: false, isNew: true,
    };
    setRows((prev) => [...prev, newRow]);
  };

  const updatePrincipalRowState = (id: string, updates: Partial<RowData>) => {
    setRows((prev) => prev.map((r) => (r._id === id ? { ...r, ...updates, error: undefined } : r)));
  };

  const handlePrincipalChange = (id: string, field: keyof RowData, value: any) => {
    setRows((prev) => prev.map((r) => {
      if (r._id !== id) return r;
      let newRow = { ...r, [field]: value };
      if (field === "tipo") {
        newRow.tipo = value;
        if (value === "receita") {
          newRow.categoria = catsReceita[0] || ""; newRow.pago = null;
        } else {
          newRow.categoria = catsDespesa[0] || ""; newRow.pago = false;
        }
      }
      return newRow;
    }));
  };

  const savePrincipalRow = async (row: RowData) => {
    if (!row.descricao || !row.data || !row.categoria) return;
    updatePrincipalRowState(row._id, { isSaving: true });
    try {
      const payload = {
        descricao: row.descricao, categoria: row.categoria,
        valor: typeof row.valor === "string" ? parseFloat(row.valor) : row.valor,
        data: row.data,
      };
      if (row.isNew) {
        if (row.tipo === "receita") {
          const res = await receitasAPI.criar(payload);
          updatePrincipalRowState(row._id, { originalId: res.id, _id: `r-${res.id}`, isNew: false, isSaving: false });
        } else {
          const despesaPayload = { ...payload, data_vencimento: row.data, pago: row.pago || false };
          const res = await despesasAPI.criar(despesaPayload);
          const createdId = Array.isArray(res) ? res[0].id : res.id;
          updatePrincipalRowState(row._id, { originalId: createdId, _id: `d-${createdId}`, isNew: false, isSaving: false });
        }
      } else {
        if (!row.originalId) throw new Error("Missing ID");
        if (row.tipo === "receita") {
          await receitasAPI.atualizar(row.originalId, payload);
        } else {
          const despesaPayload = { ...payload, data_vencimento: row.data };
          await despesasAPI.atualizar(row.originalId, despesaPayload);
        }
        updatePrincipalRowState(row._id, { isSaving: false });
      }
    } catch (error: any) {
      updatePrincipalRowState(row._id, { isSaving: false, error: error.message || "Erro ao salvar" });
      console.error(error);
    }
  };

  const togglePrincipalStatus = async (row: RowData) => {
    if (row.tipo !== "despesa" || row.isNew || !row.originalId) return;
    try {
      updatePrincipalRowState(row._id, { isSaving: true });
      await despesasAPI.togglePago(row.originalId);
      updatePrincipalRowState(row._id, { pago: !row.pago, isSaving: false });
    } catch (e: any) {
      updatePrincipalRowState(row._id, { isSaving: false, error: "Erro" });
    }
  };

  const deletePrincipalRow = async (row: RowData) => {
    if (row.isNew) { setRows((prev) => prev.filter((r) => r._id !== row._id)); return; }
    if (!confirm(`Tem certeza que deseja excluir ${row.descricao}?`)) return;
    try {
      updatePrincipalRowState(row._id, { isSaving: true });
      if (row.tipo === "receita") await receitasAPI.deletar(row.originalId as number);
      else await despesasAPI.deletar(row.originalId as number);
      setRows((prev) => prev.filter((r) => r._id !== row._id));
    } catch (e: any) {
      updatePrincipalRowState(row._id, { isSaving: false, error: "Erro ao excluir" });
    }
  };

  // --- CUSTOM SHEET LOGIC ---
  const handleCreatePage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName.trim()) return;
    const newSheet: CustomSheet = {
      id: generateTempId(),
      name: newPageName.trim(),
      columns: [{ id: "col_1", name: "Nova Coluna" }], // Start with 1 default col
      rows: []
    };
    saveCustomSheets([...customSheets, newSheet]);
    setNewPageName("");
    setModalNewPageOpen(false);
    setActiveTab(newSheet.id);
  };

  const handleDeletePage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir esta página inteira? A ação não pode ser desfeita.")) return;
    const filtered = customSheets.filter(s => s.id !== id);
    saveCustomSheets(filtered);
    if (activeTab === id) setActiveTab("principal");
  };

  const handleCreateColumn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColName.trim() || activeTab === "principal") return;
    
    const updated = customSheets.map(sheet => {
      if (sheet.id === activeTab) {
        return {
          ...sheet,
          columns: [...sheet.columns, { id: generateTempId(), name: newColName.trim() }]
        };
      }
      return sheet;
    });
    
    saveCustomSheets(updated);
    setNewColName("");
    setModalNewColOpen(false);
  };

  const handleDeleteColumn = (colId: string) => {
    if(!confirm("Remover esta coluna e todos os seus dados?")) return;
    const updated = customSheets.map(sheet => {
      if(sheet.id === activeTab) {
        return {
          ...sheet,
          columns: sheet.columns.filter(c => c.id !== colId),
          rows: sheet.rows.map(r => {
            const newRow = {...r};
            delete newRow[colId];
            return newRow;
          })
        };
      }
      return sheet;
    });
    saveCustomSheets(updated);
  }

  const handleAddCustomRow = (sheetId: string) => {
    const updated = customSheets.map(sheet => {
      if (sheet.id === sheetId) {
        return {
          ...sheet,
          rows: [...sheet.rows, { _id: generateTempId() }]
        };
      }
      return sheet;
    });
    saveCustomSheets(updated);
  };

  const handleCustomRowChange = (sheetId: string, rowId: string, colId: string, value: string) => {
    const updated = customSheets.map(sheet => {
      if (sheet.id === sheetId) {
        return {
          ...sheet,
          rows: sheet.rows.map(r => r._id === rowId ? { ...r, [colId]: value } : r)
        };
      }
      return sheet;
    });
    saveCustomSheets(updated);
  };

  const deleteCustomRow = (sheetId: string, rowId: string) => {
    const updated = customSheets.map(sheet => {
      if (sheet.id === sheetId) {
        return { ...sheet, rows: sheet.rows.filter(r => r._id !== rowId) };
      }
      return sheet;
    });
    saveCustomSheets(updated);
  };

  const activeCustomSheet = customSheets.find(s => s.id === activeTab);

  return (
    <div className="space-y-4 animate-fade-in h-screen flex flex-col pb-6 max-w-[100vw] overflow-x-hidden pt-2">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shrink-0 pr-4">
        <div>
          <h1 className="page-title leading-none">Planilhas</h1>
          <p className="page-subtitle mt-1">Configure suas abas e gerencie dados livremente</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === "principal" && (
            <MonthSelector mes={mes} ano={ano} onChange={(m, a) => { setMes(m); setAno(a); }} />
          )}

          {activeTab !== "principal" && (
            <button onClick={() => setModalNewColOpen(true)} className="btn-secondary h-10 px-4 whitespace-nowrap">
              <Columns size={16} /> <span className="hidden sm:inline">Adicionar Coluna</span>
            </button>
          )}

          <button
            onClick={() => activeTab === "principal" ? handleAddPrincipalRow() : handleAddCustomRow(activeTab)}
            className="btn-primary h-10 px-4 whitespace-nowrap"
          >
            <Plus size={16} /> <span className="hidden sm:inline">Nova Linha</span>
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-1 overflow-x-auto shrink-0 pb-1 scrollbar-hide border-b border-[#2a2d3e] pr-4">
        {/* Principal Tab */}
        <button
          onClick={() => setActiveTab("principal")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl text-sm font-medium transition-all min-w-max border-b-2 ${
            activeTab === "principal"
              ? "text-emerald-400 border-emerald-400 bg-emerald-400/10"
              : "text-slate-400 border-transparent hover:bg-[#ffffff08] hover:text-slate-200"
          }`}
        >
          <LayoutTemplate size={16} />
          Principal (Receitas/Despesas)
        </button>

        {/* Custom Tabs */}
        {customSheets.map(sheet => (
          <div key={sheet.id} className="relative group flex min-w-max">
            <button
              onClick={() => setActiveTab(sheet.id)}
              className={`flex items-center gap-2 pl-4 pr-8 py-2.5 rounded-t-xl text-sm font-medium transition-all border-b-2 ${
                activeTab === sheet.id
                  ? "text-blue-400 border-blue-400 bg-blue-400/10"
                  : "text-slate-400 border-transparent hover:bg-[#ffffff08] hover:text-slate-200"
              }`}
            >
              <FileSpreadsheet size={16} />
              {sheet.name}
            </button>
            <button 
              onClick={(e) => handleDeletePage(sheet.id, e)}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-md text-slate-500 hover:text-red-400 hover:bg-red-400/20 opacity-0 group-hover:opacity-100 transition-all"
            >
              <X size={12} />
            </button>
          </div>
        ))}

        {/* Add Tab Button */}
        <button
          onClick={() => setModalNewPageOpen(true)}
          className="flex items-center gap-2 px-3 py-2.5 ml-2 rounded-xl text-sm font-medium text-slate-400 hover:bg-[#ffffff08] hover:text-emerald-400 transition-all min-w-max border border-dashed border-slate-700 hover:border-emerald-500/50"
        >
          <Plus size={16} />
          Nova Aba
        </button>
      </div>

      {/* Spreadsheet Container */}
      <div className="glass-card flex-1 min-h-0 flex flex-col overflow-hidden relative shadow-lg mr-4 border-[#2a2d3e]">
        
        {/* RENDER PRINCIPAL SHEET */}
        {activeTab === "principal" && (
          loadingTop ? (
            <div className="flex items-center justify-center p-12 flex-1">
              <div className="w-8 h-8 border-4 border-t-transparent border-emerald-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="overflow-auto flex-1 w-full bg-[#0b0d14] rounded-xl">
              <table className="w-full text-sm text-left border-collapse min-w-[800px]">
                <thead className="sticky top-0 z-10 bg-[#16192b] shadow-sm">
                  <tr>
                    <th className="px-3 py-3 w-10 border-r border-b border-[#2a2d3e]"></th>
                    <th className="px-4 py-3 w-32 border-r border-b border-[#2a2d3e] text-xs uppercase tracking-wider text-slate-400">Tipo</th>
                    <th className="px-4 py-3 min-w-[200px] border-r border-b border-[#2a2d3e] text-xs uppercase tracking-wider text-slate-400">Descrição</th>
                    <th className="px-4 py-3 w-40 border-r border-b border-[#2a2d3e] text-xs uppercase tracking-wider text-slate-400">Data</th>
                    <th className="px-4 py-3 w-48 border-r border-b border-[#2a2d3e] text-xs uppercase tracking-wider text-slate-400">Categoria</th>
                    <th className="px-4 py-3 w-36 border-r border-b border-[#2a2d3e] text-xs uppercase tracking-wider text-slate-400">Valor</th>
                    <th className="px-4 py-3 w-28 text-center border-r border-b border-[#2a2d3e] text-xs uppercase tracking-wider text-slate-400">Status</th>
                    <th className="px-2 py-3 w-12 border-b border-[#2a2d3e]"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-16 text-slate-500">
                        Nenhuma linha encontrada. <button onClick={handleAddPrincipalRow} className="text-emerald-400 hover:underline">Criar agora</button>
                      </td>
                    </tr>
                  ) : (
                    rows.map((row, index) => {
                      const activeCategories = row.tipo === "receita" ? catsReceita : catsDespesa;
                      return (
                        <tr key={row._id} className={`group ${row.isSaving ? 'opacity-50' : ''} border-b border-[#2a2d3e]`}>
                          <td className="text-center text-xs text-slate-500 bg-[#16192b]/50 border-r border-[#2a2d3e]">{index + 1}</td>
                          <td className="p-0 border-r border-[#2a2d3e]">
                            <select disabled={!row.isNew} value={row.tipo} onChange={(e) => handlePrincipalChange(row._id, "tipo", e.target.value)} className="w-full h-full min-h-[44px] px-4 py-3 bg-transparent border-none outline-none appearance-none tracking-wide text-xs font-bold uppercase cursor-pointer" style={{ color: row.tipo === 'receita' ? '#10b981' : '#ef4444' }}>
                              <option value="receita" className="text-black">Receita</option>
                              <option value="despesa" className="text-black">Despesa</option>
                            </select>
                          </td>
                          <td className="p-0 border-r border-[#2a2d3e] relative">
                            <input type="text" value={row.descricao} placeholder="Descrição..." onChange={(e) => handlePrincipalChange(row._id, "descricao", e.target.value)} onBlur={() => {if(row.descricao) savePrincipalRow(row)}} className="w-full h-full min-h-[44px] px-4 py-3 bg-transparent border-none outline-none focus:bg-[#ffffff08] transition-colors text-slate-200" />
                            {row.error && <div title={row.error} className="absolute right-2 top-1/2 -translate-y-1/2"><AlertCircle size={14} className="text-red-500" /></div>}
                          </td>
                          <td className="p-0 border-r border-[#2a2d3e]">
                            <input type="date" value={row.data} onChange={(e) => handlePrincipalChange(row._id, "data", e.target.value)} onBlur={() => {if(row.descricao) savePrincipalRow(row)}} className="w-full h-full min-h-[44px] px-4 py-3 bg-transparent border-none outline-none focus:bg-[#ffffff08] text-slate-400 [&::-webkit-calendar-picker-indicator]:filter-invert" />
                          </td>
                          <td className="p-0 border-r border-[#2a2d3e]">
                            <select value={row.categoria} onChange={(e) => handlePrincipalChange(row._id, "categoria", e.target.value)} onBlur={() => {if(row.descricao) savePrincipalRow(row)}} className="w-full h-full min-h-[44px] px-4 py-3 bg-transparent border-none outline-none focus:bg-[#ffffff08] text-slate-200 cursor-pointer">
                              <option value="" disabled className="text-black">Selecione...</option>
                              {activeCategories.map((c) => (<option key={c} value={c} className="text-black">{c}</option>))}
                            </select>
                          </td>
                          <td className="p-0 border-r border-[#2a2d3e] relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-xs font-bold">R$</span>
                            <input type="number" step="0.01" value={row.valor} placeholder="0.00" onChange={(e) => handlePrincipalChange(row._id, "valor", e.target.value)} onBlur={() => {if(row.descricao) savePrincipalRow(row)}} className="w-full h-full min-h-[44px] py-3 pl-9 pr-4 bg-transparent border-none outline-none focus:bg-[#ffffff08] text-right font-bold text-slate-200" />
                          </td>
                          <td className="p-0 border-r border-[#2a2d3e] text-center align-middle">
                            {row.tipo === "despesa" ? (
                              <button onClick={() => togglePrincipalStatus(row)} disabled={row.isNew} className={`mx-auto w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${row.pago ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-600 hover:border-emerald-400"} ${row.isNew ? 'opacity-30' : ''}`}>
                                {row.pago && <Check size={14} strokeWidth={3} />}
                              </button>
                            ) : <span className="text-slate-600 w-full h-full min-h-[44px] flex items-center justify-center">—</span>}
                          </td>
                          <td className="p-0 text-center">
                            <button onClick={() => deletePrincipalRow(row)} className="mx-auto w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg"><Trash size={15} /></button>
                          </td>
                        </tr>
                      )
                    })
                  )}
                  <tr>
                    <td colSpan={8} className="p-0">
                      <button onClick={handleAddPrincipalRow} className="w-full text-left py-3 px-6 text-sm text-emerald-500/80 hover:bg-emerald-500/10 transition-colors border-b-transparent outline-none flex items-center gap-2 font-medium">
                        <Plus size={16} /> Nova Linha
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          )
        )}

        {/* RENDER CUSTOM SHEETS */}
        {activeTab !== "principal" && activeCustomSheet && (
          <div className="overflow-auto flex-1 w-full bg-[#0b0d14] rounded-xl flex flex-col">
            <table className="w-full text-sm text-left border-collapse min-w-max">
              <thead className="sticky top-0 z-10 bg-[#16192b] shadow-sm">
                <tr>
                  <th className="px-3 py-3 w-10 border-r border-b border-[#2a2d3e]"></th>
                  {activeCustomSheet.columns.map(col => (
                    <th key={col.id} className="px-4 py-3 min-w-[200px] border-r border-b border-[#2a2d3e] text-xs uppercase tracking-wider text-slate-400 group relative">
                      {col.name}
                      <button onClick={() => handleDeleteColumn(col.id)} className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:bg-red-500/10 hover:text-red-400 rounded transition-all">
                        <Trash size={12}/>
                      </button>
                    </th>
                  ))}
                  <th className="px-2 py-3 w-12 border-b border-[#2a2d3e]"></th>
                </tr>
              </thead>
              <tbody>
                {activeCustomSheet.rows.length === 0 ? (
                  <tr>
                    <td colSpan={activeCustomSheet.columns.length + 2} className="text-center py-16 text-slate-500">
                      Nenhuma linha nesta planilha personalizada. <br/>
                      <button onClick={() => handleAddCustomRow(activeCustomSheet.id)} className="text-blue-400 hover:underline mt-2 inline-flex items-center gap-1"><Plus size={14}/> Adicionar primeira linha</button>
                    </td>
                  </tr>
                ) : (
                  activeCustomSheet.rows.map((row, index) => (
                    <tr key={row._id} className="group border-b border-[#2a2d3e] transition-colors hover:bg-[#ffffff04]">
                      <td className="text-center text-xs text-slate-500 bg-[#16192b]/50 border-r border-[#2a2d3e]">{index + 1}</td>
                      {activeCustomSheet.columns.map(col => (
                        <td key={col.id} className="p-0 border-r border-[#2a2d3e]">
                          <input 
                            type="text" 
                            value={row[col.id] || ""} 
                            onChange={(e) => handleCustomRowChange(activeCustomSheet.id, row._id, col.id, e.target.value)}
                            className="w-full h-full min-h-[44px] px-4 py-3 bg-transparent border-none outline-none focus:bg-[#ffffff08] text-slate-200 transition-colors"
                          />
                        </td>
                      ))}
                      <td className="p-0 text-center">
                         <button onClick={() => deleteCustomRow(activeCustomSheet.id, row._id)} className="mx-auto w-8 h-8 flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg"><Trash size={15} /></button>
                      </td>
                    </tr>
                  ))
                )}
                <tr>
                  <td colSpan={activeCustomSheet.columns.length + 2} className="p-0 border-t border-[#2a2d3e]">
                    <button onClick={() => handleAddCustomRow(activeCustomSheet.id)} className="w-full text-left py-3 px-6 text-sm text-blue-400/80 hover:bg-blue-400/10 transition-colors border-b-transparent outline-none flex items-center gap-2 font-medium">
                      <Plus size={16} /> Nova Linha
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* --- MODALS --- */}
      
      {/* Modal Nova Página */}
      <Modal isOpen={modalNewPageOpen} onClose={() => setModalNewPageOpen(false)} title="Nova Planilha">
        <form onSubmit={handleCreatePage} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Aba</label>
            <input 
              required autoFocus type="text" value={newPageName} 
              onChange={(e) => setNewPageName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-black"
              placeholder="Ex: Metas 2026"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalNewPageOpen(false)} className="flex-1 btn-secondary text-slate-700 border-slate-300 hover:bg-slate-100">Cancelar</button>
            <button type="submit" className="flex-1 btn-primary">Criar Planilha</button>
          </div>
        </form>
      </Modal>

      {/* Modal Nova Coluna */}
      <Modal isOpen={modalNewColOpen} onClose={() => setModalNewColOpen(false)} title="Nova Coluna">
        <form onSubmit={handleCreateColumn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Regra / Coluna</label>
            <input 
              required autoFocus type="text" value={newColName} 
              onChange={(e) => setNewColName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-black"
              placeholder="Ex: Observação Extra"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setModalNewColOpen(false)} className="flex-1 btn-secondary text-slate-700 border-slate-300 hover:bg-slate-100">Cancelar</button>
            <button type="submit" className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl py-2.5 transition-colors">Adicionar</button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
