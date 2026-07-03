import React from 'react';
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
import { PontsAlertProvider } from './src/context/PontsAlertContext';

export default function App() {
  const [fontsLoaded] = useFonts({
    Nunito_700Bold,
    Nunito_800ExtraBold,
    Nunito_900Black,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <PontsAlertProvider>
        <Navigation />
      </PontsAlertProvider>
    </SafeAreaProvider>
  );
}