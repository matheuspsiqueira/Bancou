// src/components/TabBarCustomizada.js
// Substitui a tabBar nativa do React Navigation. Recebe { state, navigation }
// automaticamente pelo prop `tabBar` do Tab.Navigator (ver navigation/TabNavigator.js).
// Rotas em ROTAS_EM_BREVE nunca navegam: mostram um PontsAlert e ficam paradas.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { usePontsAlert } from '../context/PontsAlertContext';

const IMAGENS = {
  Inicio:  require('../assets/icons/home.png'),
  Loja:    require('../assets/icons/loja.png'),
  Duelos:  require('../assets/icons/duelo.png'),
  Ranking: require('../assets/icons/trofeu.png'),
  Perfil:  require('../assets/icons/perfil.png'),
};

const LABELS = {
  Inicio:  'Início',
  Loja:    'Loja',
  Duelos:  'Duelos',
  Ranking: 'Ranking',
  Perfil:  'Perfil',
};

// Adicione/remova nomes de rota aqui conforme features forem saindo do "em breve"
const ROTAS_EM_BREVE = ['Duelos'];

export default function TabBarCustomizada({ state, navigation }) {
  const { alertar } = usePontsAlert();
  const insets = useSafeAreaInsets();

  const handlePress = (routeName, isFocused) => {
    if (ROTAS_EM_BREVE.includes(routeName)) {
      alertar(
        'Em breve!',
        'O modo Duelos ainda está em construção. Volte em breve para desafiar outros concurseiros!',
        [{ text: 'Entendi' }],
        { pose: 'obra' }
      );
      return;
    }
    if (!isFocused) {
      navigation.navigate(routeName);
    }
  };

  return (
    <View style={[styles.tabBar, { paddingBottom: insets.bottom + 6 }]}>
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const emBreve = ROTAS_EM_BREVE.includes(route.name);
        const imagemIcone = IMAGENS[route.name];

        const iconeOpacity = emBreve ? 0.25 : isFocused ? 1 : 0.4;

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={() => handlePress(route.name, isFocused)}
            activeOpacity={0.7}
          >
            {isFocused && !emBreve && <View style={styles.tabIndicador} />}

            <View style={[styles.tabIcone, { opacity: iconeOpacity }]}>
              {imagemIcone && (
                <Image source={imagemIcone} style={styles.tabIconeImagem} resizeMode="contain" />
              )}
            </View>
            <Text
              style={[
                styles.tabLabel,
                isFocused && !emBreve && styles.tabLabelAtivo,
                emBreve && styles.tabLabelDesabilitado,
              ]}
            >
              {LABELS[route.name]}
            </Text>

            {emBreve && (
              <View style={styles.badgeEmBreve}>
                <Text style={styles.badgeEmBreveTexto}>em breve</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row', backgroundColor: '#252540',
    borderTopWidth: 1, borderTopColor: '#1a1a2e', paddingTop: 10,
  },
  tabItem:      { flex: 1, alignItems: 'center', position: 'relative', paddingBottom: 6 },
  tabIndicador: {
    position: 'absolute', top: -10, width: 32, height: 3,
    backgroundColor: '#6C63FF', borderBottomLeftRadius: 3, borderBottomRightRadius: 3,
  },
  tabIcone:       { marginBottom: 2 },
  tabIconeImagem: { width: 22, height: 22 },
  tabLabel:      { fontFamily: 'Inter_400Regular', fontSize: 11, color: '#9090B0' },
  tabLabelAtivo: { fontFamily: 'Inter_500Medium', color: '#6C63FF' },
  tabLabelDesabilitado: { color: '#9090B0', opacity: 0.5 },
  badgeEmBreve: {
    position: 'absolute', top: -4, alignSelf: 'center', marginLeft: 28,
    backgroundColor: '#FF6B35', borderRadius: 999,
    paddingHorizontal: 5, paddingVertical: 1,
  },
  badgeEmBreveTexto: { color: '#FFFFFF', fontSize: 8, fontFamily: 'Nunito_700Bold' },
});