const API_BASE = process.env.NEXT_PUBLIC_API_URL
  ? `${process.env.NEXT_PUBLIC_API_URL}/api`
  : "/api";

async function fetchAPI(endpoint: string, options?: RequestInit & { noRedirect?: boolean }) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  
  // Get shared mode from localStorage (default to true)
  const sharedMode = typeof window !== "undefined" ? localStorage.getItem("sharedMode") !== "false" : true;
  headers["X-Shared-Mode"] = String(sharedMode);

  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers,
    ...options,
  });

  if (!res.ok && res.status !== 204) {
    if (res.status === 401 && typeof window !== "undefined") {
      console.warn("[AUTH] Session expired (401). Handling redirect logic...");
      localStorage.removeItem("token");
      
      // Normalize pathname (remove trailing slash except for root, and handle backslashes)
      const rawPath = window.location.pathname.replace(/\\/g, "/");
      const path = rawPath.length > 1 && rawPath.endsWith("/") ? rawPath.slice(0, -1) : (rawPath || "/");
      
      const PUBLIC_ROUTES = ["/", "/login", "/register"];
      const isPublicPath = PUBLIC_ROUTES.includes(path);
      
      console.log(`[PATH] Current Path: ${path} | Public: ${isPublicPath} | noRedirect: ${!!options?.noRedirect}`);

      if (!options?.noRedirect && !isPublicPath) {
        console.log("[AUTH] Redirecting to /login...");
        window.location.href = "/login";
      }
      throw new Error("Sessao expirada");
    }
    const err = await res.json().catch(() => ({ detail: "Erro desconhecido" }));
    throw new Error(err.detail || `API Error: ${res.status}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Auth
export const authAPI = {
  login: async (email: string, senha: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, senha }),
    });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ detail: "Erro ao fazer login" }));
      throw new Error(err.detail || "Erro ao fazer login");
    }
    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    return data;
  },
  register: async (nome: string, email: string, senha: string, plan: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nome, email, senha, plan }),
    });
    if (!res.ok) {
      const err = await res
        .json()
        .catch(() => ({ detail: "Erro ao criar conta" }));
      throw new Error(err.detail || "Erro ao criar conta");
    }
    return res.json();
  },
  me: (options?: any) => fetchAPI("/auth/me", options),
  demo: async () => {
    const res = await fetch(`${API_BASE}/auth/demo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) throw new Error("Erro ao acessar modo demonstração");
    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    if (data.user) localStorage.setItem("user", JSON.stringify(data.user));
    return data;
  },
  logout: () => {
    localStorage.removeItem("token");
    window.location.href = "/login";
  },
  markTourSeen: () => fetchAPI("/users/me/tour", { method: "PUT" }),
};


// Admin
export const adminAPI = {
  listUsers: () => fetchAPI("/admin/users"),
  createUser: (data: any) =>
    fetchAPI("/admin/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),
  updateRole: (userId: number, role: string) =>
    fetchAPI(`/admin/users/${userId}/role`, {
      method: "PUT",
      body: JSON.stringify({ role }),
    }),
  updateStatus: (userId: number, is_active: boolean) =>
    fetchAPI(`/admin/users/${userId}/status`, {
      method: "PUT",
      body: JSON.stringify({ is_active }),
    }),
  updatePlan: (userId: number, plan: string) =>
    fetchAPI(`/admin/users/${userId}/plan`, {
      method: "PUT",
      body: JSON.stringify({ plan }),
    }),
  getLogs: (limit: number = 100) => fetchAPI(`/admin/logs?limit=${limit}`),
};

// Chat
export const chatAPI = {
  getSessions: () => fetchAPI("/chat/sessions"),
  getSession: (id: number) => fetchAPI(`/chat/sessions/${id}`),
  deleteSession: (id: number) => fetchAPI(`/chat/sessions/${id}`, { method: "DELETE" }),
  send: (message: string, history: { role: string; content: string }[], session_id?: number) =>
    fetchAPI("/chat", {
      method: "POST",
      body: JSON.stringify({ message, history, session_id }),
    }),
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`${API_BASE}/chat/upload`, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error(`Erro ${res.status}`);
    return res.json();
  },
};

// Receitas
export const receitasAPI = {
  listar: (mes?: number, ano?: number) => {
    const params = new URLSearchParams();
    if (mes) params.set("mes", String(mes));
    if (ano) params.set("ano", String(ano));
    return fetchAPI(`/receitas?${params}`);
  },
  criar: (data: any) =>
    fetchAPI("/receitas", { method: "POST", body: JSON.stringify(data) }),
  atualizar: (id: number, data: any) =>
    fetchAPI(`/receitas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletar: (id: number) => fetchAPI(`/receitas/${id}`, { method: "DELETE" }),
};

// Despesas
export const despesasAPI = {
  listar: (mes?: number, ano?: number, pago?: boolean) => {
    const params = new URLSearchParams();
    if (mes) params.set("mes", String(mes));
    if (ano) params.set("ano", String(ano));
    if (pago !== undefined) params.set("pago", String(pago));
    return fetchAPI(`/despesas?${params}`);
  },
  criar: (data: any) =>
    fetchAPI("/despesas", { method: "POST", body: JSON.stringify(data) }),
  atualizar: (id: number, data: any) =>
    fetchAPI(`/despesas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletar: (id: number) => fetchAPI(`/despesas/${id}`, { method: "DELETE" }),
  togglePago: (id: number) =>
    fetchAPI(`/despesas/${id}/pagar`, { method: "PATCH" }),
};

// Dashboard
export const dashboardAPI = {
  resumo: (mes?: number, ano?: number) => {
    const params = new URLSearchParams();
    if (mes) params.set("mes", String(mes));
    if (ano) params.set("ano", String(ano));
    return fetchAPI(`/dashboard/resumo?${params}`);
  },
  categorias: (mes?: number, ano?: number) => {
    const params = new URLSearchParams();
    if (mes) params.set("mes", String(mes));
    if (ano) params.set("ano", String(ano));
    return fetchAPI(`/dashboard/categorias?${params}`);
  },
  evolucao: (meses: number = 6) =>
    fetchAPI(`/dashboard/evolucao?meses=${meses}`),
  vencimentos: (dias: number = 30) =>
    fetchAPI(`/dashboard/vencimentos?dias=${dias}`),
};

// Categorias
export const categoriasAPI = {
  receita: () => fetchAPI("/categorias/receita"),
  despesa: () => fetchAPI("/categorias/despesa"),
};

// Relatórios
export const relatoriosAPI = {
  mensal: (mes?: number, ano?: number) => {
    const params = new URLSearchParams();
    if (mes) params.set("mes", String(mes));
    if (ano) params.set("ano", String(ano));
    return fetchAPI(`/relatorios/mensal?${params}`);
  },
  comparativo: (meses: number = 12) =>
    fetchAPI(`/relatorios/comparativo?meses=${meses}`),
};

// Orçamento
export const orcamentoAPI = {
  listar: (mes?: number, ano?: number) => {
    const params = new URLSearchParams();
    if (mes) params.set("mes", String(mes));
    if (ano) params.set("ano", String(ano));
    return fetchAPI(`/orcamento?${params}`);
  },
  resumo: (mes?: number, ano?: number) => {
    const params = new URLSearchParams();
    if (mes) params.set("mes", String(mes));
    if (ano) params.set("ano", String(ano));
    return fetchAPI(`/orcamento/resumo?${params}`);
  },
  criar: (data: any) =>
    fetchAPI("/orcamento", { method: "POST", body: JSON.stringify(data) }),
  deletar: (id: number) => fetchAPI(`/orcamento/${id}`, { method: "DELETE" }),
};

// Metas
export const metasAPI = {
  listar: () => fetchAPI("/metas"),
  criar: (data: any) =>
    fetchAPI("/metas", { method: "POST", body: JSON.stringify(data) }),
  atualizar: (id: number, data: any) =>
    fetchAPI(`/metas/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletar: (id: number) => fetchAPI(`/metas/${id}`, { method: "DELETE" }),
};

// Seed
export const seedAPI = {
  seed: () => fetchAPI("/seed", { method: "POST" }),
};

// Export
export const exportAPI = {
  excel: (mes?: number, ano?: number) => {
    const params = new URLSearchParams();
    if (mes) params.set("mes", String(mes));
    if (ano) params.set("ano", String(ano));
    return `${API_BASE}/export/excel?${params}`;
  },
  csv: (tipo: string, mes?: number, ano?: number) => {
    const params = new URLSearchParams();
    params.set("tipo", tipo);
    if (mes) params.set("mes", String(mes));
    if (ano) params.set("ano", String(ano));
    return `${API_BASE}/export/csv?${params}`;
  },
};

// Search
export const searchAPI = {
  search: (q: string) => fetchAPI(`/search?q=${encodeURIComponent(q)}`),
};

// Conta Compartilhada (Plano Casal)
export const sharedAccountAPI = {
  status: () => fetchAPI("/shared-account/status"),
  invite: (partner_email: string) =>
    fetchAPI("/shared-account/invite", {
      method: "POST",
      body: JSON.stringify({ partner_email }),
    }),
  accept: (accountId: number) =>
    fetchAPI(`/shared-account/${accountId}/accept`, { method: "POST" }),
  reject: (accountId: number) =>
    fetchAPI(`/shared-account/${accountId}/reject`, { method: "POST" }),
  remove: (accountId: number) =>
    fetchAPI(`/shared-account/${accountId}`, { method: "DELETE" }),
};

// Investimentos
export const investimentosAPI = {
  listar: () => fetchAPI("/investimentos"),
  criar: (data: any) =>
    fetchAPI("/investimentos", { method: "POST", body: JSON.stringify(data) }),
  atualizar: (id: number, data: any) =>
    fetchAPI(`/investimentos/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),
  deletar: (id: number) =>
    fetchAPI(`/investimentos/${id}`, { method: "DELETE" }),
  resumo: () => fetchAPI("/investimentos/resumo"),
};

// Cotações (BRAPI proxy)
export const cotacoesAPI = {
  cotacao: (ticker: string) => fetchAPI(`/cotacao/${ticker}`),
  historico: (ticker: string, range: string = "1mo") =>
    fetchAPI(`/cotacao/${ticker}/historico?range=${range}`),
  batch: (tickers: string[]) =>
    fetchAPI(`/cotacoes/batch?tickers=${tickers.join(",")}`),
};

// Notificações
export const notificationsAPI = {
  listar: () => fetchAPI("/notifications"),
  listarNaoLidas: () => fetchAPI("/notifications/unread"),
  marcarLida: (id: number) =>
    fetchAPI(`/notifications/${id}/read`, { method: "PATCH" }),
  gerar: () => fetchAPI("/notifications/generate", { method: "POST" }),
  deletar: (id: number) =>
    fetchAPI(`/notifications/${id}`, { method: "DELETE" }),
};

// Pagamentos
export const paymentAPI = {
  checkout: (plan: string, payment_method: string) =>
    fetchAPI("/payment/checkout", {
      method: "POST",
      body: JSON.stringify({ plan, payment_method }),
    }),
  getSubscription: () => fetchAPI("/payment/subscription"),
  getHistory: () => fetchAPI("/payment/payments/history"),
  getPortal: () => fetchAPI("/payment/portal"),
  cancelSubscription: (reason?: string) =>
    fetchAPI("/payment/subscription/cancel", {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
};

// Notas
export const notesAPI = {
  listar: () => fetchAPI("/notes"),
  obter: (id: number) => fetchAPI(`/notes/${id}`),
  criar: (data: any) => fetchAPI("/notes", { method: "POST", body: JSON.stringify(data) }),
  atualizar: (id: number, data: any) => fetchAPI(`/notes/${id}`, { method: "PUT", body: JSON.stringify(data) }),
  deletar: (id: number) => fetchAPI(`/notes/${id}`, { method: "DELETE" }),
  processar: (id: number) => fetchAPI(`/notes/${id}/process`, { method: "POST" }),
};
