// src/navigation/index.js
import React from 'react';
import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { AuthProvider, useAuth } from '../context/AuthContext';

import SplashScreen    from '../screens/SplashScreen';
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen      from '../screens/AuthScreen';
import RecuperarSenhaScreen from '../screens/RecuperarSenhaScreen';
import DemoScreen      from '../screens/DemoScreen';
import DemoScoreScreen from '../screens/DemoScoreScreen';
import HomeScreen      from '../screens/HomeScreen';
import PartidaScreen from '../screens/PartidaScreen';
import ScoreScreen   from '../screens/ScoreScreen';

const Stack = createNativeStackNavigator();

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
          <Stack.Screen name="Home"    component={HomeScreen} />
          <Stack.Screen name="Partida" component={PartidaScreen} />
          <Stack.Screen name="Score"   component={ScoreScreen} />
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
  return (
    <AuthProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </AuthProvider>
  );
}