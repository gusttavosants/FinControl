"use client";

import { useState, useRef, useEffect } from "react";
import {
  Settings,
  Trash2,
  Database,
  Download,
  Upload,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Eye,
  Heart,
  UserPlus,
  Users,
  Mail,
  X,
  Check,
  Loader2,
} from "lucide-react";
import { seedAPI, receitasAPI, despesasAPI, sharedAccountAPI } from "@/lib/api";

export default function ConfiguracoesPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

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
    } catch {
      // User might not be logged in
    } finally {
      setSharedLoading(false);
    }
  };

  useEffect(() => {
    loadSharedStatus();
  }, []);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviteLoading(true);
    try {
      await sharedAccountAPI.invite(inviteEmail.trim());
      setInviteEmail("");
      setMessage({ type: "success", text: "Convite enviado com sucesso!" });
      await loadSharedStatus();
    } catch (e: any) {
      setMessage({
        type: "error",
        text: e.message || "Erro ao enviar convite.",
      });
    }
    setInviteLoading(false);
  };

  const handleAccept = async (accountId: number) => {
    try {
      await sharedAccountAPI.accept(accountId);
      setMessage({
        type: "success",
        text: "Convite aceito! Agora vocês compartilham os dados financeiros.",
      });
      await loadSharedStatus();
    } catch (e: any) {
      setMessage({
        type: "error",
        text: e.message || "Erro ao aceitar convite.",
      });
    }
  };

  const handleReject = async (accountId: number) => {
    try {
      await sharedAccountAPI.reject(accountId);
      setMessage({ type: "success", text: "Convite recusado." });
      await loadSharedStatus();
    } catch (e: any) {
      setMessage({
        type: "error",
        text: e.message || "Erro ao recusar convite.",
      });
    }
  };

  const handleRemoveShared = async (accountId: number) => {
    if (
      !confirm(
        "Tem certeza que deseja desvincular a conta compartilhada? Cada um voltará a ver apenas seus próprios dados.",
      )
    )
      return;
    try {
      await sharedAccountAPI.remove(accountId);
      setMessage({ type: "success", text: "Conta compartilhada removida." });
      await loadSharedStatus();
    } catch (e: any) {
      setMessage({
        type: "error",
        text: e.message || "Erro ao remover conta compartilhada.",
      });
    }
  };

  const handleCancelInvite = async (accountId: number) => {
    try {
      await sharedAccountAPI.remove(accountId);
      setMessage({ type: "success", text: "Convite cancelado." });
      await loadSharedStatus();
    } catch (e: any) {
      setMessage({
        type: "error",
        text: e.message || "Erro ao cancelar convite.",
      });
    }
  };

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importTipo, setImportTipo] = useState<"despesa" | "receita">(
    "despesa",
  );
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<any>(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  const handleSeed = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await seedAPI.seed();
      setMessage({
        type: "success",
        text: res.message || "Dados carregados com sucesso!",
      });
    } catch (e) {
      setMessage({ type: "error", text: "Erro ao carregar dados de exemplo." });
    }
    setLoading(false);
  };

  const handleExport = async () => {
    try {
      const [receitas, despesas] = await Promise.all([
        receitasAPI.listar(),
        despesasAPI.listar(),
      ]);
      const data = { receitas, despesas, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fincontrol-backup-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: "Dados exportados com sucesso!" });
    } catch (e) {
      setMessage({ type: "error", text: "Erro ao exportar dados." });
    }
  };

  const handleClearData = async () => {
    if (
      !confirm(
        "⚠️ ATENÇÃO: Isso irá apagar TODOS os seus dados financeiros. Esta ação não pode ser desfeita. Deseja continuar?",
      )
    ) {
      return;
    }
    if (
      !confirm(
        "Tem certeza absoluta? Todos os dados serão perdidos permanentemente.",
      )
    ) {
      return;
    }
    setLoading(true);
    try {
      const [receitas, despesas] = await Promise.all([
        receitasAPI.listar(),
        despesasAPI.listar(),
      ]);
      const deletePromises = [
        ...receitas.map((r: any) => receitasAPI.deletar(r.id)),
        ...despesas.map((d: any) => despesasAPI.deletar(d.id)),
      ];
      await Promise.all(deletePromises);
      setMessage({ type: "success", text: "Todos os dados foram removidos." });
    } catch (e) {
      setMessage({ type: "error", text: "Erro ao limpar dados." });
    }
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

      const res = await fetch("/api/import/preview", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao processar arquivo");
      }

      const data = await res.json();
      setImportPreview(data);
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Erro ao fazer preview" });
    }
    setImportLoading(false);
  };

  const handleExecuteImport = async () => {
    if (!importFile) return;

    if (
      !confirm(
        `Importar ${importPreview?.total_rows} registros como ${importTipo}?`,
      )
    ) {
      return;
    }

    setImportLoading(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("tipo", importTipo);

      const res = await fetch("/api/import/execute", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Erro ao importar");
      }

      const data = await res.json();
      setImportResult(data);
      setMessage({
        type: "success",
        text: data.message,
      });
    } catch (e: any) {
      setMessage({ type: "error", text: e.message || "Erro ao importar" });
    }
    setImportLoading(false);
  };

  return (
    <div className="space-y-6 max-w-3xl animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="page-title">Configurações</h1>
        <p className="page-subtitle">Gerencie seus dados e preferências</p>
      </div>

      {/* Message */}
      {message && (
        <div
          className="glass-card p-4 text-sm font-medium"
          style={{
            borderColor:
              message.type === "success"
                ? "rgba(23,179,100,0.25)"
                : "rgba(249,58,74,0.25)",
            background:
              message.type === "success"
                ? "rgba(23,179,100,0.06)"
                : "rgba(249,58,74,0.06)",
            color: message.type === "success" ? "#17b364" : "#f93a4a",
          }}
        >
          {message.text}
        </div>
      )}

      {/* Plano Casal */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(236,72,153,0.12)" }}
          >
            <Heart size={20} className="text-pink-400" />
          </div>
          <div className="flex-1">
            <h3
              className="font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Plano Casal
            </h3>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Compartilhe seus dados financeiros com seu parceiro(a). Ambos
              terão acesso às mesmas receitas, despesas e metas.
            </p>

            {sharedLoading ? (
              <div
                className="mt-4 flex items-center gap-2 text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                <Loader2 size={16} className="animate-spin" />
                Carregando...
              </div>
            ) : sharedStatus?.type === "active" ? (
              /* Active shared account */
              <div
                className="mt-4 p-4 rounded-xl"
                style={{
                  background: "rgba(89,139,255,0.10)",
                  border: "1px solid rgba(89,139,255,0.25)",
                }}
              >
                <div
                  className="flex items-center gap-2 font-medium text-sm"
                  style={{ color: "var(--brand)" }}
                >
                  <Users size={16} />
                  Conta Compartilhada Ativa
                </div>
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: "var(--text-muted)" }}>Titular</span>
                    <span
                      className="font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {sharedStatus.account.owner_name} (
                      {sharedStatus.account.owner_email})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span style={{ color: "var(--text-muted)" }}>
                      Parceiro(a)
                    </span>
                    <span
                      className="font-medium"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {sharedStatus.account.partner_name ||
                        sharedStatus.account.partner_email}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => handleRemoveShared(sharedStatus.account.id)}
                  className="btn-secondary mt-4"
                  style={{ color: "#f93a4a" }}
                >
                  <X size={14} />
                  Desvincular Conta
                </button>
              </div>
            ) : sharedStatus?.type === "pending_sent" ? (
              /* Pending invite sent */
              <div
                className="mt-4 p-4 rounded-xl"
                style={{
                  background: "rgba(249,131,7,0.08)",
                  border: "1px solid rgba(249,131,7,0.25)",
                }}
              >
                <div
                  className="flex items-center gap-2 font-medium text-sm"
                  style={{ color: "#f98307" }}
                >
                  <Mail size={16} />
                  Convite Pendente
                </div>
                <p
                  className="text-sm mt-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  Aguardando{" "}
                  <strong style={{ color: "var(--text-primary)" }}>
                    {sharedStatus.account.partner_email}
                  </strong>{" "}
                  aceitar o convite.
                </p>
                <button
                  onClick={() => handleCancelInvite(sharedStatus.account.id)}
                  className="btn-secondary mt-3"
                  style={{ color: "#f93a4a" }}
                >
                  <X size={14} />
                  Cancelar Convite
                </button>
              </div>
            ) : sharedStatus?.type === "pending_received" ? (
              /* Pending invite received */
              <div
                className="mt-4 p-4 rounded-xl"
                style={{
                  background: "rgba(51,102,255,0.08)",
                  border: "1px solid rgba(51,102,255,0.25)",
                }}
              >
                <div
                  className="flex items-center gap-2 font-medium text-sm"
                  style={{ color: "var(--brand)" }}
                >
                  <UserPlus size={16} />
                  Convite Recebido
                </div>
                <p
                  className="text-sm mt-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  <strong style={{ color: "var(--text-primary)" }}>
                    {sharedStatus.account.owner_name}
                  </strong>{" "}
                  ({sharedStatus.account.owner_email}) quer compartilhar os
                  dados financeiros com você.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => handleAccept(sharedStatus.account.id)}
                    className="btn-primary"
                  >
                    <Check size={14} />
                    Aceitar
                  </button>
                  <button
                    onClick={() => handleReject(sharedStatus.account.id)}
                    className="btn-secondary"
                  >
                    <X size={14} />
                    Recusar
                  </button>
                </div>
              </div>
            ) : (
              /* No shared account - show invite form */
              <div className="mt-4">
                <label
                  className="text-sm font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Email do parceiro(a)
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="parceiro@email.com"
                    className="input-field flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleInvite()}
                  />
                  <button
                    onClick={handleInvite}
                    disabled={inviteLoading || !inviteEmail.trim()}
                    className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {inviteLoading ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <UserPlus size={16} />
                    )}
                    Convidar
                  </button>
                </div>
                <p
                  className="text-xs mt-2"
                  style={{ color: "var(--text-muted)" }}
                >
                  O parceiro(a) precisa ter uma conta no FinControl. Ao aceitar,
                  ambos verão os mesmos dados.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dados de Exemplo */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(51,102,255,0.10)" }}
          >
            <Database size={20} style={{ color: "var(--brand)" }} />
          </div>
          <div className="flex-1">
            <h3
              className="font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Dados de Exemplo
            </h3>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Carregue dados fictícios para testar a aplicação. Inclui receitas,
              despesas e dados do mês anterior.
            </p>
            <button
              onClick={handleSeed}
              disabled={loading}
              className="btn-primary mt-3 disabled:opacity-50"
            >
              <Database size={16} />
              {loading ? "Carregando..." : "Carregar Dados de Exemplo"}
            </button>
          </div>
        </div>
      </div>

      {/* Exportar Dados */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(51,102,255,0.10)" }}
          >
            <Download size={20} style={{ color: "var(--brand)" }} />
          </div>
          <div className="flex-1">
            <h3
              className="font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Exportar Dados
            </h3>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Faça backup dos seus dados financeiros em formato JSON. Inclui
              todas as receitas e despesas.
            </p>
            <button onClick={handleExport} className="btn-secondary mt-3">
              <Download size={16} />
              Exportar JSON
            </button>
          </div>
        </div>
      </div>

      {/* Importar Planilha */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(23,179,100,0.12)" }}
          >
            <FileSpreadsheet size={20} className="text-accent-500" />
          </div>
          <div className="flex-1">
            <h3
              className="font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Importar Planilha
            </h3>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Importe dados de planilhas Excel (.xlsx) ou CSV. O sistema detecta
              automaticamente as colunas e importa receitas ou despesas.
            </p>

            {/* Tipo de Importação */}
            <div className="mt-4">
              <label
                className="text-sm font-medium"
                style={{ color: "var(--text-secondary)" }}
              >
                Tipo de Dados
              </label>
              <div className="mt-2 flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="despesa"
                    checked={importTipo === "despesa"}
                    onChange={(e) => setImportTipo(e.target.value as "despesa")}
                    className="text-[#a3e635] accent-[#a3e635]"
                  />
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Despesas
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="receita"
                    checked={importTipo === "receita"}
                    onChange={(e) => setImportTipo(e.target.value as "receita")}
                    className="text-[#a3e635] accent-[#a3e635]"
                  />
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-muted)" }}
                  >
                    Receitas
                  </span>
                </label>
              </div>
            </div>

            {/* File Upload */}
            <div className="mt-4">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary"
                >
                  <Upload size={16} />
                  Selecionar Arquivo
                </button>
                {importFile && (
                  <span
                    className="text-sm self-center"
                    style={{ color: "var(--text-muted)" }}
                  >
                    {importFile.name}
                  </span>
                )}
              </div>
            </div>

            {/* Preview Button */}
            {importFile && (
              <div className="mt-4">
                <button
                  onClick={handlePreviewImport}
                  disabled={importLoading}
                  className="btn-secondary disabled:opacity-50"
                >
                  <Eye size={16} />
                  {importLoading ? "Processando..." : "Visualizar Dados"}
                </button>
              </div>
            )}

            {/* Preview Results */}
            {importPreview && (
              <div
                className="mt-4 p-4 rounded-xl"
                style={{
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <h4
                  className="font-medium mb-2"
                  style={{ color: "var(--text-primary)" }}
                >
                  Preview dos Dados
                </h4>
                <div
                  className="text-sm space-y-1"
                  style={{ color: "var(--text-muted)" }}
                >
                  <div>Total de linhas: {importPreview.total_rows}</div>
                  <div>
                    Colunas detectadas: {importPreview.columns.join(", ")}
                  </div>
                  <div className="mt-3">
                    <div
                      className="font-medium mb-1"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Primeiras 10 linhas:
                    </div>
                    <div
                      className="max-h-32 overflow-y-auto p-2 rounded text-xs"
                      style={{
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-subtle)",
                        color: "var(--text-muted)",
                      }}
                    >
                      {importPreview.preview.map((row: any, i: number) => (
                        <div key={i} className="border-b last:border-b-0 py-1">
                          {Object.entries(row).map(([col, val]) => (
                            <span key={col} className="mr-4">
                              <strong>{col}:</strong> {String(val)}
                            </span>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleExecuteImport}
                    disabled={importLoading}
                    className="btn-primary disabled:opacity-50"
                    style={{
                      background: "linear-gradient(135deg, #17b364, #3366ff)",
                    }}
                  >
                    <CheckCircle2 size={16} />
                    {importLoading ? "Importando..." : "Confirmar Importação"}
                  </button>
                  <button
                    onClick={() => setImportPreview(null)}
                    className="btn-secondary"
                  >
                    <XCircle size={16} />
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {/* Import Results */}
            {importResult && (
              <div
                className="mt-4 p-4 rounded-xl"
                style={{
                  background: "rgba(23,179,100,0.08)",
                  border: "1px solid rgba(23,179,100,0.25)",
                }}
              >
                <div
                  className="flex items-center gap-2 font-medium"
                  style={{ color: "#17b364" }}
                >
                  <CheckCircle2 size={16} />
                  Importação Concluída
                </div>
                <div
                  className="text-sm mt-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  <div>{importResult.message}</div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-2">
                      <div className="font-medium">Erros encontrados:</div>
                      <div
                        className="max-h-20 overflow-y-auto p-2 rounded text-xs mt-1"
                        style={{
                          background: "var(--bg-card)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        {importResult.errors.map((error: string, i: number) => (
                          <div key={i} className="text-red-600">
                            {error}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Informações do Sistema */}
      <div className="glass-card p-6">
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(100,116,139,0.12)" }}
          >
            <Settings size={20} style={{ color: "var(--text-secondary)" }} />
          </div>
          <div className="flex-1">
            <h3
              className="font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              Informações do Sistema
            </h3>
            <div className="mt-3 space-y-2">
              <div
                className="flex items-center justify-between text-sm py-2"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <span style={{ color: "var(--text-muted)" }}>Versão</span>
                <span
                  className="font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  1.0.0
                </span>
              </div>
              <div
                className="flex items-center justify-between text-sm py-2"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <span style={{ color: "var(--text-muted)" }}>Backend</span>
                <span
                  className="font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  FastAPI + SQLite
                </span>
              </div>
              <div
                className="flex items-center justify-between text-sm py-2"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <span style={{ color: "var(--text-muted)" }}>Frontend</span>
                <span
                  className="font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Next.js 14 + Tailwind CSS
                </span>
              </div>
              <div className="flex items-center justify-between text-sm py-2">
                <span style={{ color: "var(--text-muted)" }}>
                  Banco de Dados
                </span>
                <span
                  className="font-medium"
                  style={{ color: "var(--text-secondary)" }}
                >
                  SQLite (local)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Zona de Perigo */}
      <div
        className="glass-card p-6"
        style={{
          borderColor: "rgba(249,58,74,0.30)",
          background: "rgba(249,58,74,0.04)",
        }}
      >
        <div className="flex items-start gap-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "rgba(249,58,74,0.10)" }}
          >
            <AlertTriangle size={20} className="text-red-400" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold" style={{ color: "#f93a4a" }}>
              Zona de Perigo
            </h3>
            <p
              className="text-sm mt-1"
              style={{ color: "rgba(249,58,74,0.8)" }}
            >
              Ações irreversíveis. Tenha certeza antes de prosseguir.
            </p>
            <button
              onClick={handleClearData}
              disabled={loading}
              className="btn-primary mt-3 disabled:opacity-50"
              style={{
                background: "linear-gradient(135deg, #f93a4a, #dd5f02)",
              }}
            >
              <Trash2 size={16} />
              {loading ? "Processando..." : "Apagar Todos os Dados"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
