import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { authAPI } from '../lib/api';

interface User {
  id: number;
  nome: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  register: (nome: string, email: string, senha: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    bootstrapAsync();
  }, []);

  const bootstrapAsync = async () => {
    try {
      const savedToken = await SecureStore.getItemAsync('access_token');
      const savedUser = await SecureStore.getItemAsync('user');

      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('Failed to restore token', e);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, senha: string) => {
    try {
      const response = await authAPI.login(email, senha);
      const { access_token, user: userData } = response.data;

      await SecureStore.setItemAsync('access_token', access_token);
      await SecureStore.setItemAsync('user', JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const register = async (nome: string, email: string, senha: string) => {
    try {
      const response = await authAPI.register(nome, email, senha);
      const { access_token, user: userData } = response.data;

      await SecureStore.setItemAsync('access_token', access_token);
      await SecureStore.setItemAsync('user', JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await SecureStore.deleteItemAsync('access_token');
      await SecureStore.deleteItemAsync('user');
      setToken(null);
      setUser(null);
    } catch (error) {
      console.error('Failed to logout', error);
    }
  };

  const refreshToken = async () => {
    try {
      const response = await authAPI.refresh();
      const { access_token, user: userData } = response.data;

      await SecureStore.setItemAsync('access_token', access_token);
      await SecureStore.setItemAsync('user', JSON.stringify(userData));

      setToken(access_token);
      setUser(userData);
    } catch (error) {
      await logout();
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
