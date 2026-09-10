// src/components/modals/CampoSenha.js
// Ganhou `labelExtra` (nó opcional ao lado do label) pra suportar casos
// como o link "Esqueci minha senha" sem precisar duplicar o componente.
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { colors, typography, fontSize, spacing, borderRadius } from '../../theme';

export default function CampoSenha({ label, value, onChangeText, ver, setVer, placeholder, labelExtra }) {
  return (
    <>
      <View style={styles.labelRow}>
        <Text style={styles.inputLabel}>{label}</Text>
        {labelExtra}
      </View>
      <View style={styles.inputSenhaWrapper}>
        <TextInput
          style={styles.inputSenha}
          placeholder={placeholder}
          placeholderTextColor={colors.textSecondary}
          secureTextEntry={!ver}
          value={value}
          onChangeText={onChangeText}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity
          style={styles.inputSenhaOlho}
          onPress={() => setVer((v) => !v)}
          activeOpacity={0.7}
        >
          <Image
            source={ver
              ? require('../../assets/icons/olho-aberto.png')
              : require('../../assets/icons/olho-fechado.png')}
            style={styles.inputSenhaOlhoIcone}
            resizeMode="contain"
          />
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.xs, marginTop: 4,
  },
  inputLabel: { fontFamily: typography.medium, fontSize: fontSize.label, color: colors.textSecondary },
  inputSenhaWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    borderWidth: 1, borderColor: '#35355a',
    marginBottom: spacing.md, paddingRight: spacing.md,
  },
  inputSenha: {
    flex: 1, color: colors.text,
    fontFamily: typography.regular, fontSize: fontSize.body,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
  },
  inputSenhaOlho: { padding: 4 },
  inputSenhaOlhoIcone: { width: 18, height: 18 },
});