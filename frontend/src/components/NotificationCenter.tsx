import { useState, useEffect } from "react";
import { Bell, X, Check } from "lucide-react";
import { notificationsAPI } from "@/lib/api";

interface Notification {
  id: number;
  titulo: string;
  mensagem: string;
  tipo: string;
  lida: boolean;
  referencia_id?: number;
  referencia_tipo?: string;
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

  const generateNotifications = async () => {
    setLoading(true);
    try {
      await notificationsAPI.gerar();
      await loadNotifications();
    } catch (error) {
      console.error("Erro ao gerar notificações:", error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await notificationsAPI.marcarLida(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, lida: true } : n)
      );
    } catch (error) {
      console.error("Erro ao marcar como lida:", error);
    }
  };

  const deleteNotification = async (id: number) => {
    try {
      await notificationsAPI.deletar(id);
      setNotifications(prev => prev.filter(n => n.id !== id));
    } catch (error) {
      console.error("Erro ao deletar notificação:", error);
    }
  };

  useEffect(() => {
    loadNotifications();
    // Verificar notificações a cada 5 minutos
    const interval = setInterval(loadNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.lida).length;

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-slate-100 transition-colors"
      >
        <Bell size={20} className="text-slate-600" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-slate-200 shadow-lg z-50">
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-800">Notificações</h3>
              <button
                onClick={generateNotifications}
                disabled={loading}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
              >
                {loading ? "..." : "Gerar"}
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-500">
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                    !notification.lida ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm text-slate-800">
                        {notification.titulo}
                      </h4>
                      <p className="text-sm text-slate-600 mt-1">
                        {notification.mensagem}
                      </p>
                      <span className="text-xs text-slate-400 mt-2 block">
                        {new Date(notification.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {!notification.lida && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 hover:bg-green-100 rounded"
                          title="Marcar como lida"
                        >
                          <Check size={14} className="text-green-600" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1 hover:bg-red-100 rounded"
                        title="Deletar"
                      >
                        <X size={14} className="text-red-600" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
