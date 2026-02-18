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
    // Verificar notificações a cada 5 minutos
    const interval = setInterval(loadNotifications, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter((n) => !n.lida).length;

  return (
    <div className="relative">
      {/* Bell Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-xl transition-colors"
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-secondary)",
        }}
      >
        <Bell size={18} style={{ color: "var(--text-secondary)" }} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #f93a4a, #dd5f02)" }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-80 z-50 overflow-hidden"
          style={{
            background: "var(--bg-card)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-card)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
          }}
        >
          <div
            className="p-4"
            style={{ borderBottom: "1px solid var(--border-subtle)" }}
          >
            <div className="flex items-center justify-between">
              <h3
                className="font-semibold"
                style={{ color: "var(--text-primary)" }}
              >
                Notificações
              </h3>
              <button
                onClick={generateNotifications}
                disabled={loading}
                className="btn-ghost disabled:opacity-50"
                style={{ color: "var(--brand)" }}
              >
                {loading ? "..." : "Gerar"}
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div
                className="p-6 text-center text-sm"
                style={{ color: "var(--text-muted)" }}
              >
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-4 transition-colors"
                  style={{
                    borderBottom: "1px solid var(--border-subtle)",
                    background: !notification.lida
                      ? "rgba(51,102,255,0.06)"
                      : "transparent",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = "var(--bg-card-hover)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = !notification.lida
                      ? "rgba(51,102,255,0.06)"
                      : "transparent")
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <h4
                        className="font-semibold text-sm"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {notification.titulo}
                      </h4>
                      <p
                        className="text-sm mt-1"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {notification.mensagem}
                      </p>
                      <span
                        className="text-xs mt-2 block"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {new Date(notification.created_at).toLocaleDateString(
                          "pt-BR",
                        )}
                      </span>
                    </div>
                    <div className="flex gap-1">
                      {!notification.lida && (
                        <button
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 rounded-lg transition-colors"
                          style={{ color: "#17b364" }}
                          title="Marcar como lida"
                        >
                          <Check size={14} className="text-green-600" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1 rounded-lg transition-colors"
                        style={{ color: "#f93a4a" }}
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
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
      )}
    </div>
  );
}
