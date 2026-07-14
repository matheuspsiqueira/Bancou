// src/components/StatsHeader.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { IconStreak, IconVidas, IconMoedas } from './icons';

export default function StatsHeader({ streak, vidas, moedas }) {
  return (
    <View style={styles.statsHeader}>
      <View style={styles.statChip}>
        <IconStreak size={14} />
        <Text style={[styles.statValue, { color: '#FF6B35' }]}>{streak}</Text>
      </View>
      <View style={styles.statChip}>
        <IconVidas size={14} />
        <Text style={[styles.statValue, { color: '#FF4069' }]}>{vidas}</Text>
      </View>
      <View style={styles.statChip}>
        <IconMoedas size={14} />
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
});