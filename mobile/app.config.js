// Read environment variables from .env file
require('dotenv').config();

module.exports = {
  expo: {
    name: 'Nautilink',
    slug: 'nautilink-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'dark',
    scheme: 'nautilink',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: '#171717',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.nautilink.app',
      infoPlist: {
        NSCameraUsageDescription:
          'This app uses the camera to capture photos of your fishing catch for documentation and compliance tracking.',
        NSPhotoLibraryUsageDescription:
          'This app needs access to your photo library to select photos of your catch.',
        NFCReaderUsageDescription:
          'This app uses NFC to verify and authenticate fishing catch data.',
        NSLocationWhenInUseUsageDescription:
          'This app needs your location to record where catches are made for blockchain verification.',
        NSLocationAlwaysUsageDescription:
          'This app needs your location to record where catches are made for blockchain verification.',
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#171717',
      },
      package: 'com.nautilink.app',
      permissions: [
        'CAMERA', 
        'READ_EXTERNAL_STORAGE', 
        'WRITE_EXTERNAL_STORAGE',
        'NFC',
        'android.permission.NFC',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION'
      ],
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-camera',
        {
          cameraPermission: 'Allow Nautilink to access your camera to capture trip photos.',
        },
      ],
      [
        'react-native-nfc-manager',
        {
          nfcPermission: 'Allow Nautilink to use NFC to verify trip data.',
        },
      ],
      [
        'expo-location',
        {
          locationAlwaysAndWhenInUsePermission: 'Allow Nautilink to use your location to record where catches are made.',
        },
      ],
    ],
    extra: {
      apiUrl: process.env.API_BASE_URL || 'http://localhost:8000',
      supabaseUrl: process.env.SUPABASE_URL || '',
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
      eas: {
        projectId: '7ceda4f9-8a62-4e6e-aca5-c845671d45bd',
      },
    },
  },
};
