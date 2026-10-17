// app.config.js
//
// Substitui o antigo app.json porque o pacote Android muda conforme o profile:
//   - development → "br.com.bancou.app.dev"
//   - preview / production → "br.com.bancou.app"
const profile = process.env.EAS_BUILD_PROFILE;
const isDev = profile === 'development';

const ANDROID_PACKAGE = isDev ? 'br.com.bancou.app.dev' : 'br.com.bancou.app';

export default {
  expo: {
    name: isDev ? 'Bancou (dev)' : 'Bancou',
    slug: 'bancou',
    version: '1.0.2',
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
      permissions: ['android.permission.MODIFY_AUDIO_SETTINGS'],
    },
    web: {
      favicon: './src/assets/kou-animado1.png',
    },
    plugins: [
      '@react-native-firebase/app',
      '@react-native-firebase/analytics',
      'expo-font',
      ['expo-audio', { recordAudioAndroid: false }],
      'expo-asset',
      [
        'react-native-google-mobile-ads',
        {
          androidAppId: 'ca-app-pub-5823717618050092~2442548622',
        },
      ],
      // expo-notifications: sem ícone customizado por enquanto (padrão do Android)
      'expo-notifications',
      [
        'expo-build-properties',
        {
          android: {
            enableMinifyInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
          },
        },
      ],
      './plugins/semServicosDeAudio',
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