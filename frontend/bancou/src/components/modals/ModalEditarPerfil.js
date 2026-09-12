// src/components/modals/ModalEditarPerfil.js
// Ajuste 09/2026: campo de e-mail adicionado pra espelhar o cadastro
// (AuthScreen). E-mail vem travado (read-only) porque o backend ainda
// não tem o fluxo de reenvio de confirmação pra troca de e-mail — ver
// briefing seção 2. Quando esse endpoint existir, troca `editavel={false}`
// por `true` no campo abaixo e ajusta o `salvar()` pra incluir o e-mail
// no payload (provavelmente um endpoint separado, tipo
// /api/usuarios/solicitar-troca-email/, não o PATCH de perfil direto).
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
import { useKouAlert } from '../../context/KouAlertContext';
import { API_URL } from '../../config';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { colors, typography, fontSize, spacing, borderRadius } from '../../theme';

export default function ModalEditarPerfil({ visible, onClose }) {
  const { authFetch, usuario, atualizarUsuario, signOut } = useAuth();
  const { alertar } = useKouAlert();
  const [username, setUsername] = useState('');
  const [nome, setNome] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [fotoArquivo, setFotoArquivo] = useState(null);

  React.useEffect(() => {
    if (visible) {
      setUsername(usuario?.username || '');
      setNome(usuario?.nome_completo || '');
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

  const solicitarTrocaEmail = () => {
    alertar(
      'Em breve',
      'A troca de e-mail vai passar por uma confirmação por segurança. Essa opção ainda está sendo construída.',
      [{ text: 'Entendi' }],
      { pose: 'pensando' }
    );
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
          },
          body: form,
        });
      } else {
        resp = await authFetch('/api/usuarios/perfil/', {
          method: 'PATCH',
          body: JSON.stringify({
            username: username.trim(),
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
          data.username?.[0] ||
          data.nome_completo?.[0] ||
          data.avatar?.[0] ||
          data.detail ||
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
        { text: 'Excluir', style: 'destructive', onPress: excluirConta },
      ],
      { pose: 'chorando' }
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
            Altere seus dados de cadastro.
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

          <Text style={styles.inputLabel}>Nome completo</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu nome"
            placeholderTextColor={colors.textSecondary}
            value={nome}
            onChangeText={setNome}
            autoCapitalize="words"
          />

          <Text style={styles.inputLabel}>Nome de usuário</Text>
          <TextInput
            style={styles.input}
            placeholder="@seu_username"
            placeholderTextColor={colors.textSecondary}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.inputLabel}>E-mail</Text>
          <TouchableOpacity onPress={solicitarTrocaEmail} activeOpacity={0.7} disabled={carregando}>
            <View pointerEvents="none">
              <TextInput
                style={[styles.input, styles.inputTravado]}
                value={usuario?.email || ''}
                editable={false}
              />
            </View>
          </TouchableOpacity>
          <Text style={styles.avisoEmail}>Toque para saber como funciona a troca de e-mail.</Text>

          <TouchableOpacity
            style={[styles.btnPrincipal, carregando && { opacity: 0.6 }]}
            onPress={salvar}
            disabled={carregando}
            activeOpacity={0.85}
          >
            {carregando
              ? <ActivityIndicator color={colors.text} />
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
    backgroundColor: colors.background, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: spacing.xl, paddingBottom: 40,
  },
  modalHandle: {
    width: 40, height: 4, backgroundColor: colors.card, borderRadius: borderRadius.full,
    alignSelf: 'center', marginBottom: spacing.xl,
  },
  modalTitulo: { fontFamily: typography.extraBold, fontSize: fontSize.h2, color: colors.text, marginBottom: 4 },
  modalSubtitulo: { fontFamily: typography.regular, fontSize: fontSize.label, color: colors.textSecondary, marginBottom: spacing.xl, lineHeight: 18 },
  inputLabel: { fontFamily: typography.medium, fontSize: fontSize.label, color: colors.textSecondary, marginBottom: spacing.xs, marginTop: 4 },
  input: {
    backgroundColor: colors.card, borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    fontFamily: typography.regular, fontSize: fontSize.body, color: colors.text,
    marginBottom: spacing.md, borderWidth: 1, borderColor: '#35355a',
  },
  inputTravado: { opacity: 0.55, marginBottom: spacing.xs },
  avisoEmail: {
    fontFamily: typography.regular, fontSize: fontSize.caption, color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  avatarEditRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.lg, marginBottom: spacing.xl },
  avatarEdit: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.card, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: colors.primary, overflow: 'hidden',
  },
  avatarEditImg: { width: '100%', height: '100%' },
  btnTrocarFoto: {
    backgroundColor: colors.primary, borderRadius: borderRadius.full,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.sm + 1,
  },
  btnTrocarFotoText: { fontFamily: typography.semibold, fontSize: fontSize.label, color: colors.text },
  btnPrincipal: {
    backgroundColor: colors.primary, borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg, alignItems: 'center', marginBottom: spacing.md,
  },
  btnPrincipalText: { fontFamily: typography.bold, fontSize: fontSize.button, color: colors.text },
  btnExcluirConta: {
    marginTop: 4, borderWidth: 1, borderColor: `${colors.lives}44`,
    borderRadius: borderRadius.lg, padding: spacing.md, alignItems: 'center',
  },
  btnExcluirContaText: { fontFamily: typography.medium, fontSize: fontSize.label, color: colors.lives },
});