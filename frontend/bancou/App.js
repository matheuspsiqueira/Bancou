import React, { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import {
  useFonts,
  Nunito_700Bold,
  Nunito_800ExtraBold,
  Nunito_900Black,
} from '@expo-google-fonts/nunito';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import Navigation from './src/navigation';
import { colors } from './src/theme';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KouAlertProvider } from './src/context/KouAlertContext';
import { iniciarSom } from './src/services/somService';
import { configurarNotificacoes } from './src/services/notificacaoService';

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  useEffect(() => {
    iniciarSom();
    // Configuração de dispositivo (canal Android) — não depende de login,
    // por isso mora aqui e não no AuthContext. O pedido de permissão em
    // si, que sim depende de usuário autenticado, é feito pelo AuthContext.
    configurarNotificacoes();
  }, []);

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <KouAlertProvider>
        <Navigation />
      </KouAlertProvider>
    </SafeAreaProvider>
  );
}