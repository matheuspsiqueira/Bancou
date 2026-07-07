// src/components/modals/ModalPartida.js
// Extraído de HomeScreen.js — lógica idêntica à original, sem alterações.
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function ModalPartida({ visible, onClose, onIniciar }) {
  const { authFetch } = useAuth();

  const [etapa, setEtapa]         = useState('inicio');
  const [tipoFiltro, setTipo]     = useState(null);
  const [comTempo, setComTempo]   = useState(false);

  const [opcoes, setOpcoes]       = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro]           = useState(null);

  const cacheRef = React.useRef({});

  const ENDPOINTS = {
    banca:    '/api/questoes/bancas/',
    materia:  '/api/questoes/materias/',
    concurso: '/api/questoes/concursos/',
  };

  const tituloFiltro = {
    banca:    'Escolha a banca',
    materia:  'Escolha a matéria',
    concurso: 'Escolha o concurso',
  };

  const labelDe = (tipo, item) => {
    if (tipo === 'concurso') {
      return `${item.nome}${item.ano ? ` (${item.ano})` : ''} — ${item.banca_nome}`;
    }
    return item.nome;
  };

  const buscarOpcoes = useCallback(async (tipo) => {
    if (cacheRef.current[tipo]) {
      setOpcoes(cacheRef.current[tipo]);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const resp = await authFetch(ENDPOINTS[tipo]);
      if (!resp.ok) throw new Error('Falha ao buscar opções');
      const data = await resp.json();
      cacheRef.current[tipo] = data;
      setOpcoes(data);
    } catch (e) {
      setErro('Não foi possível carregar as opções. Verifique sua conexão.');
    } finally {
      setCarregando(false);
    }
  }, [authFetch]);

  const escolherTipo = (tipo) => {
    setTipo(tipo);
    setEtapa('opcoes');
    buscarOpcoes(tipo);
  };

  const fechar = () => {
    setEtapa('inicio');
    setTipo(null);
    setOpcoes([]);
    setErro(null);
    setComTempo(false);
    onClose();
  };

  const iniciarComFiltro = (filtro) => {
    fechar();
    onIniciar({ ...(filtro || {}), comTempo });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={fechar}>
      <Pressable style={styles.modalOverlay} onPress={fechar}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <View style={styles.modalHandle} />

          {etapa === 'inicio' && (
            <>
              <Text style={styles.modalTitulo}>Iniciar partida</Text>
              <Text style={styles.modalSubtitulo}>
                10 questões · +10 XP e +2 🪙 por acerto · consome ❤️ ao iniciar
              </Text>

              <View style={styles.toggleTempoRow}>
                <TouchableOpacity
                  style={[styles.toggleTempoBtn, !comTempo && styles.toggleTempoBtnAtivo]}
                  onPress={() => setComTempo(false)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleTempoText, !comTempo && styles.toggleTempoTextAtivo]}>
                    🧘  Sem tempo
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.toggleTempoBtn, comTempo && styles.toggleTempoBtnAtivo]}
                  onPress={() => setComTempo(true)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.toggleTempoText, comTempo && styles.toggleTempoTextAtivo]}>
                    ⏱️  Com tempo (60s)
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.btnPrincipal} onPress={() => iniciarComFiltro(null)} activeOpacity={0.85}>
                <Text style={styles.btnPrincipalText}>⚡  Iniciar agora — questões aleatórias</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.btnFiltrar} onPress={() => setEtapa('escolha')} activeOpacity={0.7}>
                <Text style={styles.btnFiltrarText}>🎯  Filtrar por tema</Text>
              </TouchableOpacity>
            </>
          )}

          {etapa === 'escolha' && (
            <>
              <TouchableOpacity onPress={() => setEtapa('inicio')} style={styles.voltarBtn}>
                <Text style={styles.voltarText}>‹  Voltar</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitulo}>Filtrar por</Text>
              <Text style={styles.modalSubtitulo}>Escolha como quer organizar sua partida</Text>
              {[
                { tipo: 'banca',    icone: '🏛️', label: 'Banca',    desc: 'CESPE, FCC, FGV…' },
                { tipo: 'materia',  icone: '📚', label: 'Matéria',  desc: 'Direito, Português, Lógica…' },
                { tipo: 'concurso', icone: '🎯', label: 'Concurso', desc: 'TJ, PF, INSS, Receita…' },
              ].map((item) => (
                <TouchableOpacity
                  key={item.tipo}
                  style={styles.filtroTipoItem}
                  onPress={() => escolherTipo(item.tipo)}
                  activeOpacity={0.7}
                >
                  <Text style={{ fontSize: 26 }}>{item.icone}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.filtroTipoLabel}>{item.label}</Text>
                    <Text style={styles.filtroTipoDesc}>{item.desc}</Text>
                  </View>
                  <Text style={{ color: '#6C63FF', fontSize: 20 }}>›</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {etapa === 'opcoes' && tipoFiltro && (
            <>
              <TouchableOpacity onPress={() => setEtapa('escolha')} style={styles.voltarBtn}>
                <Text style={styles.voltarText}>‹  Voltar</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitulo}>{tituloFiltro[tipoFiltro]}</Text>
              <Text style={styles.modalSubtitulo}>A partida terá 10 questões deste filtro</Text>

              {carregando && (
                <View style={{ paddingVertical: 32, alignItems: 'center' }}>
                  <ActivityIndicator color="#6C63FF" />
                </View>
              )}

              {!carregando && erro && (
                <View style={styles.filtroErroBox}>
                  <Text style={styles.filtroErroText}>{erro}</Text>
                  <TouchableOpacity onPress={() => buscarOpcoes(tipoFiltro)} style={styles.filtroErroBtn}>
                    <Text style={styles.filtroErroBtnText}>Tentar novamente</Text>
                  </TouchableOpacity>
                </View>
              )}

              {!carregando && !erro && opcoes.length === 0 && (
                <View style={styles.filtroErroBox}>
                  <Text style={styles.filtroErroText}>
                    Nenhuma opção disponível ainda para este filtro.
                  </Text>
                </View>
              )}

              {!carregando && !erro && opcoes.length > 0 && (
                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 340 }}>
                  {opcoes.map((op) => (
                    <TouchableOpacity
                      key={op.id}
                      style={styles.opcaoFiltroItem}
                      onPress={() => iniciarComFiltro({ tipo: tipoFiltro, id: op.id, label: labelDe(tipoFiltro, op) })}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.opcaoFiltroLabel}>{labelDe(tipoFiltro, op)}</Text>
                      <Text style={{ color: '#6C63FF', fontSize: 18 }}>›</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, backgroundColor: '#00000099', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: '#252540', borderRadius: 999,
    alignSelf: 'center', marginBottom: 20,
  },
  modalTitulo:    { fontFamily: 'Nunito_800ExtraBold', fontSize: 22, color: '#FFFFFF', marginBottom: 4 },
  modalSubtitulo: { fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9090B0', marginBottom: 20, lineHeight: 18 },
  toggleTempoRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  toggleTempoBtn: {
    flex: 1, backgroundColor: '#252540', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center',
    borderWidth: 1.5, borderColor: '#35355a',
  },
  toggleTempoBtnAtivo:  { backgroundColor: '#6C63FF22', borderColor: '#6C63FF' },
  toggleTempoText:      { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#9090B0' },
  toggleTempoTextAtivo: { fontFamily: 'Nunito_700Bold', color: '#6C63FF' },
  btnPrincipal: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  btnPrincipalText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#FFFFFF' },
  btnFiltrar: {
    backgroundColor: '#252540', borderRadius: 14, paddingVertical: 14, alignItems: 'center',
  },
  btnFiltrarText: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#9090B0' },
  voltarBtn:      { marginBottom: 12 },
  voltarText:     { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#6C63FF' },
  filtroTipoItem: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#252540', borderRadius: 12, padding: 16, marginBottom: 10,
  },
  filtroTipoLabel: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#FFFFFF' },
  filtroTipoDesc:  { fontFamily: 'Inter_400Regular', fontSize: 12, color: '#9090B0', marginTop: 2 },
  opcaoFiltroItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#252540',
  },
  opcaoFiltroLabel: { fontFamily: 'Inter_500Medium', fontSize: 15, color: '#FFFFFF', flex: 1, marginRight: 8 },
  filtroErroBox:  { paddingVertical: 24, alignItems: 'center', gap: 12 },
  filtroErroText: {
    fontFamily: 'Inter_400Regular', fontSize: 13, color: '#9090B0',
    textAlign: 'center', lineHeight: 19,
  },
  filtroErroBtn: {
    backgroundColor: '#252540', borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 8,
    borderWidth: 1, borderColor: '#35355a',
  },
  filtroErroBtnText: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#6C63FF' },
});
