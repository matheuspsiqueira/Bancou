// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';


const AuthContext = createContext();


export function AuthProvider({ children }) {
  const [autenticado, setAutenticado] = useState(false);
  const [checando,    setChecando]    = useState(true);
  const [usuario,     setUsuario]     = useState(null);

  // ── Verifica token ao abrir o app ─────────────────────────────────────
  useEffect(() => {
    const verificar = async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (token) {
          setAutenticado(true);
          await carregarPerfil(token);
        } else {
          setAutenticado(false);
        }
      } catch {
        setAutenticado(false);
      } finally {
        setChecando(false);
      }
    };
    verificar();
  }, []);

  // ── Busca dados do perfil na API ──────────────────────────────────────
  const carregarPerfil = async (token) => {
    try {
      const resp = await fetch(`${API_URL}/api/usuarios/perfil/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true',
        },
      });
      if (resp.ok) {
        const data = await resp.json();
        setUsuario((prev) => ({ ...prev, ...data }));
      }
    } catch {
      // silencioso — campos mock serão usados para os campos ausentes
    }
  };

  // ── Chamada autenticada com refresh automático ────────────────────────
  const authFetch = useCallback(async (path, options = {}) => {
    let access = await AsyncStorage.getItem('access_token');

    const fazer = (tok) =>
      fetch(`${API_URL}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tok}`,
          'ngrok-skip-browser-warning': 'true',
          ...(options.headers || {}),
        },
      });

    let resp = await fazer(access);

    // Token expirado → tenta refresh
    if (resp.status === 401) {
      const refresh = await AsyncStorage.getItem('refresh_token');
      if (!refresh) { await signOut(); return resp; }

      const refreshResp = await fetch(`${API_URL}/api/usuarios/token/refresh/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: JSON.stringify({ refresh }),
      });

      if (refreshResp.ok) {
        const { access: novoToken } = await refreshResp.json();
        await AsyncStorage.setItem('access_token', novoToken);
        resp = await fazer(novoToken);
      } else {
        await signOut();
      }
    }

    return resp;
  }, []);

  // ── signIn ────────────────────────────────────────────────────────────
  const signIn = async (access, refresh) => {
    await AsyncStorage.setItem('access_token', access);
    await AsyncStorage.setItem('refresh_token', refresh);
    setAutenticado(true);
    await carregarPerfil(access);
  };

  // ── signOut ───────────────────────────────────────────────────────────
  const signOut = async () => {
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('refresh_token');
    setUsuario(null);
    setAutenticado(false);
  };

  // ── Atualiza campos do usuário localmente após edição ─────────────────
  const atualizarUsuario = (campos) => {
    setUsuario((prev) => ({ ...prev, ...campos }));
  };

  return (
    <AuthContext.Provider
      value={{ autenticado, checando, usuario, signIn, signOut, authFetch, atualizarUsuario }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}