import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'expo-router';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !senha) {
      setError('Preencha todos os campos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await login(email, senha);
      router.replace('/(app)');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-900 justify-center px-6">
      <Text className="text-3xl font-bold text-white mb-8 text-center">FinControl</Text>

      {error && (
        <View className="bg-red-900 p-4 rounded-lg mb-4">
          <Text className="text-red-100">{error}</Text>
        </View>
      )}

      <TextInput
        className="bg-slate-800 text-white p-4 rounded-lg mb-4 border border-slate-700"
        placeholder="Email"
        placeholderTextColor="#94a3b8"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
        keyboardType="email-address"
      />

      <TextInput
        className="bg-slate-800 text-white p-4 rounded-lg mb-6 border border-slate-700"
        placeholder="Senha"
        placeholderTextColor="#94a3b8"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        editable={!loading}
      />

      <TouchableOpacity
        className="bg-lime-500 p-4 rounded-lg mb-4"
        onPress={handleLogin}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text className="text-black font-bold text-center">Entrar</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity onPress={() => router.push('/(auth)/register')}>
        <Text className="text-slate-400 text-center">
          Nao tem conta? <Text className="text-lime-500 font-bold">Registre-se</Text>
        </Text>
      </TouchableOpacity>
    </View>
  );
}
