"use client";

import { useState, useRef, useEffect } from "react";
import {
  Settings, Trash2, Database, Download, Upload, AlertTriangle,
  FileSpreadsheet, CheckCircle2, XCircle, Eye, Heart, UserPlus,
  Users, Mail, X, Check, Loader2, ShieldAlert, Cpu, HardDrive,
  Info, ExternalLink, RefreshCw, Key, Share2, Sparkles, BookOpen,
  TrendingDown, TrendingUp
} from "lucide-react";
import { seedAPI, receitasAPI, despesasAPI, sharedAccountAPI } from "@/lib/api";

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string; } | null>(null);

  // Shared account state
  const [sharedStatus, setSharedStatus] = useState<any>(null);
  const [sharedLoading, setSharedLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);

  const loadSharedStatus = async () => {
    try {
      setSharedLoading(true);
      const data = await sharedAccountAPI.status();
      setSharedStatus(data);
    } catch { /* ignore */ } finally { setSharedLoading(false); }
  };

  useEffect(() => { loadSharedStatus(); }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      await sharedAccountAPI.invite(inviteEmail.trim());
      setInviteEmail("");
      setMessage({ type: "success", text: "Convite enviado! Verifique com seu parceiro." });
      await loadSharedStatus();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Email não encontrado ou já convidado." });
    }
    setInviteLoading(false);
  };

  const handleAccept = async (accountId: number) => {
    try {
      await sharedAccountAPI.accept(accountId);
      setMessage({ type: "success", text: "Conexão estabelecida! Dados sincronizados." });
      await loadSharedStatus();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Falha ao aceitar." });
    }
  };

  const handleReject = async (accountId: number) => {
    try {
      await sharedAccountAPI.reject(accountId);
      setMessage({ type: "success", text: "Convite recusado." });
      await loadSharedStatus();
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Falha ao recusar." });
    }
  };

  const [activeTab, setActiveTab] = useState<"couple" | "data" | "import" | "safety" | "about">("couple");

  const handleRemoveShared = async (accountId: number) => {
    if (!confirm("Isso irá separar as contas. Cada um voltará a ter seus próprios dados. Continuar?")) return;
    try {
      await sharedAccountAPI.remove(accountId);
      setMessage({ type: "success", text: "Contas desvinculadas com sucesso." });
      await loadSharedStatus();
    } catch (e: any) {
      setMessage({ type: "error", text: "Erro ao desvincular." });
    }
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importTipo, setImportTipo] = useState<"despesa" | "receita">("despesa");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleSeed = async () => {
    setLoading(true); setMessage(null);
    try {
      const res = await seedAPI.seed();
      setMessage({ type: "success", text: "Banco de dados populado com dados inteligentes!" });
    } catch (e) {
      setMessage({ type: "error", text: "Erro ao carregar sementes." });
    }
    setLoading(false);
  };

  const handleExport = async () => {
    try {
      const [receitas, despesas] = await Promise.all([receitasAPI.listar(), despesasAPI.listar()]);
      const data = { receitas, despesas, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fincontrol-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: "Exportação concluída! Guarde este arquivo com segurança." });
    } catch (e) { setMessage({ type: "error", text: "Falha na exportação." }); }
  };

  const handleClearData = async () => {
    if (!confirm("💣 CUIDADO: Isso apagará DEFINITIVAMENTE todos os seus registros financeiros. Não há volta. Confirmar?")) return;
    setLoading(true);
    try {
      const [receitas, despesas] = await Promise.all([receitasAPI.listar(), despesasAPI.listar()]);
      await Promise.all([...receitas.map((r: any) => receitasAPI.deletar(r.id)), ...despesas.map((d: any) => despesasAPI.deletar(d.id))]);
      setMessage({ type: "success", text: "Limpeza profunda concluída. Seu painel está zerado." });
    } catch (e) { setMessage({ type: "error", text: "Erro na limpeza." }); }
    setLoading(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setImportPreview(null);
      setImportResult(null);
    }
  };

  const handlePreviewImport = async () => {
    if (!importFile) return;
    setImportLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("tipo", importTipo);
      const res = await fetch("/api/import/preview", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Arquivo inválido ou mal formatado.");
      setImportPreview(await res.json());
    } catch (e: any) { setMessage({ type: "error", text: e.message }); }
    setImportLoading(false);
  };

  const handleExecuteImport = async () => {
    if (!importFile) return;
    setImportLoading(true); setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("tipo", importTipo);
      const res = await fetch("/api/import/execute", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Erro durante o processamento das linhas.");
      const data = await res.json();
      setImportResult(data);
      setMessage({ type: "success", text: "Importação realizada com sucesso!" });
    } catch (e: any) { setMessage({ type: "error", text: e.message }); }
    setImportLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
        <div>
          <h1 className="page-title text-gradient">Configurações</h1>
          <p className="page-subtitle">Personalize sua experiência e gerencie seus dados</p>
        </div>
        <div className="flex gap-2 text-[10px] font-black uppercase tracking-widest opacity-40">
           <span className="flex items-center gap-1"><ShieldAlert size={12} /> Dados Criptografados</span>
           <span className="mx-2">•</span>
           <span className="flex items-center gap-1"><Cpu size={12} /> v1.2.0 Stable</span>
        </div>
      </div>

      {/* ── Global Alert ── */}
      {message && (
        <div className={`p-4 rounded-2xl border-2 flex items-center gap-3 animate-in slide-in-from-top-2 transition-all ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' : 'bg-rose-500/10 border-rose-500/20 text-rose-600'}`}>
          {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <p className="text-sm font-bold">{message.text}</p>
          <button onClick={() => setMessage(null)} className="ml-auto opacity-40 hover:opacity-100"><X size={16} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ── Sidebar Navigation (Visual Only) ── */}
        <div className="lg:col-span-1 space-y-2">
            {[
              { id: 'couple', label: 'Plano Casal', icon: Heart },
              { id: 'data', label: 'Dados & Backup', icon: Database },
              { id: 'import', label: 'Importação', icon: FileSpreadsheet },
              { id: 'safety', label: 'Segurança', icon: ShieldAlert },
              { id: 'about', label: 'Sobre o App', icon: Info },
            ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === item.id ? 'bg-brand text-white shadow-lg shadow-brand/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500'}`}>
                <item.icon size={18} /> {item.label}
              </button>
            ))}
        </div>

        {/* ── Main Content ── */}
        <div className="lg:col-span-2 space-y-8">
          
          {activeTab === "couple" && (
            <section className="glass-card p-6 overflow-hidden relative">
              <div className="absolute -top-6 -right-6 opacity-5 rotate-12"><Heart size={120} /></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-pink-500/10 flex items-center justify-center text-pink-500"><Share2 size={20} /></div>
                  <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Sincronização Familiar</h2>
                </div>
                
                <div className="bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl mb-6">
                   <p className="text-xs font-medium leading-relaxed" style={{ color: "var(--text-muted)" }}>
                     Conecte sua conta com outra pessoa para compartilhar o orçamento em tempo real. Os dados serão unificados automaticamente.
                   </p>
                </div>

                {sharedLoading ? (
                  <div className="flex items-center gap-2 py-4 text-xs font-bold animate-pulse"><Loader2 className="animate-spin" size={14} /> Consultando servidores...</div>
                ) : sharedStatus?.type === "active" ? (
                  <div className="space-y-6">
                    <div className="p-5 rounded-2xl border-2 border-brand/20 bg-brand/5">
                       <div className="flex items-center gap-2 mb-4">
                          <div className="flex -space-x-3">
                             <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center text-[10px] text-white font-bold border-2 border-white ring-1 ring-brand/20 uppercase">{sharedStatus.account.owner_name?.slice(0,1)}</div>
                             <div className="w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center text-[10px] text-white font-bold border-2 border-white ring-1 ring-pink-500/20 uppercase">{sharedStatus.account.partner_name?.slice(0,1) || '?'}</div>
                          </div>
                          <p className="text-xs font-black uppercase tracking-widest ml-2" style={{ color: "var(--brand)" }}>Conexão Ativa</p>
                       </div>
                       <div className="space-y-1 mb-6">
                          <p className="text-xs font-black" style={{ color: "var(--text-primary)" }}>Parceria estabelecida</p>
                          <p className="text-[10px] font-bold opacity-40">Lincado com {sharedStatus.account.partner_email === JSON.parse(localStorage.getItem("user") || "{}").email ? sharedStatus.account.owner_email : sharedStatus.account.partner_email}</p>
                       </div>
                       <button onClick={() => handleRemoveShared(sharedStatus.account.id)} className="w-full py-2.5 rounded-xl border-2 border-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest">Desvincular Agora</button>
                    </div>

                    <div className="p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                       <h4 className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">Dica de Visualização</h4>
                       <p className="text-[11px] font-medium leading-relaxed opacity-70">
                         No plano casal, os dados são **compartilhados por padrão**. Se você deseja ver apenas seus dados individuais, as transações possuem um filtro por 'Usuário' nas páginas de listagem.
                       </p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase tracking-widest mb-2 opacity-50">Email do Parceiro(a)</label>
                      <div className="flex gap-2">
                         <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="exemplo@vibe.com" className="input-field flex-1" />
                         <button onClick={handleInvite} disabled={inviteLoading || !inviteEmail.trim()} className="btn-primary px-6">
                           {inviteLoading ? <Loader2 className="animate-spin" size={16} /> : "Conectar"}
                         </button>
                      </div>
                    </div>
                    {sharedStatus?.type === "pending_received" && (
                      <div className="p-4 rounded-xl bg-brand/5 border border-brand/20">
                         <p className="text-xs font-bold mb-3">Você recebeu um convite de {sharedStatus.account.owner_email}</p>
                         <div className="flex gap-2">
                            <button onClick={() => handleAccept(sharedStatus.account.id)} className="btn-primary flex-1 py-1.5 text-[10px]">Aceitar</button>
                            <button onClick={() => handleReject(sharedStatus.account.id)} className="btn-secondary flex-1 py-1.5 text-[10px]">Recusar</button>
                         </div>
                      </div>
                    )}
                    <div className="flex items-center gap-2 text-[10px] font-bold opacity-40"><ShieldAlert size={12} /> Convites expiram em 24h</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === "data" && (
            <section className="glass-card p-6 border-b-none animate-in fade-in slide-in-from-right-4">
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 rounded-xl bg-brand/10 flex items-center justify-center text-brand"><Database size={20} /></div>
                <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Gerenciamento de Dados</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div className="p-5 rounded-2xl border-2 border-slate-100 dark:border-slate-800 hover:border-brand/30 transition-all group">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-xl w-fit mb-4 group-hover:scale-110 transition-transform"><Download size={20} className="text-brand" /></div>
                    <h4 className="text-sm font-black mb-1" style={{ color: "var(--text-primary)" }}>Backup Completo</h4>
                    <p className="text-[11px] mb-4 leading-relaxed" style={{ color: "var(--text-muted)" }}>Baixe toda a sua base de dados (JSON) para manter uma cópia offline segura.</p>
                    <button onClick={handleExport} className="w-full py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-brand hover:text-white transition-all">Exportar Arquivo</button>
                 </div>
              </div>

              <div className="mt-6 p-6 rounded-2xl bg-rose-500/5 border-2 border-rose-500/10">
                 <div className="flex items-center gap-3 mb-2">
                    <ShieldAlert className="text-rose-500" size={18} />
                    <h4 className="text-sm font-black text-rose-500">Zona de Perigo</h4>
                 </div>
                 <p className="text-[11px] font-medium text-rose-600/70 mb-4">A limpeza de dados é irreversível. Todas as transações, investimentos e metas serão perdidos para sempre.</p>
                 <button onClick={handleClearData} className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 active:scale-95 transition-all"><Trash2 size={14} /> Apagar Toda a minha Conta</button>
              </div>
            </section>
          )}

          {activeTab === "import" && (
            <section className="glass-card p-6 overflow-hidden relative animate-in fade-in slide-in-from-right-4">
              <div className="absolute -top-10 -right-10 opacity-5 -rotate-6"><FileSpreadsheet size={180} /></div>
              <div className="relative z-10">
                 <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500"><BookOpen size={20} /></div>
                    <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Smart Import (Excel/CSV)</h2>
                 </div>

                 <div className="flex gap-4 mb-6">
                    {['despesa','receita'].map(t => (
                      <button key={t} onClick={() => setImportTipo(t as any)} 
                        className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${importTipo === t ? 'border-brand bg-brand/5' : 'border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900'}`}>
                         <div className={`p-2 rounded-lg ${importTipo === t ? 'bg-brand text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>
                            {t === 'despesa' ? <TrendingDown size={20} /> : <TrendingUp size={20} />}
                         </div>
                         <span className="text-xs font-black uppercase tracking-widest">{t === 'despesa' ? 'Importar Despesas' : 'Importar Receitas'}</span>
                      </button>
                    ))}
                 </div>

                 <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center hover:border-brand/40 transition-colors group cursor-pointer" 
                   onClick={() => fileInputRef.current?.click()}>
                    <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
                    <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-900 border-2 border-white dark:border-slate-800 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform shadow-sm">
                       <Upload className="text-slate-400 group-hover:text-brand transition-colors" size={24} />
                    </div>
                    <p className="text-sm font-black" style={{ color: "var(--text-primary)" }}>{importFile ? importFile.name : "Solte seu arquivo aqui"}</p>
                    <p className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-1">Excel (.xlsx) ou CSV</p>
                    {importFile && (
                      <button onClick={(e) => { e.stopPropagation(); handlePreviewImport(); }} disabled={importLoading} 
                        className="mt-6 px-8 py-2.5 rounded-xl bg-brand text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-brand/20 active:scale-95">
                        {importLoading ? <Loader2 className="animate-spin" size={16} /> : "Verificar Mapeamento"}
                      </button>
                    )}
                 </div>

                 {importPreview && (
                   <div className="mt-6 p-5 rounded-2xl bg-slate-900 text-white animate-in slide-in-from-bottom-4">
                      <div className="flex items-center justify-between mb-4">
                         <h4 className="text-xs font-black uppercase tracking-widest text-brand">Relatório de Mapeamento</h4>
                         <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded font-bold">{importPreview.total_rows} linhas encontradas</span>
                      </div>
                      <div className="text-[10px] opacity-60 mb-6 font-mono overflow-x-auto whitespace-nowrap pb-2">
                         COLUNAS: {importPreview.columns.join(' | ')}
                      </div>
                      <div className="flex gap-2">
                         <button onClick={handleExecuteImport} className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest">Processar Agora</button>
                         <button onClick={() => setImportPreview(null)} className="px-6 py-2.5 rounded-xl bg-white/10 text-white text-[10px] font-black uppercase tracking-widest">Cancelar</button>
                      </div>
                   </div>
                 )}

                 {importResult && (
                   <div className="mt-4 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 text-xs font-bold flex items-center gap-2">
                      <CheckCircle2 size={16} /> {importResult.message}
                   </div>
                 )}
              </div>
            </section>
          )}

          {activeTab === "safety" && (
            <section className="glass-card p-12 text-center animate-in fade-in slide-in-from-right-4">
               <div className="w-16 h-16 rounded-3xl bg-brand text-white flex items-center justify-center mx-auto mb-6 shadow-xl shadow-brand/20"><Key size={32} /></div>
               <h3 className="text-xl font-black mb-2">Segurança da Conta</h3>
               <p className="text-sm opacity-50 mb-8 max-w-sm mx-auto">Configurações de 2FA e troca de senha estarão disponíveis na próxima atualização.</p>
               <button className="btn-secondary !py-3 !px-8">Alterar Senha de Acesso</button>
            </section>
          )}

          {/* Section: Tech Specs */}
          <section className="p-6 text-center">
             <div className="flex items-center justify-center gap-6 opacity-30">
               <div className="flex flex-col items-center">
                 <HardDrive size={24} className="mb-2" />
                 <p className="text-[10px] font-black uppercase tracking-widest">SQLite Edge</p>
               </div>
               <div className="flex flex-col items-center">
                 <RefreshCw size={24} className="mb-2" />
                 <p className="text-[10px] font-black uppercase tracking-widest">Real-time Sync</p>
               </div>
               <div className="flex flex-col items-center">
                 <ShieldAlert size={24} className="mb-2" />
                 <p className="text-[10px] font-black uppercase tracking-widest">AES-256</p>
               </div>
             </div>
          </section>

        </div>
      </div>
    </div>
  );
}
