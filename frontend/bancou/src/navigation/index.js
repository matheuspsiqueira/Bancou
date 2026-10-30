// src/navigation/index.js
import React, { useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from '../context/AuthContext';
import { registrarTela } from '../analytics';

import SplashScreen    from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen      from '../screens/AuthScreen';
import RecuperarSenhaScreen from '../screens/RecuperarSenhaScreen';
import DemoScreen      from '../screens/DemoScreen';
import DemoScoreScreen from '../screens/DemoScoreScreen';
import PartidaScreen from '../screens/PartidaScreen';
import FiltrosPartidaScreen from '../screens/FiltrosPartidaScreen';
import ScoreScreen   from '../screens/ScoreScreen';
import HistoricoScreen from '../screens/HistoricoScreen';
import HistoricoQuestaoScreen from '../screens/HistoricoQuestaoScreen';
import TabNavigator from './TabNavigator';

const Stack = createNativeStackNavigator();
const navigationRef = createNavigationContainerRef();

function RootNavigator() {
  const { autenticado, checando } = useAuth();

  if (checando) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#6C63FF" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
      {autenticado ? (
        // ── Stack autenticado ──────────────────────────────────────────
        <>
          <Stack.Screen name="Home"    component={TabNavigator} />
          <Stack.Screen name="FiltrosPartida" component={FiltrosPartidaScreen} />
          <Stack.Screen name="Partida" component={PartidaScreen} />
          <Stack.Screen name="Score"   component={ScoreScreen} />
          <Stack.Screen name="Historico" component={HistoricoScreen} />
          <Stack.Screen name="HistoricoQuestao" component={HistoricoQuestaoScreen} />
        </>
      ) : (
        // ── Stack não autenticado ──────────────────────────────────────
        <>
          <Stack.Screen name="Splash"      component={SplashScreen} />
          <Stack.Screen name="Onboarding"  component={OnboardingScreen} />
          <Stack.Screen name="Auth"        component={AuthScreen} />
          <Stack.Screen name="RecuperarSenha" component={RecuperarSenhaScreen} />
          <Stack.Screen name="Demo"        component={DemoScreen} />
          <Stack.Screen name="DemoScore"   component={DemoScoreScreen} />
        </>
      )}
    </Stack.Navigator>
  );
}

export default function Navigation() {
  // Última tela enviada ao Analytics — evita screen_view duplicado quando
  // o estado de navegação muda sem trocar de tela (params, por exemplo).
  const rotaAtual = useRef(null);

  return (
    <AuthProvider>
      <NavigationContainer
        ref={navigationRef}
        onReady={() => {
          rotaAtual.current = navigationRef.getCurrentRoute()?.name ?? null;
          registrarTela(rotaAtual.current);
        }}
        onStateChange={() => {
          // getCurrentRoute devolve a rota mais interna em foco, então as
          // abas do TabNavigator aparecem pelo próprio nome.
          const atual = navigationRef.getCurrentRoute()?.name ?? null;
          if (atual && atual !== rotaAtual.current) registrarTela(atual);
          rotaAtual.current = atual;
        }}
      >
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}