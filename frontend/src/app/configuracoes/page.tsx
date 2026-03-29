"use client";

import { useState, useRef, useEffect } from "react";
import {
  Settings, Trash2, Database, Download, Upload, AlertTriangle,
  FileSpreadsheet, CheckCircle2, XCircle, Eye, Heart, UserPlus,
  Users, Mail, X, Check, Loader2, ShieldAlert, Cpu, HardDrive,
  Info, ExternalLink, RefreshCw, Key, Share2, Sparkles, BookOpen,
  TrendingDown, TrendingUp, CreditCard, Zap, Star, ShieldCheck, Leaf
} from "lucide-react";
import { seedAPI, receitasAPI, despesasAPI, sharedAccountAPI, paymentAPI } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";

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

  const [activeTab, setActiveTab] = useState<"subscription" | "couple" | "data" | "import" | "safety" | "about">("subscription");

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
      a.download = `zencash-backup-${new Date().toISOString().split("T")[0]}.json`;
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
    } catch (e: any) { setMessage({ type: "error", text: e.message || "Erro no arquivo." }); }
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
    } catch (e: any) { setMessage({ type: "error", text: e.message || "Erro na importação" }); }
    setImportLoading(false);
  };
  
  const [subscription, setSubscription] = useState<any>(null);
  const [subLoading, setSubLoading] = useState(true);

  const loadSubscription = async () => {
    try {
      setSubLoading(true);
      const data = await paymentAPI.getSubscription();
      setSubscription(data);
    } catch (e) {
      console.error("Erro ao carregar assinatura:", e);
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "subscription") {
        loadSubscription();
    }
  }, [activeTab]);

  const handlePortal = async () => {
    setLoading(true);
    try {
      const { url } = await paymentAPI.getPortal();
      if (url) window.location.href = url;
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Erro ao abrir portal de pagamentos." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-fade-in pb-20">
      {/* ── Header ── */}
      <section className="relative pt-6">
        <div className="space-y-4">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--brand)]/5 border border-[var(--brand)]/10">
              <Settings size={14} className="text-[var(--brand)]" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[var(--brand)]">Gestão do Santuário</span>
           </div>
           <h1 className="text-5xl md:text-7xl font-black tracking-tighter leading-none" style={{ color: "var(--text-primary)" }}>
              Ajuste seu <span className="opacity-30 italic">ambiente.</span>
           </h1>
           <p className="text-lg md:text-2xl text-[var(--text-secondary)] font-medium max-w-xl">
              Personalize sua experiência para que o ZenCash flua em harmonia com sua rotina.
           </p>
        </div>
      </section>

      {/* ── Global Alert ── */}
      {message && (
        <div className={`p-6 rounded-[32px] border-2 flex items-center gap-4 animate-in slide-in-from-top-4 transition-all shadow-2xl ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/10 text-emerald-600 shadow-emerald-500/5' : 'bg-rose-500/10 border-rose-500/10 text-rose-600 shadow-rose-500/5'}`}>
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center shrink-0">
             {message.type === 'success' ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          </div>
          <p className="text-sm font-black">{message.text}</p>
          <button onClick={() => setMessage(null)} className="ml-auto opacity-40 hover:opacity-100 p-2 rounded-xl hover:bg-white/10 transition-all"><X size={18} /></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* ── Navigation Sidebar ── */}
        <div className="lg:col-span-4 space-y-3">
            {[
              { id: 'subscription', label: 'Minha Assinatura', icon: CreditCard, des: 'Gerencie seu plano de luxo' },
              { id: 'couple', label: 'Plano Casal', icon: Heart, des: 'Sincronize sua jornada a dois' },
              { id: 'data', label: 'Dados & Backup', icon: Database, des: 'Governe seu patrimônio offline' },
              { id: 'import', label: 'Importação', icon: FileSpreadsheet, des: 'Smart Import via Excel/CSV' },
              { id: 'safety', label: 'Segurança', icon: ShieldCheck, des: 'Sua paz digital garantida' },
              { id: 'about', label: 'Sobre o App', icon: Leaf, des: 'A filosofia por trás do ZenCash' },
            ].map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-5 p-6 rounded-[32px] border-2 transition-all group relative overflow-hidden text-left ${activeTab === item.id ? 'bg-[var(--brand)] text-[var(--brand-text)] border-transparent shadow-2xl shadow-[var(--brand)]/20' : 'bg-white/40 dark:bg-black/20 border-white/20 hover:border-[var(--brand)]/30'}`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 ${activeTab === item.id ? 'bg-white/20 text-white' : 'bg-[var(--brand)]/5 text-[var(--brand)]'}`}>
                   <item.icon size={24} />
                </div>
                <div>
                   <p className="text-sm font-black tracking-tight">{item.label}</p>
                   <p className={`text-[10px] font-medium opacity-50 ${activeTab === item.id ? 'text-white' : ''}`}>{item.des}</p>
                </div>
                {activeTab === item.id && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-white/40 animate-pulse" />}
              </button>
            ))}
        </div>

        {/* ── Main Content Area ── */}
        <div className="lg:col-span-8 space-y-8 min-h-[600px]">
          
          <div className="bg-white/40 dark:bg-black/20 p-2 rounded-[54px] border border-white/20 dark:border-white/5 backdrop-blur-3xl shadow-2xl h-full">
             <div className="bg-white/60 dark:bg-black/40 rounded-[48px] p-8 md:p-14 border border-white/10 relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 w-80 h-80 bg-[var(--brand)]/5 blur-[100px] -translate-y-1/2 translate-x-1/2" />
                
                {activeTab === "subscription" && (
                  <div className="animate-in fade-in slide-in-from-right-8 relative z-10">
                     <div className="flex items-center gap-6 mb-12">
                        <div className="w-16 h-16 rounded-[24px] bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] shadow-xl shadow-[var(--brand)]/5">
                           <CreditCard size={32} />
                        </div>
                        <div>
                           <h2 className="text-3xl font-black italic tracking-tighter">Assinatura ZenCash</h2>
                           <p className="text-xs font-black uppercase tracking-[0.2em] opacity-30">Status do Faturamento Real</p>
                        </div>
                     </div>

                     {subLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-30">
                           <Loader2 size={40} className="animate-spin mb-4" />
                           <p className="text-xs font-black uppercase tracking-widest">Sincronizando com Stripe...</p>
                        </div>
                     ) : (
                        <div className="space-y-12">
                           <div className={`p-10 rounded-[40px] border-2 transition-all relative group overflow-hidden ${subscription?.plan === 'premium' ? 'border-[var(--brand)] bg-[var(--brand)]/5 shadow-2xl shadow-[var(--brand)]/10' : 'border-[var(--border-subtle)] bg-white/40 dark:bg-black/20'}`}>
                              <div className="flex items-start justify-between mb-10">
                                 <div>
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 mb-4">
                                       <ShieldCheck size={12} />
                                       <span className="text-[10px] font-black uppercase tracking-widest">Plano Ativo</span>
                                    </div>
                                    <h3 className="text-5xl font-black tracking-tighter" style={{ color: "var(--text-primary)" }}>
                                       {subscription?.plan === 'premium' ? 'Zen Elite' : 
                                        subscription?.plan === 'basico' ? 'Zen Básico' : 'Zen Trial'}
                                    </h3>
                                 </div>
                                 <div className="text-right">
                                    <p className="text-4xl font-black" style={{ color: "var(--brand)" }}>
                                       {subscription?.plan === 'premium' ? 'R$ 39,90' : 
                                        subscription?.plan === 'basico' ? 'R$ 9,90' : 'Trial 7d'}
                                    </p>
                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-40">por mês</p>
                                 </div>
                              </div>

                              <div className="grid grid-cols-2 gap-8 mb-12 py-8 border-t border-[var(--border-subtle)]">
                                 <div className="space-y-1">
                                    <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">Renovação</p>
                                    <p className="text-lg font-black">{subscription?.current_period_end ? new Date(subscription.current_period_end).toLocaleDateString('pt-BR') : 'Sem expiração'}</p>
                                 </div>
                                 <div className="space-y-1">
                                    <p className="text-[10px] font-black opacity-30 uppercase tracking-widest">Estado</p>
                                    <p className={`text-lg font-black uppercase italic ${subscription?.status === 'active' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                       {subscription?.status === 'active' ? 'Impecável' : 'Requer Atenção'}
                                    </p>
                                 </div>
                              </div>

                              <button onClick={handlePortal} className="w-full py-6 rounded-[32px] bg-[var(--brand)] text-[var(--brand-text)] font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 transition-all active:scale-[0.98] shadow-2xl shadow-[var(--brand)]/20 hover:scale-[1.02]">
                                 <ExternalLink size={20} /> Acessar Portal de Pagamento
                              </button>
                           </div>
                        </div>
                     )}
                  </div>
                )}

                {activeTab === "couple" && (
                   <div className="animate-in fade-in slide-in-from-right-8 relative z-10 h-full flex flex-col">
                      <div className="flex items-center gap-6 mb-12">
                        <div className="w-16 h-16 rounded-[24px] bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-xl shadow-rose-500/5">
                           <Heart size={32} />
                        </div>
                        <div>
                           <h2 className="text-3xl font-black italic tracking-tighter">Plano Casal</h2>
                           <p className="text-xs font-black uppercase tracking-[0.2em] opacity-30">Sincronia Total de Patrimônio</p>
                        </div>
                     </div>

                     {sharedLoading ? (
                        <div className="flex-1 flex flex-col items-center justify-center opacity-30">
                           <Loader2 size={40} className="animate-spin mb-4" />
                           <p className="text-xs font-black uppercase tracking-widest">Conectando ao Santuário Familiar...</p>
                        </div>
                     ) : sharedStatus?.type === "active" ? (
                        <div className="space-y-10">
                           <div className="p-10 rounded-[40px] border-4 border-dashed border-[var(--brand)]/20 bg-[var(--brand)]/5 text-center">
                              <div className="flex justify-center -space-x-4 mb-8">
                                 <div className="w-16 h-16 rounded-full bg-[var(--brand)] flex items-center justify-center text-white text-xl font-black border-4 border-white shadow-2xl uppercase">{sharedStatus.account.owner_name?.slice(0,1)}</div>
                                 <div className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center text-white text-xl font-black border-4 border-white shadow-2xl uppercase">{sharedStatus.account.partner_name?.slice(0,1) || '?'}</div>
                              </div>
                              <h3 className="text-3xl font-black mb-2">Conexão Consolidada</h3>
                              <p className="text-base font-medium opacity-50 mb-8 max-w-sm mx-auto">
                                 Você e {sharedStatus.account.partner_email === JSON.parse(localStorage.getItem("user") || "{}").email ? sharedStatus.account.owner_name : sharedStatus.account.partner_name} estão fluindo em harmonia financeira.
                              </p>
                              <button onClick={() => handleRemoveShared(sharedStatus.account.id)} className="px-10 py-4 rounded-2xl border-2 border-rose-500/20 text-rose-500 font-black uppercase tracking-widest text-xs hover:bg-rose-500 hover:text-white transition-all">Desvincular Parceria</button>
                           </div>
                        </div>
                     ) : (
                        <div className="space-y-12">
                           <p className="text-lg font-medium opacity-60 leading-relaxed">
                              Deseja compartilhar sua jornada com outra pessoa? Insira o e-mail dela abaixo para unificar seu fluxo de caixa e atingir as metas em dobro.
                           </p>
                           <div className="space-y-4">
                              <label className="text-[11px] font-black uppercase tracking-[0.3em] opacity-40 ml-2">Email do Parceiro(a)</label>
                              <div className="flex flex-col md:flex-row gap-4">
                                 <input type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="alma@gemea.com" 
                                    className="w-full px-8 py-5 rounded-[24px] bg-white/40 dark:bg-black/20 border-2 border-[var(--border-subtle)] focus:border-[var(--brand)] transition-all outline-none font-medium text-lg" />
                                 <button onClick={handleInvite} disabled={inviteLoading || !inviteEmail.trim()} className="bg-[var(--brand)] text-[var(--brand-text)] px-10 py-5 rounded-[24px] font-black uppercase tracking-widest text-sm shadow-xl shadow-[var(--brand)]/20 active:scale-95 disabled:opacity-30">
                                   {inviteLoading ? <Loader2 className="animate-spin" size={20} /> : "Conectar"}
                                 </button>
                              </div>
                           </div>
                           
                           {sharedStatus?.type === "pending_received" && (
                              <div className="p-8 rounded-[32px] bg-[var(--brand)]/5 border-2 border-[var(--brand)]/20 animate-bounce-in">
                                 <p className="text-lg font-black mb-6">Convite Recebido de {sharedStatus.account.owner_email}</p>
                                 <div className="flex gap-4">
                                    <button onClick={() => handleAccept(sharedStatus.account.id)} className="flex-1 py-4 rounded-2xl bg-[var(--brand)] text-[var(--brand-text)] font-black uppercase tracking-widest text-xs">Aceitar Agora</button>
                                    <button onClick={() => handleReject(sharedStatus.account.id)} className="flex-1 py-4 rounded-2xl bg-white/50 dark:bg-black/20 font-black uppercase tracking-widest text-xs">Recusar</button>
                                 </div>
                              </div>
                           )}
                        </div>
                     )}
                   </div>
                )}

                {/* Rest of sections with similar treatments... */}
                {activeTab === "data" && (
                  <div className="animate-in fade-in slide-in-from-right-8 relative z-10">
                     <div className="flex items-center gap-6 mb-12">
                        <div className="w-16 h-16 rounded-[24px] bg-blue-500/10 flex items-center justify-center text-blue-500 shadow-xl shadow-blue-500/5">
                           <Database size={32} />
                        </div>
                        <div>
                           <h2 className="text-3xl font-black italic tracking-tighter">Soberania de Dados</h2>
                           <p className="text-xs font-black uppercase tracking-[0.2em] opacity-30">Seus Números Fora da Nuvem</p>
                        </div>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
                        <div className="p-8 rounded-[40px] border-2 border-[var(--border-subtle)] bg-white/40 dark:bg-black/20 group hover:border-[var(--brand)]/40 transition-all">
                           <div className="w-14 h-14 rounded-2xl bg-[var(--brand)]/10 flex items-center justify-center text-[var(--brand)] mb-6 group-hover:scale-110 transition-transform">
                              <Download size={28} />
                           </div>
                           <h4 className="text-xl font-black mb-2">Cópia de Segurança</h4>
                           <p className="text-sm font-medium opacity-50 mb-8">Exporte todos os seus dados para o seu computador em formato JSON de alta portabilidade.</p>
                           <button onClick={handleExport} className="w-full py-4 rounded-2xl bg-white/60 dark:bg-black/20 font-black uppercase tracking-widest text-xs hover:bg-[var(--brand)] hover:text-[var(--brand-text)] transition-all">Exportar Base</button>
                        </div>
                        <div className="p-8 rounded-[40px] border-2 border-rose-500/10 bg-rose-500/[0.02] group">
                           <div className="w-14 h-14 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6 group-hover:scale-110 transition-transform">
                              <Trash2 size={28} />
                           </div>
                           <h4 className="text-xl font-black mb-2 text-rose-600">Apagar Tudo</h4>
                           <p className="text-sm font-medium opacity-50 mb-8">Remova todos os seus lançamentos, ativos e históricos permanentemente. Cuidado: sem volta.</p>
                           <button onClick={handleClearData} className="w-full py-4 rounded-2xl bg-rose-500 text-white font-black uppercase tracking-widest text-xs shadow-xl shadow-rose-500/20 active:scale-95 transition-all">Destruição Total</button>
                        </div>
                     </div>
                  </div>
                )}

                {activeTab === "import" && (
                   <div className="animate-in fade-in slide-in-from-right-8 relative z-10">
                      <div className="flex items-center gap-6 mb-12">
                        <div className="w-16 h-16 rounded-[24px] bg-emerald-500/10 flex items-center justify-center text-emerald-500 shadow-xl shadow-emerald-500/5">
                           <FileSpreadsheet size={32} />
                        </div>
                        <div>
                           <h2 className="text-3xl font-black italic tracking-tighter">Importação Legada</h2>
                           <p className="text-xs font-black uppercase tracking-[0.2em] opacity-30">Mude de outro App para o ZenCash</p>
                        </div>
                     </div>

                     <div className="space-y-8">
                        <div className="flex gap-4">
                           {['despesa','receita'].map(t => (
                             <button key={t} onClick={() => setImportTipo(t as any)} 
                               className={`flex-1 p-8 rounded-[32px] border-2 transition-all flex flex-col items-center gap-4 group ${importTipo === t ? 'border-[var(--brand)] bg-[var(--brand)]/5' : 'border-[var(--border-subtle)] bg-white/40 dark:bg-black/20'}`}>
                                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${importTipo === t ? 'bg-[var(--brand)] text-white shadow-xl' : 'bg-white/10 opacity-30 group-hover:opacity-100'}`}>
                                   {t === 'despesa' ? <TrendingDown size={28} /> : <TrendingUp size={28} />}
                                </div>
                                <span className={`text-xs font-black uppercase tracking-widest ${importTipo === t ? 'text-[var(--brand)]' : 'opacity-40'}`}>{t === 'despesa' ? 'Despesas' : 'Receitas'}</span>
                             </button>
                           ))}
                        </div>

                        <div className="border-4 border-dashed border-[var(--border-subtle)] rounded-[48px] p-16 text-center hover:border-[var(--brand)]/40 transition-all cursor-pointer group" 
                           onClick={() => fileInputRef.current?.click()}>
                           <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileSelect} className="hidden" />
                           <Upload className="mx-auto text-[var(--brand)]/20 mb-6 group-hover:scale-110 group-hover:text-[var(--brand)] transition-all" size={64} />
                           <p className="text-xl font-black mb-2">{importFile ? importFile.name : "Clique ou Arraste o arquivo"}</p>
                           <p className="text-sm font-medium opacity-40 italic">Formate como XLSX ou CSV de acordo com o template oficial.</p>
                        </div>

                        {importFile && (
                          <button onClick={handlePreviewImport} disabled={importLoading} className="w-full py-6 rounded-3xl bg-[var(--brand)] text-[var(--brand-text)] font-black uppercase tracking-widest text-sm shadow-2xl shadow-[var(--brand)]/20 hover:scale-[1.02] active:scale-95 transition-all">
                             {importLoading ? <Loader2 className="animate-spin" size={24} /> : "Iniciar Pré-Processamento Inteligente"}
                          </button>
                        )}
                        
                        {importPreview && (
                          <div className="p-8 rounded-[32px] bg-black text-white space-y-8 animate-bounce-in">
                             <div className="flex justify-between items-center text-xs font-black uppercase opacity-60 tracking-[0.2em] border-b border-white/10 pb-4">
                                <span>Relatório de Pré-Importação</span>
                                <span>{importPreview.total_rows} Registros</span>
                             </div>
                             <div className="flex gap-4">
                                <button onClick={handleExecuteImport} className="flex-1 py-5 rounded-2xl bg-emerald-500 text-white font-black uppercase tracking-widest text-xs">Confirmar e Gravar</button>
                                <button onClick={() => setImportPreview(null)} className="px-10 py-5 rounded-2xl bg-white/10 font-black uppercase tracking-widest text-xs">Cancelar</button>
                             </div>
                          </div>
                        )}
                     </div>
                   </div>
                )}

                {activeTab === "safety" && (
                   <div className="animate-in fade-in slide-in-from-right-8 relative z-10 py-20 text-center space-y-10">
                      <div className="w-24 h-24 rounded-[40px] bg-[var(--brand)]/10 text-[var(--brand)] flex items-center justify-center mx-auto shadow-2xl shadow-[var(--brand)]/10 animate-pulse">
                         <ShieldAlert size={48} />
                      </div>
                      <div className="space-y-4">
                         <h2 className="text-4xl font-black tracking-tighter">Sua Paz Digital</h2>
                         <p className="text-xl font-medium opacity-50 max-w-sm mx-auto leading-relaxed">
                            O ZenCash já utiliza criptografia AES-256 e SSL de alta performance. 
                            Opções extras de MFA e chaves físicas chegarão na próxima lua cheia (v1.5).
                         </p>
                      </div>
                      <button className="bg-white/40 dark:bg-black/20 px-12 py-5 rounded-3xl border border-white/20 font-black uppercase tracking-widest text-sm hover:bg-[var(--brand)] hover:text-[var(--brand-text)] transition-all">Trocar Senha do Santuário</button>
                   </div>
                )}

                {activeTab === "about" && (
                   <div className="animate-in fade-in slide-in-from-right-8 relative z-10 py-10 space-y-12">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-[24px] bg-[var(--brand)] text-[var(--brand-text)] flex items-center justify-center shadow-xl">
                           <Leaf size={32} />
                        </div>
                        <div>
                           <h2 className="text-4xl font-black tracking-tighter">ZenCash <span className="text-[var(--brand)]">v1.2.0</span></h2>
                           <p className="text-sm font-black uppercase tracking-widest opacity-30 italic">Paz Financeira por Design</p>
                        </div>
                     </div>
                     
                     <div className="prose dark:prose-invert max-w-none space-y-6">
                        <p className="text-xl font-medium leading-relaxed opacity-70">
                           O ZenCash nasceu da necessidade de silenciar o barulho do caos financeiro. 
                           Acreditamos que a riqueza é uma ferramenta para a liberdade, e que o controle dela
                           não deve causar ansiedade, mas sim restaurar sua paz de espírito.
                        </p>
                        <div className="grid grid-cols-2 gap-6 pt-10 border-t border-[var(--border-subtle)]">
                           <div className="flex items-center gap-4">
                              <ShieldCheck size={20} className="text-[var(--brand)]" />
                              <span className="text-sm font-black uppercase tracking-widest opacity-40">Privacidade Absoluta</span>
                           </div>
                           <div className="flex items-center gap-4">
                              <Sparkles size={20} className="text-[var(--brand)]" />
                              <span className="text-sm font-black uppercase tracking-widest opacity-40">Elegância Funcional</span>
                           </div>
                        </div>
                     </div>
                   </div>
                )}
             </div>
          </div>

          <div className="p-8 text-center bg-white/40 dark:bg-black/20 rounded-[40px] border border-white/20 backdrop-blur-3xl shadow-xl">
             <div className="flex items-center justify-center gap-10 opacity-20">
                <div className="flex flex-col items-center gap-2">
                   <HardDrive size={32} />
                   <p className="text-[9px] font-black uppercase tracking-[0.4em]">Edge Computing</p>
                </div>
                <div className="w-px h-10 bg-[var(--text-primary)]" />
                <div className="flex flex-col items-center gap-2">
                   <Cpu size={32} />
                   <p className="text-[9px] font-black uppercase tracking-[0.4em]">IA Generativa</p>
                </div>
                <div className="w-px h-10 bg-[var(--text-primary)]" />
                <div className="flex flex-col items-center gap-2">
                   <ShieldAlert size={32} />
                   <p className="text-[9px] font-black uppercase tracking-[0.4em]">AES-256 Vault</p>
                </div>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
}
