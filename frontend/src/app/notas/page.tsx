"use client";

import { useState, useEffect, useCallback, useMemo, memo } from "react";
import { 
  Plus, Search, Trash2, ChevronLeft, Calendar, 
  StickyNote, MoreVertical, Layout, List as ListIcon,
  Clock, Share2, Archive, Star, CheckCircle2,
  Paperclip, Image as ImageIcon, Type, Palette,
  TrendingUp, TrendingDown
} from "lucide-react";
import { notesAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface Note {
  id: number;
  title: string;
  content: string;
  color: string;
  updated_at: string;
  is_financial: boolean;
}

const COLORS = [
  { name: "yellow", bg: "bg-amber-100", border: "border-amber-200", dot: "bg-amber-400" },
  { name: "blue", bg: "bg-blue-100", border: "border-blue-200", dot: "bg-blue-400" },
  { name: "green", bg: "bg-emerald-100", border: "border-emerald-200", dot: "bg-emerald-400" },
  { name: "rose", bg: "bg-rose-100", border: "border-rose-200", dot: "bg-rose-400" },
  { name: "purple", bg: "bg-purple-100", border: "border-purple-200", dot: "bg-purple-400" },
];

const NoteItem = memo(({ note, isSelected, onSelect, onDelete }: { 
  note: Note, 
  isSelected: boolean, 
  onSelect: (n: Note) => void,
  onDelete: (id: number) => void 
}) => {
  return (
    <div
      onClick={() => onSelect(note)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(note); }}
      role="button"
      tabIndex={0}
      className={`w-full p-5 rounded-[24px] text-left transition-all duration-300 group flex gap-4 cursor-pointer outline-none ${isSelected ? 'bg-brand text-white shadow-xl shadow-brand/20' : 'hover:bg-white dark:hover:bg-white/5'}`}
    >
      <div className={`w-1.5 h-auto rounded-full ${COLORS.find(c => c.name === note.color)?.dot || 'bg-amber-400'}`} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h3 className={`font-black text-base truncate ${isSelected ? 'text-white' : 'text-primary'}`}>
            {note.title || "Sem título"}
          </h3>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onDelete(note.id);
            }}
            className={`p-1.5 rounded-lg transition-all ${isSelected ? 'hover:bg-white/20 text-white/40 hover:text-white' : 'hover:bg-rose-500/10 text-transparent group-hover:text-rose-500'}`}
          >
            <Trash2 size={14} />
          </button>
        </div>
        <p className={`text-xs truncate mb-2 ${isSelected ? 'text-white/60' : 'text-muted'}`}>
          {note.content || "Nenhum conteúdo adicional..."}
        </p>
        <p className={`text-[10px] font-black uppercase tracking-widest ${isSelected ? 'text-white/40' : 'opacity-30'}`}>
          {formatDate(note.updated_at)}
        </p>
      </div>
    </div>
  );
});

NoteItem.displayName = "NoteItem";

export default function NotesPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isMobileView, setIsMobileView] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [extractedData, setExtractedData] = useState<any[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [idToDelete, setIdToDelete] = useState<number | null>(null);

  const [form, setForm] = useState({ title: "", content: "", color: "yellow", is_financial: false });

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await notesAPI.listar();
      setNotes(data);
    } catch (e) {
      console.error("Error loading notes:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotes();
    const handleResize = () => setIsMobileView(window.innerWidth < 1024);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [loadNotes]);

  const handleSelect = useCallback((note: Note) => {
    setSelectedId(note.id);
    setForm({ 
      title: note.title || "", 
      content: note.content || "", 
      color: note.color || "yellow",
      is_financial: note.is_financial || false
    });
    setExtractedData([]);
    if (window.innerWidth < 1024) setIsEditing(true);
  }, []);

  const handleCreate = async () => {
    try {
      const newNote = await notesAPI.criar({ title: "Nova Nota", content: "", color: "yellow", is_financial: false });
      setNotes([newNote, ...notes]);
      setSelectedId(newNote.id);
      setForm({ title: "Nova Nota", content: "", color: "yellow", is_financial: false });
      if (isMobileView) setIsEditing(true);
    } catch (e) {
      console.error("Error creating note:", e);
    }
  };

  const handleUpdate = async () => {
    if (!selectedId) return;
    setSyncing(true);
    try {
      const updated = await notesAPI.atualizar(selectedId, form);
      // We don't want to refresh the entire notes list every time to avoid lag
      setNotes(prev => prev.map(n => n.id === selectedId ? { ...n, ...updated } : n));
    } catch (e) {
      console.error("Error updating note:", e);
    } finally {
      setSyncing(false);
    }
  };

  const openDeleteModal = useCallback((id: number) => {
    setIdToDelete(id);
    setShowDeleteModal(true);
  }, []);

  const handleDelete = async () => {
    if (!idToDelete) return;
    try {
      await notesAPI.deletar(idToDelete);
      setNotes(prev => prev.filter(n => n.id !== idToDelete));
      setSelectedId(curr => curr === idToDelete ? null : curr);
      setIsEditing(curr => curr && selectedId === idToDelete ? false : curr);
      setShowDeleteModal(false);
      setIdToDelete(null);
    } catch (e) {
      console.error("Error deleting note:", e);
    }
  };

  const handleProcess = async () => {
    if (!selectedId) return;
    setProcessing(true);
    try {
      const result = await notesAPI.processar(selectedId);
      setExtractedData(result.data);
      if (result.data.length === 0) {
        alert("Nenhum dado financeiro identificado na nota.");
      }
    } catch (e) {
      console.error("Error processing note:", e);
    } finally {
      setProcessing(false);
    }
  };

  // Debounced auto-save effect
  useEffect(() => {
    if (!selectedId) return;
    const timer = setTimeout(() => {
      const original = notes.find(n => n.id === selectedId);
      if (original && (
        original.title !== form.title || 
        original.content !== form.content || 
        original.is_financial !== form.is_financial ||
        original.color !== form.color
      )) {
        handleUpdate();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [form.title, form.content, form.is_financial, form.color, selectedId, notes]);

  const filteredNotes = useMemo(() => {
    return notes.filter(n => 
      n.title?.toLowerCase().includes(search.toLowerCase()) || 
      n.content?.toLowerCase().includes(search.toLowerCase())
    );
  }, [notes, search]);

  const currentColor = COLORS.find(c => c.name === form.color) || COLORS[0];

  return (
    <div className="flex h-[calc(100vh-2rem)] lg:h-[calc(100vh-100px)] overflow-hidden glass-card !p-0 shadow-2xl border-white/10">
      
      {/* ── Sidebar / List View ── */}
      <div className={`flex flex-col w-full lg:w-[380px] border-r border-white/5 bg-white/50 dark:bg-black/20 backdrop-blur-xl ${isMobileView && isEditing ? 'hidden' : 'flex'}`}>
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-black tracking-tighter" style={{ color: "var(--text-primary)" }}>Notas</h1>
            <button onClick={handleCreate} className="w-10 h-10 rounded-full bg-brand text-white flex items-center justify-center shadow-lg shadow-brand/20 active:scale-95 transition-all">
              <Plus size={22} strokeWidth={3} />
            </button>
          </div>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-100 transition-opacity" size={16} />
            <input 
              type="text" 
              placeholder="Buscar em todas as notas..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white dark:bg-white/5 border border-white/10 rounded-2xl text-sm outline-none focus:ring-2 focus:ring-brand/20 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 space-y-1 scrollbar-none pb-10">
          {loading ? (
            <div className="p-10 space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="skeleton h-20 w-full rounded-2xl" />
              ))}
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="p-10 text-center space-y-4 opacity-30">
              <StickyNote size={48} className="mx-auto" />
              <p className="text-sm font-bold uppercase tracking-widest">Nenhuma nota encontrada</p>
            </div>
          ) : (
            filteredNotes.map(note => (
              <NoteItem 
                key={note.id} 
                note={note} 
                isSelected={selectedId === note.id} 
                onSelect={handleSelect}
                onDelete={openDeleteModal}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Editor View ── */}
      <div className={`flex-1 flex flex-col bg-white/30 dark:bg-[#0a0a0b]/40 backdrop-blur-sm relative ${isMobileView && !isEditing ? 'hidden' : 'flex'}`}>
        {!selectedId ? (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-6 opacity-30">
            <div className="w-24 h-24 rounded-[32px] bg-brand/10 flex items-center justify-center text-brand">
              <Layout size={40} />
            </div>
            <div>
              <h2 className="text-2xl font-black mb-2">Selecione uma nota</h2>
              <p className="text-sm font-medium">Ou crie uma nova para começar a organizar suas ideias.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Editor Top Bar */}
            <div className="p-4 lg:p-6 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                {isMobileView && (
                  <button onClick={() => setIsEditing(false)} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
                    <ChevronLeft size={24} />
                  </button>
                )}
                <div className="flex items-center gap-2">
                  <Clock size={14} className="opacity-30" />
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30">
                    Editado em {formatDate(notes.find(n => n.id === selectedId)?.updated_at || "")}
                  </span>
                  {syncing && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-2" />}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {form.is_financial && (
                  <button 
                    onClick={handleProcess}
                    disabled={processing}
                    className="flex items-center gap-2 px-4 py-2 bg-brand/10 text-brand rounded-xl font-bold text-xs hover:bg-brand/20 transition-all active:scale-95 disabled:opacity-50"
                  >
                    {processing ? <div className="w-3 h-3 border-2 border-brand border-t-transparent rounded-full animate-spin" /> : <Plus size={14} />}
                    Sincronizar
                  </button>
                )}
                <button className="p-2 hover:bg-white/10 rounded-xl transition-colors opacity-60 hover:opacity-100">
                  <Share2 size={20} />
                </button>
                <button onClick={() => openDeleteModal(selectedId)} className="p-2 hover:bg-rose-500/10 text-rose-500 rounded-xl transition-colors">
                  <Trash2 size={20} />
                </button>
                <button className="p-2 hover:bg-white/10 rounded-xl transition-colors opacity-60 hover:opacity-100">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Note Interface */}
            <div className="flex-1 overflow-y-auto p-6 lg:p-12 space-y-10 scrollbar-thin">
              <div className="max-w-3xl mx-auto space-y-8">
                
                {/* AI / System Reading Toggle */}
                <div className="flex items-center justify-between p-4 rounded-3xl bg-brand/5 border border-brand/10 group hover:bg-brand/10 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-brand text-white flex items-center justify-center shadow-lg shadow-brand/20">
                      <Layout size={24} />
                    </div>
                    <div>
                      <h4 className="text-sm font-black uppercase tracking-widest text-brand">Leitura do Sistema</h4>
                      <p className="text-xs text-muted">Permitir que o sistema leia dados financeiros nesta nota.</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setForm({ ...form, is_financial: !form.is_financial })}
                    className={`w-14 h-8 rounded-full p-1 transition-all duration-300 ${form.is_financial ? 'bg-brand' : 'bg-white/10'}`}
                  >
                    <div className={`w-6 h-6 rounded-full bg-white shadow-sm transition-transform duration-300 ${form.is_financial ? 'translate-x-6' : 'translate-x-0'}`} />
                  </button>
                </div>

                {/* Extraction Results */}
                {extractedData.length > 0 && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-500">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 px-1">Dados Identificados</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {extractedData.map((item, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-white/10 flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === 'receita' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                              {item.type === 'receita' ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                            </div>
                            <div>
                              <p className="text-sm font-bold truncate max-w-[120px]">{item.description}</p>
                              <p className="text-[10px] opacity-40 uppercase font-black">{item.type}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-black text-sm">R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                            <button className="text-[10px] font-black text-brand uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Importar</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Title Input */}
                <input 
                  type="text"
                  value={form.title}
                  onChange={e => setForm({ ...form, title: e.target.value })}
                  placeholder="Título da Nota"
                  className="w-full text-4xl lg:text-6xl font-black tracking-tight bg-transparent border-none outline-none placeholder:opacity-10 focus:ring-0"
                  style={{ color: "var(--text-primary)" }}
                />

                {/* Content Toolbar (iOS Style) */}
                <div className="flex items-center gap-2 p-2 rounded-2xl bg-white/5 border border-white/5 w-fit">
                   <button className="p-2.5 hover:bg-white/10 rounded-xl transition-colors"><Type size={18} /></button>
                   <button className="p-2.5 hover:bg-white/10 rounded-xl transition-colors"><ListIcon size={18} /></button>
                   <button className="p-2.5 hover:bg-white/10 rounded-xl transition-colors"><CheckCircle2 size={18} /></button>
                   <div className="w-px h-6 bg-white/10 mx-1" />
                   <button className="p-2.5 hover:bg-white/10 rounded-xl transition-colors"><ImageIcon size={18} /></button>
                   <button className="p-2.5 hover:bg-white/10 rounded-xl transition-colors"><Paperclip size={18} /></button>
                   <div className="w-px h-6 bg-white/10 mx-1" />
                   <div className="flex items-center gap-1 px-1">
                     {COLORS.map(c => (
                       <button 
                         key={c.name}
                         onClick={() => setForm({ ...form, color: c.name })}
                         className={`w-6 h-6 rounded-full border-2 ${c.dot} ${form.color === c.name ? 'border-white' : 'border-transparent active:scale-90 transition-all'}`} 
                       />
                     ))}
                   </div>
                </div>

                {/* Content Area */}
                <textarea 
                  value={form.content}
                  onChange={e => setForm({ ...form, content: e.target.value })}
                  placeholder="Comece a escrever..."
                  className={`w-full min-h-[400px] text-lg font-medium leading-relaxed bg-transparent border-none outline-none resize-none placeholder:opacity-10 focus:ring-0`}
                  style={{ color: "var(--text-secondary)" }}
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in-fast" onClick={() => setShowDeleteModal(false)} />
          <div className="relative w-full max-w-sm bg-white dark:bg-[#161920] rounded-[32px] p-8 shadow-2xl animate-in border border-white/10">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mb-6 mx-auto">
              <Trash2 size={32} />
            </div>
            <div className="text-center space-y-2 mb-8">
              <h3 className="text-2xl font-black">Apagar Nota?</h3>
              <p className="text-muted text-sm px-4">Esta ação é permanente e não poderá ser desfeita.</p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDelete}
                className="w-full py-4 bg-rose-500 text-white rounded-2xl font-black text-sm hover:bg-rose-600 transition-all active:scale-95 shadow-lg shadow-rose-500/20"
              >
                SIM, APAGAR NOTA
              </button>
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="w-full py-4 bg-white/5 dark:bg-white/5 rounded-2xl font-bold text-sm hover:bg-white/10 transition-all active:scale-95"
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
