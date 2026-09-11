// src/components/StatsHeader.js
import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';

export default function StatsHeader({ streak, vidas, moedas }) {
  return (
    <View style={styles.statsHeader}>
      <View style={styles.statChip}>
        <Image
          source={require('../assets/icons/streak.png')}
          style={styles.streakIcone}
          resizeMode="contain"
        />
        <Text style={[styles.statValue, { color: '#FF6B35' }]}>{streak}</Text>
      </View>
      <View style={styles.statChip}>
        <Image
          source={require('../assets/icons/vida.png')}
          style={styles.vidaIcone}
          resizeMode="contain"
        />
        <Text style={[styles.statValue, { color: '#FF4069' }]}>{vidas}</Text>
      </View>
      <View style={styles.statChip}>
        <Image
          source={require('../assets/icons/moeda.png')}
          style={styles.moedaIcone}
          resizeMode="contain"
        />
        <Text style={[styles.statValue, { color: '#FFD700' }]}>{moedas}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statsHeader: { flexDirection: 'row', gap: 8 },
  statChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#252540', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 5, gap: 4,
  },
  statValue: { fontFamily: 'Nunito_700Bold', fontSize: 13 },
  moedaIcone: { width: 14, height: 14 },
  vidaIcone: { width: 14, height: 14 },
  streakIcone: { width: 14, height: 14 },
});