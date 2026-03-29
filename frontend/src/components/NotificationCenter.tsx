"use client";

import { useState, useEffect } from "react";
import { Bell, X, Check, BellRing, Info, AlertTriangle, AlertCircle, CheckCircle2, Trash2, Sparkles, Command } from "lucide-react";
import { notificationsAPI } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface Notification {
  id: number;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  created_at: string;
}

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const loadNotifications = async () => {
    try {
      const data = await notificationsAPI.listar();
      setNotifications(data);
    } catch (error) {
      console.error("Erro ao carregar notificações:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.lida);
      await Promise.all(unread.map(n => notificationsAPI.marcarLida(n.id)));
      setNotifications(prev => prev.map(n => ({ ...n, lida: true })));
    } catch {}
  };

  const markAsRead = async (id: number) => {
    try {
      await notificationsAPI.marcarLida(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, lida: true } : n)),
      );
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await notificationsAPI.deletar(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch (error) {
      console.error("Erro ao deletar notificação:", error);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 2 * 60 * 1000); // 2 min
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.lida).length;

  const getIcon = (tipo: string) => {
    switch (tipo.toLowerCase()) {
      case "vencimento":
      case "alerta":
      case "warning": return <AlertTriangle className="text-amber-500" size={18} strokeWidth={2.5} />;
      case "orcamento":
      case "erro":
      case "danger": return <AlertCircle className="text-rose-500" size={18} strokeWidth={2.5} />;
      case "sucesso":
      case "success": return <CheckCircle2 className="text-emerald-500" size={18} strokeWidth={2.5} />;
      default: return <Info className="text-blue-500" size={18} strokeWidth={2.5} />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-3 rounded-2xl transition-all duration-300 border ${
          isOpen ? 'bg-[var(--brand)] text-white border-transparent shadow-2xl shadow-[var(--brand)]/30 scale-110' : 'bg-white/5 dark:bg-black/20 border-white/10 hover:border-[var(--brand)]/30 text-[var(--text-secondary)] hover:shadow-lg'
        }`}
      >
        <Bell size={20} className={unreadCount > 0 ? "animate-bounce" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white shadow-2xl ring-2 ring-white dark:ring-black animate-in zoom-in-50 duration-500">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-5 w-[420px] animate-in slide-in-from-top-4 duration-500 z-50">
          <div className="bg-white/90 dark:bg-black/90 rounded-[40px] shadow-[0_40px_100px_rgba(0,0,0,0.4)] border border-white/10 backdrop-blur-3xl overflow-hidden">
            {/* Header */}
            <div className="p-8 pb-4 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-black italic tracking-tighter" style={{ color: "var(--text-primary)" }}>Central de Avisos</h3>
                <div className="flex items-center gap-2">
                   <span className="w-1.5 h-1.5 rounded-full bg-[var(--brand)] animate-ping" />
                   <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">{unreadCount ? `${unreadCount} Pendentes hoje` : 'Santuário em ordem'}</p>
                </div>
              </div>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500 hover:scale-110 active:scale-95 transition-all shadow-xl shadow-emerald-500/5 group" title="Marcar todas como lidas">
                    <Check size={16} strokeWidth={3} className="group-hover:rotate-12 transition-transform" />
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="p-3 rounded-2xl bg-white/5 dark:bg-black/20 hover:bg-rose-500/10 hover:text-rose-500 transition-all active:scale-95">
                  <X size={16} strokeWidth={3} />
                </button>
              </div>
            </div>

            {/* List Area */}
            <div className="max-h-[500px] overflow-y-auto scrollbar-none p-4">
              {notifications.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center gap-6 opacity-30">
                  <div className="w-20 h-20 rounded-[32px] bg-black/5 dark:bg-white/5 flex items-center justify-center">
                    <BellRing size={40} strokeWidth={1.5} />
                  </div>
                  <p className="text-sm font-black tracking-tight tracking-widest uppercase">Paz absoluta por aqui.</p>
                </div>
              ) : (
                <div className="space-y-3 mb-4">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-6 rounded-[32px] transition-all duration-300 group flex gap-5 border border-white/5 relative overflow-hidden ${!notif.lida ? 'bg-white/10 dark:bg-black/40 shadow-xl border-[var(--brand)]/20' : 'bg-black/5 dark:bg-white/5 opacity-50 hover:opacity-100 hover:bg-black/10 dark:hover:bg-white/10'}`}
                    >
                      {!notif.lida && <div className="absolute top-0 left-0 w-1.5 h-full bg-[var(--brand)] shadow-[0_0_20px_var(--brand)]" />}
                      
                      <div className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform duration-500 group-hover:scale-110 ${!notif.lida ? 'bg-white dark:bg-black shadow-2xl' : 'opacity-40'}`}>
                        {getIcon(notif.tipo)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex items-center gap-2">
                              {!notif.lida && <Sparkles size={10} className="text-[var(--brand)] animate-pulse" />}
                              <h4 className={`text-sm font-black tracking-tight truncate ${!notif.lida ? '' : 'opacity-60 font-bold'}`} style={{ color: "var(--text-primary)" }}>
                                {notif.titulo}
                              </h4>
                           </div>
                           <span className="text-[9px] font-black uppercase tracking-widest opacity-20 whitespace-nowrap ml-4">{formatDate(notif.created_at)}</span>
                        </div>
                        <p className={`text-[12px] leading-relaxed line-clamp-2 italic ${!notif.lida ? 'font-medium' : 'opacity-40'}`} style={{ color: "var(--text-secondary)" }}>
                          {notif.mensagem}
                        </p>
                        
                        {!notif.lida && (
                           <div className="mt-4 flex gap-6 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                             <button onClick={() => markAsRead(notif.id)} className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:scale-105 active:scale-95 transition-all">Aceitar</button>
                             <button onClick={() => deleteNotification(notif.id)} className="text-[10px] font-black uppercase tracking-widest text-rose-500 hover:scale-105 active:scale-95 transition-all">Ignorar</button>
                           </div>
                        )}
                      </div>
                      
                      {notif.lida && (
                        <button onClick={() => deleteNotification(notif.id)} className="opacity-0 group-hover:opacity-100 p-3 rounded-2xl bg-rose-500/10 text-rose-500 transition-all hover:scale-110 active:scale-90 shadow-lg">
                          <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Footer */}
            <div className="p-6 bg-black/5 dark:bg-white/5 border-t border-white/5 flex items-center justify-center gap-8">
               <button onClick={loadNotifications} className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--brand)] hover:opacity-70 transition-opacity">Sincronizar avisos</button>
               <div className="h-4 w-px bg-white/10" />
               <div className="flex items-center gap-2 opacity-30">
                  <Command size={10} />
                  <span className="text-[9px] font-black uppercase tracking-widest">Painel de Alertas</span>
               </div>
            </div>
          </div>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
