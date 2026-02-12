import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  RefreshControl, TextInput, Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { sharedAccountAPI } from '@/lib/api';
import { User, Users, Mail, LogOut, UserPlus, UserMinus, Check, X } from 'lucide-react-native';

export default function PerfilScreen() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [partnerEmail, setPartnerEmail] = useState('');

  const { data: sharedStatus, isLoading, refetch } = useQuery({
    queryKey: ['shared-account'],
    queryFn: () => sharedAccountAPI.status(),
    select: (response) => response.data,
  });

  const invite = useMutation({
    mutationFn: (email: string) => sharedAccountAPI.invite(email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-account'] });
      setPartnerEmail('');
      Alert.alert('Sucesso', 'Convite enviado!');
    },
    onError: (err: any) => {
      Alert.alert('Erro', err.response?.data?.detail || 'Erro ao enviar convite');
    },
  });

  const accept = useMutation({
    mutationFn: (id: number) => sharedAccountAPI.accept(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-account'] });
      Alert.alert('Sucesso', 'Convite aceito!');
    },
  });

  const reject = useMutation({
    mutationFn: (id: number) => sharedAccountAPI.reject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-account'] });
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => sharedAccountAPI.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shared-account'] });
      Alert.alert('Sucesso', 'Conta compartilhada removida');
    },
  });

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const handleInvite = () => {
    if (!partnerEmail) {
      Alert.alert('Erro', 'Digite o email do parceiro(a)');
      return;
    }
    invite.mutate(partnerEmail);
  };

  const handleRemove = (id: number) => {
    Alert.alert('Confirmar', 'Remover conta compartilhada?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Remover', style: 'destructive', onPress: () => remove.mutate(id) },
    ]);
  };

  const hasActiveShared = sharedStatus?.some((s: any) => s.status === 'accepted');
  const pendingInvites = sharedStatus?.filter((s: any) => s.status === 'pending') || [];

  return (
    <View className="flex-1 bg-slate-900">
      <ScrollView
        className="flex-1"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#a3e635" />}
      >
        <View className="px-5 pt-14 pb-4">
          <Text className="text-white text-xl font-bold mb-6">Perfil</Text>

          <View className="bg-slate-800 p-5 rounded-xl border border-slate-700 mb-6">
            <View className="flex-row items-center gap-4 mb-4">
              <View className="bg-lime-900 w-14 h-14 rounded-full items-center justify-center">
                <User color="#a3e635" size={28} />
              </View>
              <View>
                <Text className="text-white font-bold text-lg">{user?.nome}</Text>
                <Text className="text-slate-400 text-sm">{user?.email}</Text>
              </View>
            </View>
          </View>

          <View className="bg-slate-800 p-5 rounded-xl border border-slate-700 mb-6">
            <View className="flex-row items-center gap-2 mb-4">
              <Users color="#a3e635" size={20} />
              <Text className="text-white font-bold text-base">Plano Casal</Text>
            </View>

            {isLoading ? (
              <ActivityIndicator color="#a3e635" />
            ) : hasActiveShared ? (
              <View>
                {sharedStatus?.filter((s: any) => s.status === 'accepted').map((s: any) => (
                  <View key={s.id} className="flex-row justify-between items-center bg-slate-700 p-3 rounded-lg mb-2">
                    <View className="flex-row items-center gap-2">
                      <Check color="#a3e635" size={16} />
                      <Text className="text-slate-300 text-sm">{s.partner_email}</Text>
                    </View>
                    <TouchableOpacity
                      className="bg-red-900 p-2 rounded-lg"
                      onPress={() => handleRemove(s.id)}
                    >
                      <UserMinus color="#ef4444" size={16} />
                    </TouchableOpacity>
                  </View>
                ))}
                <Text className="text-slate-500 text-xs mt-2">
                  Dados financeiros compartilhados entre ambos
                </Text>
              </View>
            ) : (
              <View>
                <Text className="text-slate-400 text-sm mb-4">
                  Compartilhe seus dados financeiros com seu parceiro(a). Ambos poderao ver e editar receitas, despesas e metas.
                </Text>

                {pendingInvites.length > 0 && (
                  <View className="mb-4">
                    <Text className="text-slate-300 text-sm font-bold mb-2">Convites pendentes:</Text>
                    {pendingInvites.map((s: any) => (
                      <View key={s.id} className="flex-row justify-between items-center bg-slate-700 p-3 rounded-lg mb-2">
                        <Text className="text-slate-300 text-sm flex-1">{s.partner_email}</Text>
                        <View className="flex-row gap-2">
                          <TouchableOpacity
                            className="bg-lime-900 p-2 rounded-lg"
                            onPress={() => accept.mutate(s.id)}
                          >
                            <Check color="#a3e635" size={16} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            className="bg-red-900 p-2 rounded-lg"
                            onPress={() => reject.mutate(s.id)}
                          >
                            <X color="#ef4444" size={16} />
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                <View className="flex-row gap-2">
                  <TextInput
                    className="flex-1 bg-slate-700 text-white p-3 rounded-lg border border-slate-600"
                    placeholder="Email do parceiro(a)"
                    placeholderTextColor="#94a3b8"
                    value={partnerEmail}
                    onChangeText={setPartnerEmail}
                    keyboardType="email-address"
                  />
                  <TouchableOpacity
                    className="bg-lime-500 px-4 rounded-lg justify-center"
                    onPress={handleInvite}
                    disabled={invite.isPending}
                  >
                    {invite.isPending ? (
                      <ActivityIndicator color="#000" size="small" />
                    ) : (
                      <UserPlus color="#000" size={20} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          <TouchableOpacity
            className="bg-red-900 p-4 rounded-xl flex-row items-center justify-center gap-2"
            onPress={() => {
              Alert.alert('Sair', 'Deseja sair da conta?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Sair', style: 'destructive', onPress: logout },
              ]);
            }}
          >
            <LogOut color="#ef4444" size={20} />
            <Text className="text-red-400 font-bold">Sair da Conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
