import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { nfcManager, initNFC, readNFC, isNFCAvailable, cleanupNFC } from '../../utils/nfcManager';

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
    try {
      const result = await initNFC();
      
      if (result.success) {
        setNfcSupported(true);
        readNfcTag();
      } else {
        console.log('NFC init failed:', result.error);
        setNfcSupported(false);
        
        if (result.error?.includes('not supported')) {
          Alert.alert(
            'NFC Not Supported',
            'Your device does not support NFC functionality.',
            [{ text: 'OK', onPress: () => router.back() }]
          );
        }
      }
    } catch (error) {
      console.error('NFC init error:', error);
      setNfcSupported(false);
    }
  };

  const readNfcTag = async () => {
    try {
      const result = await readNFC();
      
      if (result.success) {
        console.log('NFC Tag detected:', result.data);
        handleNFCSuccess();
      } else {
        console.warn('NFC read failed:', result.error);
      }
    } catch (error) {
      console.warn('NFC read cancelled or failed:', error);
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
      // Navigate back to dashboard after successful transaction
      setTimeout(() => {
        router.push('/(main)/dashboard');
      }, 800);
    });
  };

  const cleanupNfc = async () => {
    try {
      await cleanupNFC();
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
            ? 'Transaction recorded successfully'
            : 'Position your device near the NFC reader'}
        </Text>

        {tapped && (
          <View style={styles.successIndicator}>
            <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />
          </View>
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
});
