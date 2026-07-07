// src/components/modals/CampoSenha.js
import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

export default function CampoSenha({ label, value, onChangeText, ver, setVer, placeholder }) {
  return (
    <>
      <Text style={styles.inputLabel}>{label}</Text>
      <View style={styles.inputSenhaWrapper}>
        <TextInput
          style={styles.inputSenha}
          placeholder={placeholder}
          placeholderTextColor="#9090B0"
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
          <Text style={styles.inputSenhaOlhoIcon}>{ver ? '🙈' : '👁️'}</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  inputLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#9090B0', marginBottom: 6, marginTop: 4 },
  inputSenhaWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#252540', borderRadius: 12,
    borderWidth: 1, borderColor: '#35355a',
    marginBottom: 12, paddingRight: 12,
  },
  inputSenha: {
    flex: 1, color: '#FFFFFF',
    fontFamily: 'Inter_400Regular', fontSize: 15,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  inputSenhaOlho:     { padding: 4 },
  inputSenhaOlhoIcon: { fontSize: 18 },
});
