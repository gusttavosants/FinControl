import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'FINCONTROL_OFFLINE_QUEUE';

export interface OfflineOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: 'despesas' | 'receitas' | 'metas';
  payload: any;
  timestamp: number;
}

export async function addToQueue(operation: Omit<OfflineOperation, 'id' | 'timestamp'>): Promise<void> {
  const queue = await getQueue();
  const newOp: OfflineOperation = {
    ...operation,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    timestamp: Date.now(),
  };
  queue.push(newOp);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function getQueue(): Promise<OfflineOperation[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((op) => op.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

export async function getQueueSize(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}
