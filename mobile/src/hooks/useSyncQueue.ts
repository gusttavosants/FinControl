import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNetworkStatus } from './useNetworkStatus';
import { getQueue, removeFromQueue, OfflineOperation } from '@/lib/offlineQueue';
import { despesasAPI, receitasAPI } from '@/lib/api';
import api from '@/lib/api';

async function processOperation(op: OfflineOperation): Promise<void> {
  switch (op.entity) {
    case 'despesas':
      if (op.type === 'create') await despesasAPI.criar(op.payload);
      else if (op.type === 'update') await despesasAPI.atualizar(op.payload.id, op.payload.data);
      else if (op.type === 'delete') await despesasAPI.deletar(op.payload.id);
      break;
    case 'receitas':
      if (op.type === 'create') await receitasAPI.criar(op.payload);
      else if (op.type === 'update') await receitasAPI.atualizar(op.payload.id, op.payload.data);
      else if (op.type === 'delete') await receitasAPI.deletar(op.payload.id);
      break;
    case 'metas':
      if (op.type === 'create') await api.post('/metas', op.payload);
      else if (op.type === 'update') await api.put(`/metas/${op.payload.id}`, op.payload.data);
      else if (op.type === 'delete') await api.delete(`/metas/${op.payload.id}`);
      break;
  }
}

export function useSyncQueue() {
  const { isConnected } = useNetworkStatus();
  const queryClient = useQueryClient();

  const syncQueue = useCallback(async () => {
    const queue = await getQueue();
    if (queue.length === 0) return;

    for (const op of queue) {
      try {
        await processOperation(op);
        await removeFromQueue(op.id);
      } catch (err) {
        console.warn(`[SyncQueue] Failed to sync operation ${op.id}:`, err);
        break;
      }
    }

    queryClient.invalidateQueries({ queryKey: ['despesas'] });
    queryClient.invalidateQueries({ queryKey: ['receitas'] });
    queryClient.invalidateQueries({ queryKey: ['metas'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  }, [queryClient]);

  useEffect(() => {
    if (isConnected) {
      syncQueue();
    }
  }, [isConnected, syncQueue]);

  return { syncQueue, isConnected };
}
