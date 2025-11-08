import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Alert, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

// Dynamically import NFC manager (won't work in Expo Go)
let NfcManager: any = null;
let NfcTech: any = null;
try {
  const nfcModule = require('react-native-nfc-manager');
  NfcManager = nfcModule.default;
  NfcTech = nfcModule.NfcTech;
} catch (e) {
  console.log('NFC Manager not available - using fallback mode');
}

export default function NFCTapScreen() {
  const router = useRouter();
  const [scaleAnim] = useState(new Animated.Value(1));
  const [opacityAnim] = useState(new Animated.Value(0.3));
  const [tapped, setTapped] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(true);

  useEffect(() => {
    initNfc();
    startPulsingAnimation();

    return () => {
      cleanupNfc();
    };
  }, []);

  const startPulsingAnimation = () => {
    // Pulsing animation
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 0.3,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start();
  };

  const initNfc = async () => {
    // Check if NFC Manager is available (development build)
    if (!NfcManager) {
      console.log('Running in Expo Go - NFC not available');
      setNfcSupported(false);
      return;
    }

    try {
      const supported = await NfcManager.isSupported();
      setNfcSupported(supported);
      
      if (supported) {
        await NfcManager.start();
        readNfcTag();
      } else {
        Alert.alert(
          'NFC Not Supported',
          'Your device does not support NFC functionality.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
      }
    } catch (error) {
      console.error('NFC init error:', error);
      Alert.alert('Error', 'Failed to initialize NFC');
    }
  };

  const readNfcTag = async () => {
    try {
      await NfcManager.requestTechnology(NfcTech.Ndef);
      
      const tag = await NfcManager.getTag();
      console.log('NFC Tag detected:', tag);
      
      // Successful NFC read
      handleNFCSuccess();
    } catch (error) {
      console.warn('NFC read cancelled or failed:', error);
    } finally {
      NfcManager.cancelTechnologyRequest();
    }
  };

  const handleNFCSuccess = () => {
    setTapped(true);
    
    // Success animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      // Navigate back to trip screen after success
      setTimeout(() => {
        router.push('/(main)/trip');
      }, 800);
    });
  };

  const cleanupNfc = async () => {
    try {
      await NfcManager.cancelTechnologyRequest();
    } catch (error) {
      console.warn('NFC cleanup error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Animated.View
          style={[
            styles.nfcIconContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <View style={styles.nfcIconBackground}>
            <Ionicons
              name={tapped ? 'checkmark-circle' : 'phone-portrait-outline'}
              size={120}
              color={tapped ? '#4CAF50' : Colors.accentPrimary}
            />
          </View>
        </Animated.View>

        <Text style={styles.title}>
          {tapped ? 'Success!' : 'Hold Near Reader'}
        </Text>
        <Text style={styles.subtitle}>
          {tapped
            ? 'Trip data recorded successfully'
            : nfcSupported
            ? 'Position your device near the NFC reader'
            : 'Running in Expo Go - Tap button to simulate NFC'}
        </Text>

        {tapped && (
          <View style={styles.successIndicator}>
            <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
          </View>
        )}

        {/* Fallback button for Expo Go */}
        {!nfcSupported && !tapped && (
          <TouchableOpacity
            style={styles.simulateButton}
            onPress={handleNFCSuccess}
          >
            <Text style={styles.simulateButtonText}>Simulate NFC Tap</Text>
            <Text style={styles.simulateNote}>(Development build required for real NFC)</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  nfcIconContainer: {
    marginBottom: 40,
  },
  nfcIconBackground: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.accentPrimary,
    shadowColor: Colors.accentPrimary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 8,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.accentLight,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  successIndicator: {
    marginTop: 40,
  },
  simulateButton: {
    marginTop: 40,
    backgroundColor: Colors.accentPrimary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: Colors.accentPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  simulateButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  simulateNote: {
    fontSize: 12,
    color: Colors.background,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.8,
  },
});
