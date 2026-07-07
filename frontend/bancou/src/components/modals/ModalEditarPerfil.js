// src/components/modals/ModalEditarPerfil.js
// Extraído de HomeScreen.js — lógica idêntica à original, sem alterações
// (inclui a exclusão de conta via fetch cru, fora do authFetch, de propósito).
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  Image,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { usePontsAlert } from '../../context/PontsAlertContext';
import { API_URL } from '../../config';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';

export default function ModalEditarPerfil({ visible, onClose }) {
  const { authFetch, usuario, atualizarUsuario, signOut } = useAuth();
  const { alertar } = usePontsAlert();
  const [username,   setUsername]   = useState('');
  const [nome,       setNome]       = useState('');
  const [carregando, setCarregando] = useState(false);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoArquivo, setFotoArquivo] = useState(null);

  React.useEffect(() => {
    if (visible) {
      setUsername(usuario?.username    || '');
      setNome(usuario?.nome_completo   || '');
      setFotoPreview(null);
      setFotoArquivo(null);
    }
  }, [visible]);

  const fechar = () => onClose();

  const escolherFoto = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissao.granted) {
      alertar('Permissão necessária', 'Precisamos de acesso à sua galeria pra trocar a foto.', [{ text: 'OK' }]);
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (resultado.canceled) return;

    const original = resultado.assets[0];

    const manipulado = await ImageManipulator.manipulateAsync(
      original.uri,
      [{ resize: { width: 512 } }],
      { compress: 0.6, format: ImageManipulator.SaveFormat.JPEG }
    );

    setFotoPreview(manipulado.uri);
    setFotoArquivo({
      uri: manipulado.uri,
      name: 'avatar.jpg',
      type: 'image/jpeg',
    });
  };

  const salvar = async () => {
    if (!username.trim()) {
      alertar('Atenção', 'O username não pode ficar em branco.', [{ text: 'OK' }]);
      return;
    }
    setCarregando(true);
    try {
      let resp;

      if (fotoArquivo) {
        const access = await AsyncStorage.getItem('access_token');
        const form = new FormData();
        form.append('username', username.trim());
        form.append('nome_completo', nome.trim());
        form.append('avatar', fotoArquivo);

        resp = await fetch(`${API_URL}/api/usuarios/perfil/`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${access}`,
            'ngrok-skip-browser-warning': 'true',
          },
          body: form,
        });
      } else {
        resp = await authFetch('/api/usuarios/perfil/', {
          method: 'PATCH',
          body: JSON.stringify({
            username:      username.trim(),
            nome_completo: nome.trim(),
          }),
        });
      }

      const data = await resp.json();
      if (resp.ok) {
        atualizarUsuario({
          username: data.username,
          nome_completo: data.nome_completo,
          avatar_url: data.avatar_url,
        });
        alertar(
          'Perfil atualizado!',
          'Suas informações foram salvas.',
          [{ text: 'OK', onPress: fechar }],
          { pose: 'torcendo' }
        );
      } else {
        const msg =
          data.username?.[0]      ||
          data.nome_completo?.[0] ||
          data.avatar?.[0]        ||
          data.detail             ||
          'Erro ao atualizar perfil.';
        alertar('Erro', msg, [{ text: 'OK' }], { pose: 'ops' });
      }
    } catch {
      alertar('Erro', 'Não foi possível conectar ao servidor.', [{ text: 'OK' }], { pose: 'ops' });
    } finally {
      setCarregando(false);
    }
  };

  const confirmarExclusao = () => {
    alertar(
      'Excluir conta',
      'Tem certeza? Esta ação é permanente e todos os seus dados serão apagados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Excluir minha conta', style: 'destructive', onPress: excluirConta },
      ],
      { pose: 'ops' } // trocar por 'triste' — pendente, já anotado no seu roadmap
    );
  };

  const excluirConta = async () => {
    setCarregando(true);
    try {
      const access = await AsyncStorage.getItem('access_token');
      const resp = await fetch(`${API_URL}/api/usuarios/perfil/`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${access}`,
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
      });
      if (resp.ok || resp.status === 204) {
        await signOut();
      } else {
        alertar('Erro', 'Não foi possível excluir a conta. Tente novamente.', [{ text: 'OK' }], { pose: 'ops' });
      }
    } catch (e) {
      alertar('Erro', 'Não foi possível conectar ao servidor.', [{ text: 'OK' }], { pose: 'ops' });
    } finally {
      setCarregando(false);
    }
  };

  const fonteAvatar = fotoPreview
    ? { uri: fotoPreview }
    : usuario?.avatar_url
      ? { uri: usuario.avatar_url }
      : require('../../assets/kou-foco.png');

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={fechar}>
      <Pressable style={styles.modalOverlay} onPress={fechar}>
        <Pressable style={styles.modalSheet} onPress={() => {}}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitulo}>Editar perfil</Text>
          <Text style={styles.modalSubtitulo}>
            Altere seu username ou nome de exibição.
          </Text>

          <View style={styles.avatarEditRow}>
            <View style={styles.avatarEdit}>
              <Image
                source={fonteAvatar}
                style={styles.avatarEditImg}
                resizeMode={fotoPreview || usuario?.avatar_url ? 'cover' : 'contain'}
              />
            </View>
            <TouchableOpacity style={styles.btnTrocarFoto} onPress={escolherFoto} disabled={carregando}>
              <Text style={styles.btnTrocarFotoText}>Trocar foto</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.inputLabel}>Username</Text>
          <TextInput
            style={styles.input}
            placeholder="@seu_username"
            placeholderTextColor="#9090B0"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.inputLabel}>Nome completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu nome"
            placeholderTextColor="#9090B0"
            value={nome}
            onChangeText={setNome}
          />

          <TouchableOpacity
            style={[styles.btnPrincipal, carregando && { opacity: 0.6 }]}
            onPress={salvar}
            disabled={carregando}
            activeOpacity={0.85}
          >
            {carregando
              ? <ActivityIndicator color="#FFF" />
              : <Text style={styles.btnPrincipalText}>Salvar alterações</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnExcluirConta}
            onPress={confirmarExclusao}
            disabled={carregando}
            activeOpacity={0.7}
          >
            <Text style={styles.btnExcluirContaText}>Excluir minha conta</Text>
          </TouchableOpacity>
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
  inputLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: '#9090B0', marginBottom: 6, marginTop: 4 },
  input: {
    backgroundColor: '#252540', borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14,
    fontFamily: 'Inter_400Regular', fontSize: 15, color: '#FFFFFF',
    marginBottom: 12, borderWidth: 1, borderColor: '#35355a',
  },
  avatarEditRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  avatarEdit: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#252540', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#6C63FF', overflow: 'hidden',
  },
  avatarEditImg: { width: '100%', height: '100%' },
  btnTrocarFoto: {
    backgroundColor: '#6C63FF', borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 9,
    borderWidth: 0,
  },
  btnTrocarFotoText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: '#FFFFFF' },
  btnPrincipal: {
    backgroundColor: '#6C63FF', borderRadius: 14,
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  btnPrincipalText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#FFFFFF' },
  btnExcluirConta: {
    marginTop: 4, borderWidth: 1, borderColor: '#FF406944',
    borderRadius: 14, padding: 14, alignItems: 'center',
  },
  btnExcluirContaText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: '#FF4069' },
});
