// src/context/AuthContext.js
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';


const AuthContext = createContext();


export function AuthProvider({ children }) {
  const [autenticado, setAutenticado] = useState(false);
  const [checando,    setChecando]    = useState(true);
  const [usuario,     setUsuario]     = useState(null);

  // Refs pra ler o estado mais recente dentro do listener do AppState
  // sem precisar recriar o listener a cada mudança de autenticado/usuario.
  const autenticadoRef = useRef(autenticado);
  const appStateRef     = useRef(AppState.currentState);

  useEffect(() => {
    autenticadoRef.current = autenticado;
  }, [autenticado]);

  // ── signOut ───────────────────────────────────────────────────────────
  const signOut = useCallback(async () => {
    await AsyncStorage.removeItem('access_token');
    await AsyncStorage.removeItem('refresh_token');
    setUsuario(null);
    setAutenticado(false);
  }, []);

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
  }, [signOut]);

  // ── Busca dados do perfil na API (agora via authFetch, com auto-refresh) ──
  const carregarPerfil = useCallback(async () => {
    try {
      const resp = await authFetch('/api/usuarios/perfil/');
      if (resp.ok) {
        const data = await resp.json();
        setUsuario(data); // substitui por completo — evita mesclar dados velhos com novos
      }
      // se não for ok (401 mesmo após tentativa de refresh), authFetch já
      // chamou signOut() internamente — nada mais a fazer aqui.
    } catch {
      // silencioso — falha de rede, mantém o que já está em estado
    }
  }, [authFetch]);

  // ── Verifica token ao abrir o app ─────────────────────────────────────
  useEffect(() => {
    const verificar = async () => {
      try {
        const token = await AsyncStorage.getItem('access_token');
        if (token) {
          setAutenticado(true);
          await carregarPerfil();
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
  }, [carregarPerfil]);

  // ── Recarrega o perfil sempre que o app volta a ficar ativo ───────────
  // Cobre o caso do Android pausar/matar parcialmente o processo ao
  // minimizar o app: sem isso, o estado do usuário fica "congelado" ou
  // mesclado de forma inconsistente até um novo mount da Splash.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (proximoEstado) => {
      const voltouParaAtivo =
        appStateRef.current.match(/inactive|background/) && proximoEstado === 'active';

      appStateRef.current = proximoEstado;

      if (voltouParaAtivo && autenticadoRef.current) {
        await carregarPerfil();
      }
    });

    return () => subscription.remove();
  }, [carregarPerfil]);

  // ── signIn ────────────────────────────────────────────────────────────
  const signIn = async (access, refresh) => {
    await AsyncStorage.setItem('access_token', access);
    await AsyncStorage.setItem('refresh_token', refresh);
    setAutenticado(true);
    await carregarPerfil();
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