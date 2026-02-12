import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../lib/api';

export function useDashboardResumo(mes?: number, ano?: number) {
  return useQuery({
    queryKey: ['dashboard', 'resumo', mes, ano],
    queryFn: () => dashboardAPI.resumo(mes, ano),
    select: (response) => response.data,
  });
}

export function useDashboardCategorias(mes?: number, ano?: number) {
  return useQuery({
    queryKey: ['dashboard', 'categorias', mes, ano],
    queryFn: () => dashboardAPI.categorias(mes, ano),
    select: (response) => response.data,
  });
}

export function useDashboardEvolucao(meses: number = 6) {
  return useQuery({
    queryKey: ['dashboard', 'evolucao', meses],
    queryFn: () => dashboardAPI.evolucao(meses),
    select: (response) => response.data,
  });
}

export function useDashboardVencimentos(dias: number = 30) {
  return useQuery({
    queryKey: ['dashboard', 'vencimentos', dias],
    queryFn: () => dashboardAPI.vencimentos(dias),
    select: (response) => response.data,
  });
}
