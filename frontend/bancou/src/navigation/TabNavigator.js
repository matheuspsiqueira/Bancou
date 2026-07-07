// src/navigation/TabNavigator.js
// Substitui o antigo HomeScreen.js com estado interno de aba.
// Registre <TabNavigator /> no lugar de <HomeScreen /> na sua Stack principal
// (ex: no App.js ou no seu AppNavigator, troque o <Stack.Screen name="Home"
// component={HomeScreen} /> para component={TabNavigator}).
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TabBarCustomizada from '../components/TabBarCustomizada';

import InicioScreen  from '../screens/InicioScreen';
import LojaScreen    from '../screens/LojaScreen';
import DuelosScreen  from '../screens/DuelosScreen';
import RankingScreen from '../screens/RankingScreen';
import PerfilScreen  from '../screens/PerfilScreen';

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <TabBarCustomizada {...props} />}
    >
      <Tab.Screen name="Inicio"  component={InicioScreen} />
      <Tab.Screen name="Loja"    component={LojaScreen} />
      <Tab.Screen name="Duelos"  component={DuelosScreen} />
      <Tab.Screen name="Ranking" component={RankingScreen} />
      <Tab.Screen name="Perfil"  component={PerfilScreen} />
    </Tab.Navigator>
  );
}
