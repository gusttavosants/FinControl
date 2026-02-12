import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { despesasAPI } from '../lib/api';

export function useDespesas(mes?: number, ano?: number, pago?: boolean) {
  return useQuery({
    queryKey: ['despesas', mes, ano, pago],
    queryFn: () => despesasAPI.listar(mes, ano, pago),
    select: (response) => response.data,
  });
}

export function useCriarDespesa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: any) => despesasAPI.criar(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
    },
  });
}

export function useAtualizarDespesa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) =>
      despesasAPI.atualizar(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
    },
  });
}

export function useDeletarDespesa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => despesasAPI.deletar(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
    },
  });
}

export function useTogglePagoDespesa() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => despesasAPI.togglePago(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['despesas'] });
    },
  });
}
