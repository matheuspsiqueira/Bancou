// plugins/semServicosDeAudio.js
// Remove do manifest final os serviços em primeiro plano do expo-audio
// (mediaPlayback e microphone) e as permissões ligadas a eles.
// O Bancou só toca efeitos sonoros: não grava áudio nem toca em segundo plano.
const fs = require('fs');
const path = require('path');
const { withAndroidManifest } = require('expo/config-plugins');

const PERMISSOES_REMOVIDAS = [
  'android.permission.RECORD_AUDIO',
  'android.permission.FOREGROUND_SERVICE',
  'android.permission.FOREGROUND_SERVICE_MEDIA_PLAYBACK',
  'android.permission.FOREGROUND_SERVICE_MICROPHONE',
];

module.exports = function semServicosDeAudio(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    // Lê os nomes reais dos serviços direto do manifest da biblioteca
    const arquivo = path.join(
      cfg.modRequest.projectRoot,
      'node_modules', 'expo-audio', 'android', 'src', 'main', 'AndroidManifest.xml'
    );
    const xml = fs.readFileSync(arquivo, 'utf8');
    const servicos = [...xml.matchAll(/<service[^>]*?android:name="([^"]+)"/g)].map((m) => m[1]);

    const app = manifest.application[0];
    app.service = (app.service || []).filter((s) => !servicos.includes(s.$['android:name']));
    servicos.forEach((nome) => {
      app.service.push({ $: { 'android:name': nome, 'tools:node': 'remove' } });
    });

    manifest['uses-permission'] = (manifest['uses-permission'] || []).filter(
      (p) => !PERMISSOES_REMOVIDAS.includes(p.$['android:name'])
    );
    PERMISSOES_REMOVIDAS.forEach((nome) => {
      manifest['uses-permission'].push({ $: { 'android:name': nome, 'tools:node': 'remove' } });
    });

    return cfg;
  });
};