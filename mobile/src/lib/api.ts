import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';

const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 10000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('user');
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (nome: string, email: string, senha: string) =>
    api.post('/auth/register', { nome, email, senha }),
  login: (email: string, senha: string) =>
    api.post('/auth/login', { email, senha }),
  me: () => api.get('/auth/me'),
  refresh: () => api.post('/auth/refresh'),
};

export const receitasAPI = {
  listar: (mes?: number, ano?: number) =>
    api.get('/receitas', { params: { mes, ano } }),
  criar: (data: any) => api.post('/receitas', data),
  atualizar: (id: number, data: any) => api.put(`/receitas/${id}`, data),
  deletar: (id: number) => api.delete(`/receitas/${id}`),
};

export const despesasAPI = {
  listar: (mes?: number, ano?: number, pago?: boolean) =>
    api.get('/despesas', { params: { mes, ano, pago } }),
  criar: (data: any) => api.post('/despesas', data),
  atualizar: (id: number, data: any) => api.put(`/despesas/${id}`, data),
  deletar: (id: number) => api.delete(`/despesas/${id}`),
  togglePago: (id: number) => api.patch(`/despesas/${id}/pagar`),
};

export const dashboardAPI = {
  resumo: (mes?: number, ano?: number) =>
    api.get('/dashboard/resumo', { params: { mes, ano } }),
  categorias: (mes?: number, ano?: number) =>
    api.get('/dashboard/categorias', { params: { mes, ano } }),
  evolucao: (meses: number = 6) =>
    api.get('/dashboard/evolucao', { params: { meses } }),
  vencimentos: (dias: number = 30) =>
    api.get('/dashboard/vencimentos', { params: { dias } }),
};

export const notificacoesAPI = {
  listar: () => api.get('/notifications'),
  naoLidas: () => api.get('/notifications/unread'),
  marcarLida: (id: number) => api.patch(`/notifications/${id}/read`),
  deletar: (id: number) => api.delete(`/notifications/${id}`),
};

export const sharedAccountAPI = {
  status: () => api.get('/shared-account/status'),
  invite: (partner_email: string) =>
    api.post('/shared-account/invite', { partner_email }),
  accept: (account_id: number) =>
    api.post(`/shared-account/${account_id}/accept`),
  reject: (account_id: number) =>
    api.post(`/shared-account/${account_id}/reject`),
  remove: (account_id: number) =>
    api.delete(`/shared-account/${account_id}`),
};

export default api;
