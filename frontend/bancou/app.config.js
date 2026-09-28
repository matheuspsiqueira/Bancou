// app.config.js
//
// Substitui o antigo app.json (arquivo estático) porque o nome do pacote
// Android precisa MUDAR conforme o profile do build:
//   - development → "br.com.bancou.app.dev" (app separado, convive no
//     celular com o app de produção instalado via EAS)
//   - preview / production → "br.com.bancou.app" (o de sempre)
//
// O EAS injeta a variável de ambiente EAS_BUILD_PROFILE durante o build
// (não existe localmente com `expo start`, então o fallback abaixo cobre
// o dia a dia comum, que continua sendo o mesmo pacote de sempre).
const profile = process.env.EAS_BUILD_PROFILE;
const isDev = profile === 'development';

const ANDROID_PACKAGE = isDev ? 'br.com.bancou.app.dev' : 'br.com.bancou.app';

export default {
  expo: {
    name: isDev ? 'Bancou (dev)' : 'Bancou',
    slug: 'bancou',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './src/assets/adaptative-icon.png',
    userInterfaceStyle: 'dark',
    ios: {
      supportsTablet: false,
    },
    android: {
      package: ANDROID_PACKAGE,
      googleServicesFile: './google-services.json',
      adaptiveIcon: {
        foregroundImage: './src/assets/adaptative-icon.png',
        backgroundColor: '#1a1a2e',
      },
      permissions: [
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
      ],
    },
    web: {
      favicon: './src/assets/kou-animado1.png',
    },
    plugins: [
      'expo-font',
      'expo-audio',
      'expo-asset',
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: 'ca-app-pub-5823717618050092~2442548622',
        },
      ],
      // expo-notifications: sem icon/color customizado por enquanto —
      // o Android usa um ícone padrão nas notificações até vocês
      // desenharem um ícone monocromático próprio (silhueta branca em
      // fundo transparente, exigência do próprio Android pra esse tipo
      // de ícone). Funciona normalmente sem isso, só fica visualmente
      // genérico — dá pra customizar depois sem precisar de novo build
      // imediato, é só trocar aqui e gerar o próximo build.
      'expo-notifications',
    ],
    extra: {
      eas: {
        projectId: 'a83c132f-ef5a-4836-b9d8-83d8837c2e4f',
      },
    },
    owner: 'matheus_siqueira',
    runtimeVersion: {
      policy: 'appVersion',
    },
    updates: {
      url: 'https://u.expo.dev/a83c132f-ef5a-4836-b9d8-83d8837c2e4f',
    },
  },
};