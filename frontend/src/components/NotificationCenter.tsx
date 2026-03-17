"use client";

import { useState, useEffect } from "react";
import { Bell, X, Check, BellRing, Info, AlertTriangle, AlertCircle, CheckCircle2, Trash2 } from "lucide-react";
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
      case "alerta":
      case "warning": return <AlertTriangle className="text-amber-500" size={16} />;
      case "erro":
      case "danger": return <AlertCircle className="text-rose-500" size={16} />;
      case "sucesso":
      case "success": return <CheckCircle2 className="text-emerald-500" size={16} />;
      default: return <Info className="text-blue-500" size={16} />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2.5 rounded-xl transition-all duration-200 border ${
          isOpen ? 'bg-slate-100 dark:bg-slate-800 border-brand shadow-inner' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <Bell size={20} className={unreadCount > 0 ? "animate-pulse" : ""} style={{ color: "var(--text-secondary)" }} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand text-[10px] font-black text-white shadow-lg ring-2 ring-white dark:ring-slate-900">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[360px] animate-in slide-in-from-top-2 duration-300 z-50">
          <div className="glass-card overflow-hidden !shadow-2xl border-brand/10">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white/50 dark:bg-slate-900/50">
              <div>
                <h3 className="text-sm font-black" style={{ color: "var(--text-primary)" }}>Central de Avisos</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">{unreadCount} pendentes hoje</p>
              </div>
              <div className="flex gap-2">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="btn-ghost !p-1.5" title="Marcar todas como lidas">
                    <Check size={14} className="text-emerald-500" />
                  </button>
                )}
                <button onClick={() => setIsOpen(false)} className="btn-ghost !p-1.5">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="max-h-[440px] overflow-y-auto scrollbar-thin">
              {notifications.length === 0 ? (
                <div className="py-20 flex flex-col items-center justify-center gap-3 opacity-30">
                  <BellRing size={40} />
                  <p className="text-xs font-medium">Nenhum aviso por aqui.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-4 transition-all duration-150 group flex gap-4 ${!notif.lida ? 'bg-brand/[0.02] border-l-2 border-l-brand' : ''}`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${!notif.lida ? 'bg-white dark:bg-slate-800 shadow-sm' : 'opacity-40'}`}>
                        {getIcon(notif.tipo)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className={`text-xs font-black truncate ${!notif.lida ? '' : 'opacity-50'}`} style={{ color: "var(--text-primary)" }}>
                            {notif.titulo}
                          </h4>
                          <span className="text-[9px] font-bold opacity-30 whitespace-nowrap">{formatDate(notif.created_at)}</span>
                        </div>
                        <p className={`text-[11px] leading-relaxed line-clamp-2 ${!notif.lida ? '' : 'opacity-40'}`} style={{ color: "var(--text-secondary)" }}>
                          {notif.mensagem}
                        </p>
                        
                        {!notif.lida && (
                           <div className="mt-3 flex gap-4 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => markAsRead(notif.id)} className="text-[10px] font-black text-emerald-500 hover:underline">Marcar como lida</button>
                             <button onClick={() => deleteNotification(notif.id)} className="text-[10px] font-black text-rose-500 hover:underline">Excluir</button>
                           </div>
                        )}
                      </div>
                      
                      {notif.lida && (
                        <button onClick={() => deleteNotification(notif.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-rose-500 transition-all">
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-3 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 text-center">
               <button onClick={loadNotifications} className="text-[10px] font-black uppercase tracking-widest text-brand hover:opacity-70 transition-opacity">Atualizar agora</button>
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
