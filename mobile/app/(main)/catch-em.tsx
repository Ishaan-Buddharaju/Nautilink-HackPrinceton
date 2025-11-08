// app/(main)/catch-em.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Alert, ScrollView, Modal, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

const { width, height } = Dimensions.get('window');

// NFC Manager - same as nfc-tap.tsx
let NfcManager: any = null;
let NfcTech: any = null;
try {
  const nfcModule = require('react-native-nfc-manager');
  NfcManager = nfcModule.default;
  NfcTech = nfcModule.NfcTech;
} catch (e) {
  console.log('NFC Manager not available - using fallback mode');
}

interface Catch {
  id: string;
  species: string;
  weight: number;
  location: { name: string; lat: number; lng: number };
  timestamp: Date;
  nfcTagId: string;
  points: number;
  imageUri: string;
  sustainabilityScore: number;
}

type CatchStatus = 'list' | 'camera' | 'nfc' | 'submitted' | 'verified';

export default function CatchEmScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<CatchStatus>('list');
  const [catches, setCatches] = useState<Catch[]>([]);
  const [selectedCatch, setSelectedCatch] = useState<Catch | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [nfcTagId, setNfcTagId] = useState<string | null>(null);
  const [sustainabilityScore, setSustainabilityScore] = useState<number>(0);
  const [blueTokens, setBlueTokens] = useState(147);
  const [isLoading, setIsLoading] = useState(false);
  const [nfcSupported, setNfcSupported] = useState(true);
  const [slideAnim] = useState(new Animated.Value(500));
  const [nfcScale] = useState(new Animated.Value(1));
  const [nfcOpacity] = useState(new Animated.Value(0.3));
  const cameraRef = useRef<CameraView>(null);

  // Mock data for caught fish
  useEffect(() => {
    const mockCatches: Catch[] = [
      {
        id: '1',
        species: 'Yellowfin Tuna',
        weight: 12.5,
        location: { name: 'Pacific Ocean', lat: 20.5937, lng: -156.3319 },
        timestamp: new Date(Date.now() - 86400000),
        nfcTagId: 'NFC-8472',
        points: 85,
        imageUri: 'https://images.unsplash.com/photo-1544943910-4c1dc44aab44',
        sustainabilityScore: 85,
      },
      {
        id: '2',
        species: 'Mahi Mahi',
        weight: 8.3,
        location: { name: 'Gulf Stream', lat: 35.2271, lng: -75.5449 },
        timestamp: new Date(Date.now() - 172800000),
        nfcTagId: 'NFC-6291',
        points: 72,
        imageUri: 'https://images.unsplash.com/photo-1559827260-dc66d52bef19',
        sustainabilityScore: 72,
      },
      {
        id: '3',
        species: 'Red Snapper',
        weight: 5.7,
        location: { name: 'Caribbean Sea', lat: 18.2208, lng: -66.5901 },
        timestamp: new Date(Date.now() - 259200000),
        nfcTagId: 'NFC-4183',
        points: 91,
        imageUri: 'https://images.unsplash.com/photo-1535591273668-578e31182c4f',
        sustainabilityScore: 91,
      },
    ];
    setCatches(mockCatches);
    initNfc();
  }, []);

  // Request camera permissions when opening camera
  useEffect(() => {
    if (status === 'camera' && !cameraPermission?.granted) {
      requestCameraPermission();
    }
  }, [status]);

  // NFC Functions from nfc-tap.tsx
  const initNfc = async () => {
    if (!NfcManager) {
      console.log('Running in Expo Go - NFC not available');
      setNfcSupported(false);
      return;
    }

    try {
      const supported = await NfcManager.isSupported();
      setNfcSupported(supported);
    } catch (error) {
      console.error('NFC init error:', error);
    }
  };

  const startNfcScan = async () => {
    if (!nfcSupported) {
      // Simulate NFC in development
      setTimeout(() => {
        const mockTagId = `NFC-${Math.floor(Math.random() * 10000)}`;
        handleNfcDetected(mockTagId);
      }, 1000);
      return;
    }

    try {
      await NfcManager.start();
      await NfcManager.requestTechnology(NfcTech.Ndef);
      const tag = await NfcManager.getTag();
      console.log('NFC Tag detected:', tag);
      handleNfcDetected(tag.id);
    } catch (error) {
      console.warn('NFC read cancelled or failed:', error);
    } finally {
      if (NfcManager) {
        await NfcManager.cancelTechnologyRequest();
      }
    }
  };

  const handleNfcDetected = (tagId: string) => {
    setNfcTagId(tagId);
    setStatus('submitted');
    
    // Simulate verification and add to log
    setTimeout(() => {
      setStatus('verified');
      const tokens = Math.floor(sustainabilityScore / 10);
      setBlueTokens(prev => prev + tokens);
      
      // Add new catch to log
      const newCatch: Catch = {
        id: String(Date.now()),
        species: 'Caught Fish',
        weight: Math.random() * 10 + 5,
        location: { name: 'Current Location', lat: 25.7617, lng: -80.1918 },
        timestamp: new Date(),
        nfcTagId: tagId,
        points: tokens,
        imageUri: capturedImage || '',
        sustainabilityScore,
      };
      setCatches(prev => [newCatch, ...prev]);
    }, 2000);
  };

  // Camera Functions from qr-scanner.tsx
  const handleTakePhoto = async () => {
    if (!cameraPermission?.granted) {
      Alert.alert('Permission required', 'Camera permission is needed to take photos');
      return;
    }

    try {
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          skipProcessing: true,
        });

        if (photo.uri) {
          setCapturedImage(photo.uri);
          // Simulate AI analysis
          setTimeout(() => {
            setStatus('nfc');
            // Mock sustainability score (60-100)
            const score = Math.floor(Math.random() * 40) + 60;
            setSustainabilityScore(score);
          }, 1500);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo');
    }
  };

  const startNewCatch = () => {
    setStatus('camera');
    setCapturedImage(null);
    setNfcTagId(null);
    setSustainabilityScore(0);
  };

  const backToList = () => {
    setStatus('list');
    setCapturedImage(null);
    setNfcTagId(null);
    setSustainabilityScore(0);
  };

  const handleCatchPress = (catchItem: Catch) => {
    setSelectedCatch(catchItem);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeDetails = () => {
    Animated.timing(slideAnim, {
      toValue: 500,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setSelectedCatch(null);
    });
  };

  // Render Log List View
  const renderListView = () => (
    <View style={styles.content}>
      {/* Globe Widget - Sophisticated visualization */}
      <View style={styles.mapContainer}>
        <Text style={styles.sectionTitle}>🌊 Global Fish Tracker</Text>
        <View style={styles.globeContainer}>
          {/* 3D-style Globe with shadow */}
          <View style={styles.globeWrapper}>
            <View style={styles.globeShadow} />
            <View style={styles.globe}>
              {/* Continents representation (simplified) */}
              <View style={styles.continent1} />
              <View style={styles.continent2} />
              <View style={styles.continent3} />
              
              {/* Globe grid lines - latitude/longitude */}
              <View style={styles.globeGrid}>
                <View style={[styles.horizontalLine, { top: '15%' }]} />
                <View style={[styles.horizontalLine, { top: '35%' }]} />
                <View style={[styles.horizontalLine, { top: '50%' }]} />
                <View style={[styles.horizontalLine, { top: '65%' }]} />
                <View style={[styles.horizontalLine, { top: '85%' }]} />
                <View style={[styles.verticalLine, { left: '25%' }]} />
                <View style={[styles.verticalLine, { left: '50%' }]} />
                <View style={[styles.verticalLine, { left: '75%' }]} />
              </View>
              
              {/* Fish markers positioned around globe */}
              {catches.map((catchItem, index) => {
                // Distribute markers in a spherical pattern
                const phi = (index * 137.5) % 360; // Golden angle
                const theta = Math.acos(1 - 2 * (index + 0.5) / catches.length);
                const radius = 55;
                const x = radius * Math.sin(theta) * Math.cos(phi * Math.PI / 180) + 70;
                const y = radius * Math.sin(theta) * Math.sin(phi * Math.PI / 180) + 70;
                
                return (
                  <View
                    key={catchItem.id}
                    style={[
                      styles.fishMarker,
                      { 
                        left: x, 
                        top: y,
                        zIndex: 10,
                      }
                    ]}
                  >
                    <View style={styles.markerPulse} />
                    <Ionicons name="location" size={24} color="#00d4ff" />
                  </View>
                );
              })}
            </View>
          </View>
          
          {/* Stats cards below globe */}
          <View style={styles.globeStats}>
            <View style={styles.globeStatCard}>
              <Ionicons name="fish" size={20} color="#00d4ff" />
              <Text style={styles.globeStatNumber}>{catches.length}</Text>
              <Text style={styles.globeStatLabel}>Catches</Text>
            </View>
            <View style={styles.globeStatCard}>
              <Ionicons name="trophy" size={20} color="#FFD700" />
              <Text style={styles.globeStatNumber}>{catches.reduce((sum, c) => sum + c.points, 0)}</Text>
              <Text style={styles.globeStatLabel}>Points</Text>
            </View>
            <View style={styles.globeStatCard}>
              <Ionicons name="earth" size={20} color="#4CAF50" />
              <Text style={styles.globeStatNumber}>{catches.length}</Text>
              <Text style={styles.globeStatLabel}>Locations</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Catch Log */}
      <View style={styles.logSection}>
        <Text style={styles.sectionTitle}>Your Catches</Text>
        <ScrollView style={styles.logList} showsVerticalScrollIndicator={false}>
          {catches.map((catchItem) => (
            <TouchableOpacity
              key={catchItem.id}
              style={styles.logItem}
              onPress={() => handleCatchPress(catchItem)}
              activeOpacity={0.7}
            >
              <View style={styles.logIcon}>
                <Ionicons name="fish" size={20} color="#00d4ff" />
              </View>
              <View style={styles.logInfo}>
                <Text style={styles.logTitle}>{catchItem.species}</Text>
                <Text style={styles.logDetail}>
                  {catchItem.weight}kg • {catchItem.location.name}
                </Text>
              </View>
              <View style={styles.pointsBadge}>
                <Ionicons name="trophy" size={14} color="#FFD700" />
                <Text style={styles.pointsText}>{catchItem.points}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Add Catch Button */}
      <TouchableOpacity
        style={styles.addButton}
        onPress={startNewCatch}
        activeOpacity={0.8}
      >
        <Ionicons name="add-circle" size={28} color="#00d4ff" />
        <Text style={styles.addButtonText}>Log New Catch</Text>
      </TouchableOpacity>
    </View>
  );

  // Render Camera View (consistent with qr-scanner.tsx)
  const renderCameraView = () => (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      >
        <View style={styles.cameraOverlay}>
          {/* Header with close button */}
          <View style={styles.cameraHeader}>
            <TouchableOpacity onPress={backToList} style={styles.closeButton}>
              <Ionicons name="close" size={32} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Center frame */}
          <View style={styles.centerContainer}>
            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
            </View>
            <Text style={styles.instructionText}>
              Frame your catch within the guide
            </Text>
          </View>

          {/* Footer with capture button */}
          <View style={styles.cameraFooter}>
            <TouchableOpacity 
              style={styles.captureButtonWrapper}
              onPress={handleTakePhoto}
            >
              <View style={styles.captureButtonInner}>
                <Ionicons name="camera" size={32} color={Colors.background} />
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </CameraView>
    </View>
  );

  // Start NFC pulsing animation when entering NFC state
  useEffect(() => {
    if (status === 'nfc') {
      // Reset animation values
      nfcScale.setValue(1);
      nfcOpacity.setValue(0.3);
      
      // Pulsing animation
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(nfcScale, {
              toValue: 1.2,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(nfcScale, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(nfcOpacity, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(nfcOpacity, {
              toValue: 0.3,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
        ])
      ).start();
    }
  }, [status]);

  // Render NFC Scan View (consistent with nfc-tap.tsx)
  const renderNFCScanView = () => {
    return (
      <View style={styles.nfcFullScreen}>
        <TouchableOpacity onPress={backToList} style={styles.nfcCloseButton}>
          <Ionicons name="close" size={32} color={Colors.foreground} />
        </TouchableOpacity>

        <View style={styles.nfcContent}>
          {/* Image preview at top */}
          <View style={styles.nfcImagePreview}>
            <Image 
              source={{ uri: capturedImage || '' }} 
              style={styles.capturedImage}
              resizeMode="cover"
            />
          </View>

          {/* Pulsing NFC Icon */}
          <Animated.View
            style={[
              styles.nfcIconContainer,
              {
                transform: [{ scale: nfcScale }],
                opacity: nfcOpacity,
              },
            ]}
          >
            <View style={styles.nfcIconBackground}>
              <Ionicons
                name="phone-portrait-outline"
                size={100}
                color={Colors.accentPrimary}
              />
            </View>
          </Animated.View>

          <Text style={styles.nfcTitle}>Hold Near NFC Tag</Text>
          <Text style={styles.nfcSubtitle}>
            {nfcSupported
              ? 'Position your device near the NFC tag'
              : 'Tap button to simulate NFC'}
          </Text>

          <Text style={styles.sustainabilityScore}>
            🌱 Sustainability Score: {sustainabilityScore}/100
          </Text>

          {/* Simulate button for Expo Go */}
          {!nfcSupported && (
            <TouchableOpacity
              style={styles.simulateButton}
              onPress={startNfcScan}
            >
              <Text style={styles.simulateButtonText}>Simulate NFC Tap</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // Render Submitting View
  const renderSubmittedView = () => (
    <View style={styles.content}>
      <View style={styles.verificationContainer}>
        <Ionicons name="checkmark-circle" size={80} color="#4CAF50" />
        <Text style={styles.verificationText}>Verifying your catch...</Text>
        <Text style={styles.nfcTagId}>Tag ID: {nfcTagId}</Text>
      </View>
    </View>
  );

  // Render Verified View
  const renderVerifiedView = () => (
    <View style={styles.content}>
      <View style={styles.successContainer}>
        <Ionicons name="checkmark-circle" size={100} color="#4CAF50" />
        <Text style={styles.successTitle}>Catch Verified!</Text>
        <Text style={styles.successSubtitle}>
          You've earned {Math.floor(sustainabilityScore / 10)} Blue Tokens 🏆
        </Text>
        
        <View style={styles.statsContainer}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{sustainabilityScore}</Text>
            <Text style={styles.statLabel}>Sustainability</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>#{nfcTagId?.substring(4, 8)}</Text>
            <Text style={styles.statLabel}>Tag ID</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.newCatchButton}
          onPress={backToList}
        >
          <Text style={styles.newCatchButtonText}>View Your Catches</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Catch'em</Text>
        <View style={styles.tokenBadge}>
          <Ionicons name="trophy" size={16} color="#FFD700" />
          <Text style={styles.tokenText}>{blueTokens}</Text>
        </View>
      </View>

      {/* Content */}
      {status === 'list' && renderListView()}
      {status === 'camera' && renderCameraView()}
      {status === 'nfc' && renderNFCScanView()}
      {status === 'submitted' && renderSubmittedView()}
      {status === 'verified' && renderVerifiedView()}

      {/* Catch Details Modal */}
      <Modal
        visible={selectedCatch !== null}
        transparent
        animationType="none"
        onRequestClose={closeDetails}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={closeDetails}
        >
          <Animated.View
            style={[
              styles.detailsContainer,
              {
                transform: [{ translateX: slideAnim }],
              },
            ]}
          >
            <View style={styles.detailsHeader}>
              <Text style={styles.detailsTitle}>Catch Details</Text>
              <TouchableOpacity onPress={closeDetails}>
                <Ionicons name="close" size={24} color={Colors.foreground} />
              </TouchableOpacity>
            </View>

            {selectedCatch && (
              <ScrollView style={styles.detailsContent}>
                <Image 
                  source={{ uri: selectedCatch.imageUri }} 
                  style={styles.detailsImage}
                  resizeMode="cover"
                />
                <View style={styles.detailsInfo}>
                  <Text style={styles.detailsSpecies}>{selectedCatch.species}</Text>
                  <View style={styles.detailsRow}>
                    <Ionicons name="scale-outline" size={18} color={Colors.textMuted} />
                    <Text style={styles.detailsText}>{selectedCatch.weight}kg</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Ionicons name="location-outline" size={18} color={Colors.textMuted} />
                    <Text style={styles.detailsText}>{selectedCatch.location.name}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Ionicons name="time-outline" size={18} color={Colors.textMuted} />
                    <Text style={styles.detailsText}>{selectedCatch.timestamp.toLocaleDateString()}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Ionicons name="leaf-outline" size={18} color={Colors.textMuted} />
                    <Text style={styles.detailsText}>Sustainability: {selectedCatch.sustainabilityScore}/100</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Ionicons name="pricetag-outline" size={18} color={Colors.textMuted} />
                    <Text style={styles.detailsText}>NFC: {selectedCatch.nfcTagId}</Text>
                  </View>
                  <View style={styles.pointsBanner}>
                    <Ionicons name="trophy" size={24} color="#FFD700" />
                    <Text style={styles.pointsBannerText}>{selectedCatch.points} Blue Tokens Earned</Text>
                  </View>
                </View>
              </ScrollView>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 50,
    backgroundColor: Colors.surfacePrimary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.foreground,
  },
  backButton: {
    padding: 8,
  },
  tokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(70, 98, 171, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tokenText: {
    color: Colors.foreground,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  mapContainer: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: Colors.surfacePrimary,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  globeContainer: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  globeWrapper: {
    position: 'relative',
    marginBottom: 20,
  },
  globeShadow: {
    position: 'absolute',
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    top: 10,
    left: 5,
  },
  globe: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(23, 42, 87, 0.4)',
    borderWidth: 3,
    borderColor: 'rgba(70, 98, 171, 0.5)',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#4662ab',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continent1: {
    position: 'absolute',
    width: 40,
    height: 30,
    backgroundColor: 'rgba(130, 130, 130, 0.3)',
    borderRadius: 15,
    top: 30,
    left: 20,
  },
  continent2: {
    position: 'absolute',
    width: 35,
    height: 40,
    backgroundColor: 'rgba(130, 130, 130, 0.3)',
    borderRadius: 18,
    top: 50,
    right: 25,
  },
  continent3: {
    position: 'absolute',
    width: 30,
    height: 25,
    backgroundColor: 'rgba(130, 130, 130, 0.3)',
    borderRadius: 12,
    bottom: 35,
    left: 50,
  },
  globeGrid: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  horizontalLine: {
    position: 'absolute',
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  verticalLine: {
    position: 'absolute',
    width: 1,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  fishMarker: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerPulse: {
    position: 'absolute',
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 212, 255, 0.3)',
    top: 4,
    left: 4,
  },
  globeStats: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  globeStatCard: {
    alignItems: 'center',
    backgroundColor: Colors.surfacePrimary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  globeStatNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.foreground,
    marginVertical: 4,
  },
  globeStatLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 2,
  },
  logSection: {
    flex: 1,
  },
  logList: {
    flex: 1,
  },
  logItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: Colors.surfacePrimary,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  logIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 212, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logInfo: {
    flex: 1,
  },
  logTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 4,
  },
  logDetail: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  pointsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  pointsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFD700',
  },
  addButton: {
    backgroundColor: Colors.accentPrimary,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  cameraHeader: {
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
  cameraFooter: {
    padding: 40,
    alignItems: 'center',
  },
  captureButtonWrapper: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.accentPrimary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.accentPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nfcFullScreen: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  nfcCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nfcContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  nfcImagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 30,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  nfcIconContainer: {
    marginBottom: 30,
  },
  nfcIconBackground: {
    width: 180,
    height: 180,
    borderRadius: 90,
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
  nfcTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.accentLight,
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  nfcSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sustainabilityScore: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.foreground,
    textAlign: 'center',
    marginVertical: 12,
    backgroundColor: Colors.surfacePrimary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  simulateButton: {
    marginTop: 30,
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
  capturedImage: {
    width: '100%',
    height: '100%',
  },
  verificationContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  verificationText: {
    marginTop: 20,
    fontSize: 18,
    color: Colors.foreground,
    fontWeight: '600',
  },
  nfcTagId: {
    marginTop: 12,
    fontSize: 14,
    color: Colors.textMuted,
    fontFamily: 'monospace',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.foreground,
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  successSubtitle: {
    fontSize: 18,
    color: Colors.textMuted,
    marginBottom: 32,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
    gap: 32,
  },
  statItem: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.surfacePrimary,
    borderRadius: 12,
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.foreground,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.textMuted,
  },
  newCatchButton: {
    backgroundColor: Colors.accentPrimary,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  newCatchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  detailsContainer: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: width * 0.85,
    backgroundColor: Colors.background,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surfacePrimary,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.foreground,
  },
  detailsContent: {
    flex: 1,
  },
  detailsImage: {
    width: '100%',
    height: 250,
  },
  detailsInfo: {
    padding: 20,
  },
  detailsSpecies: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.foreground,
    marginBottom: 16,
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  detailsText: {
    fontSize: 16,
    color: Colors.textMuted,
  },
  pointsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  pointsBannerText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFD700',
  },
});