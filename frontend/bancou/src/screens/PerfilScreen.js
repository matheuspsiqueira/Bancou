// src/screens/PerfilScreen.js
// Extraído de HomeScreen.js (era o componente AbaPerfil). O handleLogout
// que antes vivia no componente principal HomeScreen agora mora aqui,
// já que só a aba Perfil usa ele.
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, Switch } from 'react-native';
import { useAuth } from '../context/AuthContext';
import { usePontsAlert } from '../context/PontsAlertContext';
import TelaComHeader from '../components/TelaComHeader';
import ModalAlterarSenha from '../components/modals/ModalAlterarSenha';
import ModalEditarPerfil from '../components/modals/ModalEditarPerfil';
import { getTituloNivel, getXpProximoNivel } from '../utils/niveis';
import { MOCK } from '../utils/mockData';
import { tocar, useSomHabilitado } from '../services/somService';

export default function PerfilScreen() {
  const { usuario, signOut } = useAuth();
  const { alertar } = usePontsAlert();
  const [modalSenha,  setModalSenha]  = useState(false);
  const [modalPerfil, setModalPerfil] = useState(false);
  const [somHabilitado, alternarSom] = useSomHabilitado();

  const xp      = usuario?.xp     ?? MOCK.xp;
  const streak  = usuario?.streak  ?? MOCK.streak;
  const moedas  = usuario?.moedas  ?? MOCK.moedas;
  const titulo  = getTituloNivel(xp);
  const xpProximo = getXpProximoNivel(xp);
  const xpPct   = xpProximo ? Math.min(xp / xpProximo, 1) : 1;
  const xpLabel = xpProximo
    ? `${xp.toLocaleString()} / ${xpProximo.toLocaleString()} XP`
    : `${xp.toLocaleString()} XP — Nível máximo`;
  const nome     = usuario?.nome_completo ?? '…';
  const username = usuario?.username      ?? '…';

  const handleLogout = () => {
    tocar('pop');
    // Adia a abertura do alert em 1 frame: evita que a criação da janela
    // nativa do modal compita com a chamada de áudio na mesma leva de
    // trabalho da thread JS, o que causava um delay perceptível no som.
    requestAnimationFrame(() => {
      alertar(
        'Sair da conta',
        'Tem certeza que deseja sair?',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Sair', style: 'destructive', onPress: signOut },
        ],
        { pose: 'triste' }
      );
    });
  };

  return (
    <TelaComHeader>
      <ScrollView style={styles.abaContainer} contentContainerStyle={{ paddingBottom: 32 }}>
        <View style={styles.perfilHeader}>
          <View style={styles.avatar}>
            <Image
              source={usuario?.avatar_url ? { uri: usuario.avatar_url } : require('../assets/kou-foco.png')}
              style={styles.avatarImg}
              resizeMode={usuario?.avatar_url ? 'cover' : 'contain'}
            />
          </View>
          <Text style={styles.perfilNome}>{username}</Text>
          <Text style={styles.perfilUsername}>{nome}</Text>
          <View style={styles.nivelBadge}>
            <Text style={styles.nivelBadgeText}>Nível {titulo}</Text>
          </View>
          <View style={styles.xpBarraContainer}>
            <View style={styles.xpBarraTrack}>
              <View style={[styles.xpBarraFill, { width: `${xpPct * 100}%` }]} />
            </View>
            <View style={styles.xpBarraLabelRow}>
              <Image source={require('../assets/icons/xp.png')} style={styles.statIconePng} resizeMode="contain" />
              <Text style={styles.xpBarraLabel}> {xpLabel}</Text>
            </View>
          </View>
          <View style={styles.perfilStatsRow}>
            <View style={styles.perfilStatBox}>
              <Text style={styles.perfilStatVal}>{streak}</Text>
              <View style={styles.perfilStatLabelRow}>
                <Image source={require('../assets/icons/streak.png')} style={styles.statIconePng} resizeMode="contain" />
                <Text style={styles.perfilStatLabel}> Streak</Text>
              </View>
            </View>
            <View style={styles.perfilStatDivider} />
            <View style={styles.perfilStatBox}>
              <Text style={styles.perfilStatVal}>{moedas}</Text>
              <View style={styles.perfilStatLabelRow}>
                <Image source={require('../assets/icons/moeda.png')} style={styles.statIconePng} resizeMode="contain" />
                <Text style={styles.perfilStatLabel}> Moedas</Text>
              </View>
            </View>
            <View style={styles.perfilStatDivider} />
            <View style={styles.perfilStatBox}>
              <Text style={styles.perfilStatVal}>Em breve</Text>
              <View style={styles.perfilStatLabelRow}>
                <Image source={require('../assets/icons/trofeu.png')} style={styles.statIconePng} resizeMode="contain" />
                <Text style={styles.perfilStatLabel}> Liga</Text>
              </View>
            </View>
          </View>
        </View>

        <Text style={styles.secaoTitulo}>Conquistas</Text>
        <View style={styles.emBreveCard}>
          <Image source={require('../assets/kou-obra.png')} style={styles.emBreveIconePng} resizeMode="contain" />
          <Text style={styles.emBreveTitulo}>Em breve</Text>
          <Text style={styles.emBreveDesc}>
            Conquistas únicas que desbloqueiam conforme você avança. Cada uma conta uma história!
          </Text>
        </View>

        <Text style={[styles.secaoTitulo, { marginTop: 8 }]}>Configurações</Text>

        <View style={styles.opcaoItem}>
          <View style={styles.opcaoTextRow}>
            <Image source={require('../assets/icons/com-som.png')} style={styles.opcaoIconePng} resizeMode="contain" />
            <Text style={styles.opcaoText}> Efeitos sonoros</Text>
          </View>
          <Switch
            value={somHabilitado}
            onValueChange={alternarSom}
            trackColor={{ false: '#1a1a2e', true: '#6C63FF' }}
            thumbColor="#FFFFFF"
            ios_backgroundColor="#1a1a2e"
          />
        </View>

        <TouchableOpacity style={styles.opcaoItem} onPress={() => setModalPerfil(true)} activeOpacity={0.7}>
          <View style={styles.opcaoTextRow}>
            <Image source={require('../assets/icons/lapis.png')} style={styles.opcaoIconePng} resizeMode="contain" />
            <Text style={styles.opcaoText}> Editar perfil</Text>
          </View>
          <Text style={{ color: '#9090B0', fontSize: 18 }}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.opcaoItem} onPress={() => setModalSenha(true)} activeOpacity={0.7}>
          <View style={styles.opcaoTextRow}>
            <Image source={require('../assets/icons/chave.png')} style={styles.opcaoIconePng} resizeMode="contain" />
            <Text style={styles.opcaoText}> Alterar senha</Text>
          </View>
          <Text style={{ color: '#9090B0', fontSize: 18 }}>›</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnLogout} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.btnLogoutText}>Sair da conta</Text>
        </TouchableOpacity>

        <ModalAlterarSenha visible={modalSenha}  onClose={() => setModalSenha(false)} />
        <ModalEditarPerfil visible={modalPerfil} onClose={() => setModalPerfil(false)} />
      </ScrollView>
    </TelaComHeader>
  );
}

const styles = StyleSheet.create({
  abaContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 16 },
  perfilHeader: {
    alignItems: 'center', paddingVertical: 24, paddingHorizontal: 16,
    backgroundColor: '#252540', borderRadius: 14, marginBottom: 24,
  },
  avatar: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center',
    marginBottom: 12, borderWidth: 2, borderColor: '#6C63FF', overflow: 'hidden',
  },
  avatarImg: { width: '100%', height: '100%' },
  perfilNome:      { fontFamily: 'Nunito_800ExtraBold', fontSize: 20, color: '#FFFFFF' },
  perfilUsername:  { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9090B0', marginBottom: 8 },
  nivelBadge: {
    backgroundColor: '#6C63FF22', borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 4, marginBottom: 16,
    borderWidth: 1, borderColor: '#6C63FF55',
  },
  nivelBadgeText:   { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#6C63FF' },
  xpBarraContainer: { width: '100%', marginBottom: 20 },
  xpBarraTrack:     { height: 8, backgroundColor: '#1a1a2e', borderRadius: 999, marginBottom: 6 },
  xpBarraFill:      { height: 8, borderRadius: 999, backgroundColor: '#6C63FF' },
  xpBarraLabelRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  xpBarraLabel:     { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9090B0', textAlign: 'center' },
  perfilStatsRow:   { flexDirection: 'row', alignItems: 'center' },
  perfilStatBox:    { flex: 1, alignItems: 'center' },
  perfilStatDivider:{ width: 1, height: 32, backgroundColor: '#1a1a2e' },
  perfilStatVal:    { fontFamily: 'Nunito_900Black', fontSize: 20, color: '#FFFFFF' },
  perfilStatLabelRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  perfilStatLabel:  { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9090B0' },
  statIconePng: { width: 12, height: 12 },
  secaoTitulo: { fontFamily: 'Nunito_800ExtraBold', fontSize: 18, color: '#FFFFFF', marginBottom: 12 },
  emBreveCard: {
    backgroundColor: '#252540', borderRadius: 14, padding: 24,
    alignItems: 'center', marginBottom: 16,
    borderWidth: 1, borderColor: '#6C63FF33', borderStyle: 'dashed',
  },
  emBreveIconePng: { width: 48, height: 48, marginBottom: 8 },
  emBreveTitulo: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#9090B0', marginBottom: 6 },
  emBreveDesc:   { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9090B0', textAlign: 'center', lineHeight: 19 },
  opcaoItem: {
    backgroundColor: '#252540', borderRadius: 12, padding: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  opcaoTextRow: { flexDirection: 'row', alignItems: 'center' },
  opcaoIconePng: { width: 18, height: 18 },
  opcaoText: { fontFamily: 'Inter_500Medium', fontSize: 15, color: '#FFFFFF' },
  btnLogout: {
    marginTop: 16, borderWidth: 1, borderColor: '#FF4069',
    borderRadius: 14, padding: 14, alignItems: 'center',
  },
  btnLogoutText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#FF4069' },
});