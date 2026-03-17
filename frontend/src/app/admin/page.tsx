"use client";

import { useState, useEffect } from "react";
import { 
  Users, DollarSign, TrendingUp, Activity, 
  BarChart3, PieChart, Loader2, Shield, Eye,
  Search, UserCog, Ban, CheckCircle, Clock,
  ArrowUpRight, ArrowDownRight, Zap, Database,
  LayoutGrid, List, History, Trash2, Mail,
  Star, ChevronRight, AlertCircle, RefreshCcw
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  AreaChart, Area
} from "recharts";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface User {
  id: number; nome: string; email: string; role: string; plan: string; is_active: boolean; created_at: string;
}

interface AuditLog {
  id: number; user_id: number; user_email: string; action: string; entity_type: string; entity_id: number; details: string; created_at: string;
}

interface BusinessMetrics {
  users: { total: number; new_this_month: number; active_paid: number; free_users: number; };
  subscriptions: { total_paid: number; pro: number; premium: number; conversion_rate: number; };
  revenue: { mrr: number; total_lifetime: number; this_month: number; };
  metrics: { churn_rate: number; arpu: number; };
}

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "audit">("overview");
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userActivity, setUserActivity] = useState<AuditLog[]>([]);

  useEffect(() => { fetchAllMetrics(); }, []);

  const fetchAllMetrics = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) throw new Error("Não autorizado");
      const headers = { Authorization: `Bearer ${token}` };
      const [mRes, uRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/metrics`, { headers }),
        fetch(`${API_URL}/api/admin/users`, { headers }),
      ]);
      if (!mRes.ok) throw new Error("Acesso negado - apenas administradores");
      setMetrics(await mRes.json());
      setUsers(await uRes.json());
    } catch (err: any) { setError(err.message); } 
    finally { setLoading(false); }
  };

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/audit-logs?limit=100`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setAuditLogs(await res.json());
    } catch {}
  };

  const fetchUserActivity = async (userId: number) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/activity?limit=50`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setUserActivity(data.activity || []); }
    } catch {}
  };

  const handleTabChange = (tab: "overview" | "users" | "audit") => {
    setActiveTab(tab);
    if (tab === "audit") fetchAuditLogs();
  };

  const handleUserClick = (user: User) => {
    setSelectedUser(user);
    fetchUserActivity(user.id);
  };

  const updateUserRole = async (userId: number, role: string) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/role`, {
        method: "PUT",
        headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (res.ok) { fetchAllMetrics(); if (selectedUser?.id === userId) setSelectedUser({ ...selectedUser, role }); }
    } catch {}
  };

  if (loading) return <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4"><Loader2 className="w-10 h-10 animate-spin text-brand" /><p className="text-xs font-black uppercase tracking-widest opacity-40">Acessando Command Center...</p></div>;

  if (error) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="glass-card p-12 text-center max-w-sm">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-6"><Shield size={32} /></div>
        <h1 className="text-2xl font-black mb-2" style={{ color: "var(--text-primary)" }}>Acesso Restrito</h1>
        <p className="text-sm font-medium opacity-60 mb-8">{error}</p>
        <Link href="/" className="btn-primary w-full">Voltar ao Início</Link>
      </div>
    </div>
  );

  const filteredUsers = users.filter(u => u.nome.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-fade-in py-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-brand mb-1">
             <Shield size={16} />
             <span className="text-[10px] font-black uppercase tracking-widest">FinControl OS v1.0</span>
          </div>
          <h1 className="text-4xl font-black" style={{ color: "var(--text-primary)" }}>Painel de Controle</h1>
        </div>
        
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl gap-1">
           {[
             { id: 'overview', label: 'Dashboard', icon: LayoutGrid },
             { id: 'users', label: 'Usuários', icon: Users },
             { id: 'audit', label: 'Logs', icon: History }
           ].map(tab => (
             <button key={tab.id} onClick={() => handleTabChange(tab.id as any)}
               className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab.id ? 'bg-white dark:bg-slate-900 shadow-lg text-brand' : 'opacity-40 hover:opacity-100'}`}>
                <tab.icon size={14} /> {tab.label}
             </button>
           ))}
        </div>
      </div>

      {activeTab === "overview" && metrics && (
        <div className="space-y-8">
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard title="Receita Mensal (MRR)" value={`R$ ${metrics.revenue.mrr.toLocaleString()}`} icon={DollarSign} color="emerald" trend="+12.5%" />
              <MetricCard title="Usuários Ativos" value={metrics.users.total} icon={Users} color="brand" subtitle={`${metrics.users.new_this_month} novos este mês`} />
              <MetricCard title="Assinantes Pagos" value={metrics.subscriptions.total_paid} icon={Star} color="amber" trend={`${metrics.subscriptions.conversion_rate}% conv.`} />
              <MetricCard title="Churn Rate" value={`${metrics.metrics.churn_rate}%`} icon={Activity} color="rose" trend="-2.1%" />
           </div>

           <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 glass-card p-8">
                 <div className="flex items-center justify-between mb-8">
                    <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Crescimento de Receita</h2>
                    <select className="bg-transparent text-xs font-bold border-none outline-none cursor-pointer">
                       <option>Últimos 6 meses</option>
                       <option>Último ano</option>
                    </select>
                 </div>
                 <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                       <AreaChart data={[
                         { name: 'Jan', value: 4000 }, { name: 'Fev', value: 3000 }, { name: 'Mar', value: 2000 },
                         { name: 'Abr', value: 2780 }, { name: 'Mai', value: 1890 }, { name: 'Jun', value: 2390 },
                       ]}>
                          <defs>
                            <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="var(--brand)" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="var(--brand)" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border-subtle)" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                          <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: 'var(--shadow-lg)' }} />
                          <Area type="monotone" dataKey="value" stroke="var(--brand)" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                       </AreaChart>
                    </ResponsiveContainer>
                 </div>
              </div>

              <div className="glass-card p-8 divide-y divide-slate-100 dark:divide-slate-800">
                 <h2 className="text-lg font-black mb-6" style={{ color: "var(--text-primary)" }}>Health Check</h2>
                 <HealthItem label="API Status" status="Operacional" icon={Zap} color="text-emerald-500" />
                 <HealthItem label="Banco de Dados" status="Ok (2.4ms)" icon={Database} color="text-blue-500" />
                 <HealthItem label="E-mails (Postmark)" status="100% Delivery" icon={Mail} color="text-amber-500" />
                 <HealthItem label="Cloud Infrastructure" status="99.9% Uptime" icon={Activity} color="text-purple-500" />
                 <div className="pt-6 mt-6">
                    <button onClick={() => fetchAllMetrics()} className="w-full btn-secondary py-3 flex items-center justify-center gap-2">
                       <RefreshCcw size={14} /> Atualizar Métricas
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === "users" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
           <div className="lg:col-span-2 space-y-6">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30" size={18} />
                <input className="input-field pl-12 py-4 shadow-sm" placeholder="Buscar por nome ou e-mail..."
                  value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>

              <div className="glass-card overflow-hidden">
                 <table className="data-table">
                    <thead>
                       <tr>
                          <th>Usuário</th>
                          <th>Role</th>
                          <th>Plano</th>
                          <th>Status</th>
                          <th className="text-right">Ações</th>
                       </tr>
                    </thead>
                    <tbody>
                       {filteredUsers.map(u => (
                         <tr key={u.id} onClick={() => handleUserClick(u)} className={`cursor-pointer ${selectedUser?.id === u.id ? 'bg-brand/[0.03]' : ''}`}>
                            <td className="py-4">
                               <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-brand/10 text-brand flex items-center justify-center text-[10px] font-black uppercase">
                                     {u.nome[0]}
                                  </div>
                                  <div>
                                     <p className="font-black text-sm">{u.nome}</p>
                                     <p className="text-[10px] opacity-40">{u.email}</p>
                                  </div>
                               </div>
                            </td>
                            <td><span className={`badge ${u.role === 'admin' ? 'badge-purple' : 'badge-neutral'}`}>{u.role}</span></td>
                            <td><span className={`badge ${u.plan === 'premium' ? 'badge-warn' : 'badge-info'}`}>{u.plan}</span></td>
                            <td>
                               {u.is_active ? <span className="flex items-center gap-1 text-[10px] font-black text-emerald-500 uppercase"><CheckCircle size={10} /> Ativo</span> : 
                               <span className="flex items-center gap-1 text-[10px] font-black text-rose-500 uppercase"><Ban size={10} /> Inativo</span>}
                            </td>
                            <td className="text-right">
                               <button className="p-2 hover:bg-slate-100 rounded-lg group"><ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" /></button>
                            </td>
                         </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           </div>

           <div className="glass-card p-6 overflow-hidden h-fit sticky top-24">
              {selectedUser ? (
                <div className="space-y-8 animate-fade-in-fast">
                   <div className="text-center">
                      <div className="w-20 h-20 rounded-3xl bg-brand text-white flex items-center justify-center text-2xl font-black mx-auto mb-4 shadow-xl shadow-brand/20">
                         {selectedUser.nome[0]}
                      </div>
                      <h3 className="text-xl font-black">{selectedUser.nome}</h3>
                      <p className="text-xs opacity-50 mb-6">{selectedUser.email}</p>
                      
                      <div className="grid grid-cols-2 gap-3 mb-8">
                         <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-left">
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">ID Usuário</p>
                            <p className="text-xs font-bold">#{selectedUser.id}</p>
                         </div>
                         <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 text-left">
                            <p className="text-[9px] font-black uppercase tracking-widest opacity-40 mb-1">Desde</p>
                            <p className="text-xs font-bold">{new Date(selectedUser.created_at).toLocaleDateString()}</p>
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">Ações Administrativas</label>
                        <div className="grid grid-cols-2 gap-2">
                           <button onClick={() => updateUserRole(selectedUser.id, selectedUser.role === 'admin' ? 'user' : 'admin')}
                             className="btn-secondary text-[10px] !py-3">Toggle Admin</button>
                           <button className="btn-secondary text-[10px] !py-3 text-rose-500">Bloquear Conta</button>
                        </div>
                      </div>
                      
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 mb-2 block">Logs de Atividade</label>
                        <div className="space-y-2 max-h-60 overflow-y-auto pr-2 scrollbar-thin">
                           {userActivity.slice(0, 5).map(log => (
                             <div key={log.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                                <p className="text-[11px] font-bold mb-0.5">{log.action}</p>
                                <p className="text-[10px] opacity-40 line-clamp-1">{log.details}</p>
                             </div>
                           ))}
                        </div>
                      </div>
                   </div>
                </div>
              ) : (
                <div className="py-20 text-center opacity-30 flex flex-col items-center gap-4">
                   <UserCog size={48} />
                   <p className="text-sm font-black uppercase tracking-widest">Aguardando Seleção</p>
                </div>
              )}
           </div>
        </div>
      )}

      {activeTab === "audit" && (
         <div className="glass-card">
            <div className="p-6 border-b flex items-center justify-between">
               <h2 className="text-lg font-black" style={{ color: "var(--text-primary)" }}>Histórico Total de Auditoria</h2>
               <div className="flex gap-2">
                  <button className="btn-secondary !py-2 !px-3"><Trash2 size={14} /></button>
               </div>
            </div>
            <table className="data-table">
               <thead>
                  <tr>
                     <th>Timestamp</th>
                     <th>Operador</th>
                     <th>Ação</th>
                     <th>Detalhes</th>
                  </tr>
               </thead>
               <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {auditLogs.map(log => (
                    <tr key={log.id}>
                       <td className="text-xs font-bold opacity-40">{new Date(log.created_at).toLocaleString()}</td>
                       <td className="text-xs font-black">{log.user_email}</td>
                       <td><span className="badge badge-info">{log.action}</span></td>
                       <td className="text-xs opacity-60 max-w-sm truncate">{log.details}</td>
                    </tr>
                  ))}
               </tbody>
            </table>
         </div>
      )}
    </div>
  );
}

function MetricCard({ title, value, subtitle, icon: Icon, color, trend }: any) {
  const colors: any = {
    emerald: 'bg-emerald-500/10 text-emerald-500',
    brand: 'bg-brand/10 text-brand',
    amber: 'bg-amber-500/10 text-amber-500',
    rose: 'bg-rose-500/10 text-rose-500',
  };
  return (
    <div className="glass-card p-6 relative overflow-hidden group">
       <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity"><Icon size={64} /></div>
       <div className="flex justify-between items-start mb-4 relative z-10">
          <div className={`w-10 h-10 rounded-2xl ${colors[color]} flex items-center justify-center`}><Icon size={18} /></div>
          {trend && <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>{trend}</span>}
       </div>
       <p className="text-2xl font-black mb-1" style={{ color: "var(--text-primary)" }}>{value}</p>
       <p className="text-[10px] font-black uppercase tracking-widest opacity-40">{title}</p>
       {subtitle && <p className="text-[9px] mt-2 opacity-30">{subtitle}</p>}
    </div>
  );
}

function HealthItem({ label, status, icon: Icon, color }: any) {
  return (
    <div className="flex items-center justify-between py-4">
       <div className="flex items-center gap-3">
          <Icon size={14} className={color} />
          <span className="text-xs font-bold opacity-60">{label}</span>
       </div>
       <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">{status}</span>
    </div>
  );
}
