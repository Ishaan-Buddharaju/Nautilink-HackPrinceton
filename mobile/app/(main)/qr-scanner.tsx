import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

export default function QRScannerScreen() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  useEffect(() => {
    if (!permission?.granted) {
      requestPermission();
    }
  }, [permission]);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    console.log(`QR Code scanned: ${data}`);
    
    // Navigate to NFC scanner after QR code is scanned
    router.push('/(main)/nfc-tap');
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>Camera permission is required to scan QR codes</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
      >
        <View style={styles.overlay}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
              <Ionicons name="close" size={32} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Scanning Frame */}
          <View style={styles.centerContainer}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.instructionText}>
              Position QR code within the frame
            </Text>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            {scanned && (
              <TouchableOpacity
                style={styles.scanAgainButton}
                onPress={() => setScanned(false)}
              >
                <Ionicons name="refresh" size={24} color={Colors.background} />
                <Text style={styles.scanAgainText}>Scan Again</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  closeButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 250,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderColor: Colors.accentPrimary,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
  },
  instructionText: {
    marginTop: 30,
    fontSize: 16,
    color: '#FFF',
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  footer: {
    padding: 40,
    alignItems: 'center',
  },
  scanAgainButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.accentPrimary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: Colors.accentPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  scanAgainText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
    letterSpacing: 0.5,
  },
  message: {
    fontSize: 16,
    color: Colors.foreground,
    textAlign: 'center',
    padding: 20,
  },
  permissionButton: {
    backgroundColor: Colors.accentPrimary,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginHorizontal: 20,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.background,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
});
