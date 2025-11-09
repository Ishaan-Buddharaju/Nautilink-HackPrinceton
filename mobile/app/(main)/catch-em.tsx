// app/(main)/catch-em.tsx
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Animated, Alert, ScrollView, Modal, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

const { width, height } = Dimensions.get('window');

// Import unified NFC module
import { nfcManager, initNFC, readNFC, isNFCAvailable, simulateNFC, cleanupNFC } from '../../utils/nfcManager';
import MiniGlobe, { FishLocation } from '../../components/MiniGlobe';

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

  // Convert catches to FishLocation format for MiniGlobe
  const convertCatchesToFishLocations = (catches: Catch[]): FishLocation[] => {
    return catches.map(catchItem => ({
      id: catchItem.id,
      lat: catchItem.location.lat,
      lng: catchItem.location.lng,
      name: catchItem.location.name,
      vessel: {
        name: `Catch: ${catchItem.species}`,
        imo_number: catchItem.nfcTagId,
        model: `${catchItem.weight}kg ${catchItem.species}`,
        flag_state: 'Consumer',
        year_built: new Date(catchItem.timestamp).getFullYear()
      },
      sustainability_score: {
        total_score: catchItem.sustainabilityScore || 75,
        categories: {
          vessel_efficiency: { score: 75 },
          fishing_method: { score: 80 },
          environmental_practices: { score: catchItem.sustainabilityScore || 75 },
          compliance_and_transparency: { score: 85 },
          social_responsibility: { score: 70 }
        }
      },
      registered: true
    }));
  };

  // Initialize NFC on component mount - no mock data, only verified catches
  useEffect(() => {
    initNfc();
  }, []);

  // Request camera permissions when opening camera
  useEffect(() => {
    if (status === 'camera' && !cameraPermission?.granted) {
      requestCameraPermission();
    }
  }, [status]);

  // NFC Functions using unified module
  const initNfc = async () => {
    try {
      const result = await initNFC();
      setNfcSupported(result.success);
      
      if (!result.success) {
        console.log('NFC init failed:', result.error);
      }
    } catch (error) {
      console.error('NFC init error:', error);
      setNfcSupported(false);
    }
  };

  const startNfcScan = async () => {
    if (!nfcSupported) {
      Alert.alert('NFC Not Available', 'NFC is required for catch verification. Please ensure NFC is enabled on your device.');
      return;
    }

    try {
      const result = await readNFC();
      if (result.success) {
        console.log('NFC Tag detected:', result.data);
        handleNfcDetected(result.data.id);
      } else {
        console.warn('NFC read failed:', result.error);
        Alert.alert('NFC Read Failed', result.error || 'Could not read NFC tag. Please try again.');
      }
    } catch (error) {
      console.warn('NFC read cancelled or failed:', error);
      Alert.alert('NFC Error', 'NFC operation failed. Please try again.');
    }
  };

  const handleNfcDetected = (tagId: string) => {
    setNfcTagId(tagId);
    setStatus('submitted');
    
    // Simulate blockchain verification process
    setTimeout(() => {
      // Step 1: Verify NFC tag authenticity
      console.log('Step 1: Verifying NFC tag authenticity...');
      
      setTimeout(() => {
        // Step 2: Record transaction on blockchain
        console.log('Step 2: Recording transaction on blockchain...');
        
        setTimeout(() => {
          // Step 3: Confirm blockchain nodes consensus
          console.log('Step 3: Confirming blockchain consensus...');
          
          // Only after full blockchain verification, add to logs
          setStatus('verified');
          const tokens = Math.floor(sustainabilityScore / 10);
          setBlueTokens(prev => prev + tokens);
          
          // Generate blockchain transaction hash
          const blockchainHash = `0x${Math.random().toString(16).substr(2, 8)}${Date.now().toString(16)}`;
          
          // Add verified catch to log with blockchain proof
          const newCatch: Catch = {
            id: blockchainHash, // Use blockchain hash as ID
            species: 'Verified Catch',
            weight: Math.random() * 10 + 5,
            location: { name: 'Current Location', lat: 25.7617, lng: -80.1918 },
            timestamp: new Date(),
            nfcTagId: tagId,
            points: tokens,
            imageUri: capturedImage || '',
            sustainabilityScore,
          };
          
          setCatches(prev => [newCatch, ...prev]);
          console.log('✅ Catch verified and recorded on blockchain:', blockchainHash);
        }, 1000);
      }, 1000);
    }, 1000);
  };

  // Camera Functions with error handling
  const handleTakePhoto = async () => {
    if (!cameraPermission?.granted) {
      Alert.alert('Permission required', 'Camera permission is needed to take photos');
      return;
    }

    // Prevent taking photo if camera is not ready or being unmounted
    if (status !== 'camera' || !cameraRef.current) {
      console.warn('Camera not ready for photo capture');
      return;
    }

    try {
      setIsLoading(true);
      
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: true,
      });

      if (photo?.uri && status === 'camera') {
        setCapturedImage(photo.uri);
        // Simulate AI analysis
        setTimeout(() => {
          if (status === 'camera') { // Only proceed if still in camera mode
            setStatus('nfc');
            // Mock sustainability score (60-100)
            const score = Math.floor(Math.random() * 40) + 60;
            setSustainabilityScore(score);
          }
        }, 1500);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      // Only show alert if still in camera mode
      if (status === 'camera') {
        Alert.alert('Error', 'Failed to take photo. Please try again.');
      }
    } finally {
      setIsLoading(false);
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
      {/* High-Quality MiniGlobe */}
      <MiniGlobe 
        fishData={convertCatchesToFishLocations(catches)} 
        onLocationSelect={(location) => {
          // Find the corresponding catch and show details
          const correspondingCatch = catches.find(c => c.id === location.id);
          if (correspondingCatch) {
            handleCatchPress(correspondingCatch);
          }
        }}
      />

      {/* Stats cards */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Ionicons name="fish" size={20} color="#00d4ff" />
          <Text style={styles.statNumber}>{catches.length}</Text>
          <Text style={styles.statLabel}>Catches</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="trophy" size={20} color="#FFD700" />
          <Text style={styles.statNumber}>{catches.reduce((sum, c) => sum + c.points, 0)}</Text>
          <Text style={styles.statLabel}>Points</Text>
        </View>
        <View style={styles.statCard}>
          <Ionicons name="earth" size={20} color="#4CAF50" />
          <Text style={styles.statNumber}>{catches.length}</Text>
          <Text style={styles.statLabel}>Locations</Text>
        </View>
      </View>

      {/* Catch Log */}
      <View style={styles.logSection}>
        <Text style={styles.sectionTitle}>Your Catches</Text>
        <ScrollView style={styles.logList} showsVerticalScrollIndicator={false}>
          {catches.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="cube-outline" size={60} color={Colors.textMuted} />
              <Text style={styles.emptyStateTitle}>No Verified Catches Yet</Text>
              <Text style={styles.emptyStateText}>
                Catches will appear here after completing the full verification process:
                {'\n'}📷 Photo → 📱 NFC Scan → ⛓️ Blockchain Recording
              </Text>
            </View>
          ) : (
            catches.map((catchItem) => (
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
                    {catchItem.weight.toFixed(1)}kg • {catchItem.location.name}
                  </Text>
                  <Text style={styles.blockchainId}>
                    ⛓️ {catchItem.id}
                  </Text>
                </View>
                <View style={styles.pointsBadge}>
                  <Ionicons name="trophy" size={14} color="#FFD700" />
                  <Text style={styles.pointsText}>{catchItem.points}</Text>
                </View>
              </TouchableOpacity>
            ))
          )}
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

  // Render Camera View with overlay positioned absolutely
  const renderCameraView = () => (
    <View style={styles.cameraContainer}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="back"
      />
      
      {/* Overlay positioned absolutely over camera */}
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
            disabled={isLoading}
          >
            <View style={styles.captureButtonInner}>
              <Ionicons 
                name={isLoading ? "hourglass" : "camera"} 
                size={32} 
                color={Colors.background} 
              />
            </View>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Start NFC pulsing animation and scanning when entering NFC state
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

      // Automatically start NFC scanning
      startNfcScan();
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
            Position your device near the NFC tag to verify your catch
          </Text>

          <Text style={styles.sustainabilityScore}>
            🌱 Sustainability Score: {sustainabilityScore}/100
          </Text>
        </View>
      </View>
    );
  };

  // Render Blockchain Verification View
  const renderSubmittedView = () => (
    <View style={styles.content}>
      <View style={styles.verificationContainer}>
        <Ionicons name="cube-outline" size={80} color="#4662ab" />
        <Text style={styles.verificationText}>Recording on Blockchain...</Text>
        <Text style={styles.nfcTagId}>NFC Tag: {nfcTagId}</Text>
        
        <View style={styles.blockchainSteps}>
          <Text style={styles.stepText}>🔐 Verifying NFC authenticity</Text>
          <Text style={styles.stepText}>⛓️ Recording transaction</Text>
          <Text style={styles.stepText}>🌐 Confirming node consensus</Text>
        </View>
        
        <Text style={styles.blockchainNote}>
          Your catch will appear in logs after blockchain confirmation
        </Text>
      </View>
    </View>
  );

  // Render Verified View
  const renderVerifiedView = () => (
    <View style={styles.content}>
      <View style={styles.successContainer}>
        <Ionicons name="checkmark-circle" size={100} color="#4CAF50" />
        <Text style={styles.successTitle}>Blockchain Verified! ⛓️</Text>
        <Text style={styles.successSubtitle}>
          Transaction recorded on blockchain • {Math.floor(sustainabilityScore / 10)} Blue Tokens earned 🏆
        </Text>
        
        <View style={styles.verificationStatsContainer}>
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
  blockchainId: {
    fontSize: 12,
    color: Colors.accentPrimary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.foreground,
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    lineHeight: 20,
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
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    zIndex: 1,
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
  blockchainSteps: {
    marginTop: 30,
    alignItems: 'center',
    gap: 12,
  },
  stepText: {
    fontSize: 16,
    color: Colors.foreground,
    textAlign: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.surfacePrimary,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 250,
  },
  blockchainNote: {
    marginTop: 20,
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 20,
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
  verificationStatsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  statCard: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 8,
  },
});