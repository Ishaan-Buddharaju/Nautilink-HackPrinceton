import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  Dimensions,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabaseClient';

const { height } = Dimensions.get('window');

interface Trip {
  id: string;
  ipAddress: string;
  timestamp: Date;
  hash: string;
  status: string;
  weight: number;
}

export default function TripScreen() {
  const router = useRouter();
  const [showCamera, setShowCamera] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);
  const [slideAnim] = useState(new Animated.Value(500));
  const [tripInProgress, setTripInProgress] = useState(false);
  const [showMintPrompt, setShowMintPrompt] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isMinting, setIsMinting] = useState(false);
  const [mintingStatus, setMintingStatus] = useState<string>('');
  
  const { user } = useAuth();
  
  const scrollViewRef = useRef<ScrollView>(null);

  const [trips] = useState<Trip[]>([
    {
      id: '1',
      ipAddress: '192.168.1.101',
      timestamp: new Date(),
      hash: '0x8A9f2E3B7D6C5a4F1b0e8d9c7A6B5C4D3E2F1A0B',
      status: 'Completed',
      weight: 145.5,
    },
    {
      id: '2',
      ipAddress: '192.168.1.102',
      timestamp: new Date(Date.now() - 86400000),
      hash: '0x3F1E4D5C6B7A8E9D0C1B2A3E4F5D6C7B8A9E0F1',
      status: 'Completed',
      weight: 203.2,
    },
    {
      id: '3',
      ipAddress: '192.168.1.103',
      timestamp: new Date(Date.now() - 172800000),
      hash: '0x7B8C9D0E1F2A3B4C5D6E7F8A9B0C1D2E3F4A5B6',
      status: 'Completed',
      weight: 178.9,
    },
    {
      id: '4',
      ipAddress: '192.168.1.104',
      timestamp: new Date(Date.now() - 259200000),
      hash: '0x2C3D4E5F6A7B8C9D0E1F2A3B4C5D6E7F8A9B0C1',
      status: 'Completed',
      weight: 192.3,
    },
  ]);

  const totalTrips = trips.length;
  const totalKg = trips.reduce((sum, trip) => sum + trip.weight, 0);


  const openCamera = async () => {
    if (!permission?.granted) {
      const result = await requestPermission();
      if (!result.granted) {
        Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
        return;
      }
    }
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      const photo = await cameraRef.current.takePictureAsync();
      console.log('Photo taken:', photo.uri);
      setCapturedPhoto(photo.uri);
      setShowCamera(false);
      setShowMintPrompt(true);
    }
  };

  const handleMint = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in to mint a catch');
      return;
    }
    
    setIsMinting(true);
    setMintingStatus('Getting your location...');
    
    try {
      // Step 1: Get location permission and coordinates
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to mint a catch');
        setIsMinting(false);
        return;
      }
      
      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const locationString = `${latitude},${longitude}`;
      
      setMintingStatus('Preparing catch data...');
      
      // Step 2: Generate unique IDs and metadata
      const timestamp = Math.floor(Date.now() / 1000);
      const crateId = `CATCH_${timestamp}_${user.sub.substring(0, 8)}`;
      const crateDid = `did:nautilink:crate:${crateId}`;
      const ownerDid = `did:nautilink:user:${user.sub}`;
      const deviceDid = `did:nautilink:device:mobile_${timestamp}`;
      
      // Step 3: Generate hash and IPFS CID (mock for now)
      const dataToHash = `${crateId}${locationString}${timestamp}${user.sub}`;
      const hashDigest = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        dataToHash
      );
      
      // Mock IPFS CID (in production, upload photo to IPFS first)
      const ipfsCid = `Qm${hashDigest.substring(0, 44)}`;
      
      // Default weight (could be user input in future)
      const weight = 1000; // 1kg default
      
      setMintingStatus('Connecting to blockchain...');
      
      // Step 4: Get auth token
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      
      if (!accessToken) {
        throw new Error('No authentication token available');
      }
      
      // Step 5: Call backend API
      // IMPORTANT: Replace with your computer's local IP address (run: ipconfig getifaddr en0)
      const apiUrl = 'http://192.168.1.100:8000/web3/create-crate';  // ← Update this IP!
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          crate_id: crateId,
          crate_did: crateDid,
          owner_did: ownerDid,
          device_did: deviceDid,
          location: locationString,
          weight: weight,
          ipfs_cid: ipfsCid,
          hash: hashDigest,
          timestamp: timestamp,
          solana_wallet: '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM', // Default wallet for mobile
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to mint catch');
      }
      
      const result = await response.json();
      
      setMintingStatus('Success!');
      setIsMinting(false);
      setShowMintPrompt(false);
      setCapturedPhoto(null);
      
      // Show success with blockchain details
      Alert.alert(
        'Catch Minted! 🎣',
        `Your catch has been recorded on the blockchain!\n\nCrate ID: ${crateId}\nLocation: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}\nWeight: ${weight}g\n\nTransaction ready for signing.`,
        [
          {
            text: 'View Details',
            onPress: () => console.log('View transaction:', result.crate_pubkey),
          },
          { text: 'OK' },
        ]
      );
      
    } catch (error: any) {
      console.error('Minting error:', error);
      setIsMinting(false);
      
      let errorMessage = 'Failed to mint catch. Please try again.';
      if (error.message.includes('Location')) {
        errorMessage = 'Could not get your location. Please enable GPS.';
      } else if (error.message.includes('authentication')) {
        errorMessage = 'Please sign in again.';
      } else if (error.message.includes('Network')) {
        errorMessage = 'Connection error. Please check your internet.';
      }
      
      Alert.alert('Minting Failed', errorMessage);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      Alert.alert('Success', 'Photo selected!');
      // TODO: Handle photo upload
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const handleTripPress = (trip: Trip) => {
    setSelectedTrip(trip);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  };

  const closeDetails = () => {
    Animated.timing(slideAnim, {
      toValue: 500,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setSelectedTrip(null);
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trip</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        {/* Start Trip Button */}
        {!tripInProgress ? (
          <Link 
            href="/(main)/trip-form" 
            asChild
          >
            <TouchableOpacity
              style={styles.startTripButton}
              onPress={() => setTripInProgress(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.startTripText}>Start Trip</Text>
              <Ionicons name="arrow-forward" size={20} color={Colors.background} />
            </TouchableOpacity>
          </Link>
        ) : (
          <View style={[styles.startTripButton, styles.startTripButtonDisabled]}>
            <Text style={[styles.startTripText, styles.startTripTextDisabled]}>Trip In Progress</Text>
            <Ionicons name="checkmark-circle" size={20} color={Colors.textMuted} />
          </View>
        )}

        {/* Stats Section */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>STATS</Text>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalTrips}</Text>
              <Text style={styles.statLabel}>Total Trips</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{totalKg.toFixed(1)}</Text>
              <Text style={styles.statLabel}>Total Kg</Text>
            </View>
          </View>
        </View>

        {/* Trips List - Auto-scrolling */}
        <View style={styles.tripsSection}>
          <Text style={styles.sectionTitle}>Recent Trips</Text>
          <ScrollView
            ref={scrollViewRef}
            style={styles.tripsList}
            showsVerticalScrollIndicator={false}
          >
            {trips.concat(trips).map((trip, index) => (
              <TouchableOpacity
                key={`${trip.id}-${index}`}
                style={styles.tripItem}
                onPress={() => handleTripPress(trip)}
                activeOpacity={0.7}
              >
                <View style={styles.tripIcon}>
                  <Ionicons name="boat" size={20} color={Colors.accentPrimary} />
                </View>
                <View style={styles.tripContent}>
                  <Text style={styles.tripIP}>{trip.ipAddress}</Text>
                  <Text style={styles.tripTime}>
                    {trip.timestamp.toLocaleDateString()}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={Colors.textMuted} />
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Mint a Catch Button - Only shown when trip is in progress */}
        {tripInProgress && (
          <TouchableOpacity
            style={styles.mintCatchButton}
            onPress={openCamera}
            activeOpacity={0.8}
          >
            <Ionicons name="fish" size={28} color={Colors.accentPrimary} />
            <Text style={styles.mintCatchText}>Mint a Catch</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Camera Modal */}
      <Modal
        visible={showCamera}
        animationType="slide"
        onRequestClose={() => setShowCamera(false)}
      >
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing={facing}
          />
          
          <View style={styles.cameraOverlay}>
            <View style={styles.cameraHeader}>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => setShowCamera(false)}
              >
                <Ionicons name="close" size={32} color="white" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={toggleCameraFacing}
              >
                <Ionicons name="camera-reverse" size={32} color="white" />
              </TouchableOpacity>
            </View>

            <View style={styles.cameraFooter}>
              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Mint Prompt Modal */}
      <Modal
        visible={showMintPrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMintPrompt(false)}
      >
        <View style={styles.mintModalOverlay}>
          <View style={styles.mintModalContent}>
            <View style={styles.mintIconContainer}>
              <Ionicons name="checkmark-circle" size={80} color={Colors.accentPrimary} />
            </View>
            
            <Text style={styles.mintModalTitle}>Photo Captured!</Text>
            <Text style={styles.mintModalSubtitle}>Ready to mint your catch</Text>
            
            {isMinting ? (
              <View style={styles.mintingContainer}>
                <ActivityIndicator size="large" color={Colors.accentPrimary} />
                <Text style={styles.mintingText}>{mintingStatus}</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.mintButton}
                onPress={handleMint}
                activeOpacity={0.8}
              >
                <Ionicons name="flash" size={24} color={Colors.background} />
                <Text style={styles.mintButtonText}>Press to Mint</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowMintPrompt(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Trip Details Slide-over */}
      <Modal
        visible={selectedTrip !== null}
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
              styles.slideOver,
              { transform: [{ translateX: slideAnim }] }
            ]}
          >
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.slideOverHeader}>
                <Text style={styles.slideOverTitle}>Trip Details</Text>
                <TouchableOpacity onPress={closeDetails} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={Colors.foreground} />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.slideOverContent}>
                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>IP Address</Text>
                  <Text style={styles.detailValueMono}>
                    {selectedTrip?.ipAddress}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Hash</Text>
                  <Text style={styles.detailValueMono}>
                    {selectedTrip?.hash}
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Status</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>
                      {selectedTrip?.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Weight</Text>
                  <Text style={styles.detailValue}>
                    {selectedTrip?.weight} kg
                  </Text>
                </View>

                <View style={styles.detailItem}>
                  <Text style={styles.detailLabel}>Date</Text>
                  <Text style={styles.detailValue}>
                    {selectedTrip?.timestamp.toLocaleString()}
                  </Text>
                </View>
              </ScrollView>
            </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.accentLight,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  startTripButton: {
    backgroundColor: Colors.accentPrimary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    marginBottom: 32,
    shadowColor: Colors.accentPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  startTripButtonDisabled: {
    backgroundColor: Colors.surfaceGlass,
    opacity: 0.6,
    shadowOpacity: 0,
  },
  startTripText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.background,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  startTripTextDisabled: {
    color: Colors.textMuted,
  },
  statsContainer: {
    marginBottom: 32,
  },
  statsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.accentLight,
    letterSpacing: 2,
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surfacePrimary,
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 36,
    fontWeight: '800',
    color: Colors.accentPrimary,
    marginBottom: 8,
    textShadowColor: Colors.accentPrimary + '40',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontWeight: '600',
  },
  tripsSection: {
    flex: 1,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.accentLight,
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  tripsList: {
    maxHeight: height * 0.4,
    backgroundColor: Colors.surfacePrimary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tripItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    backgroundColor: Colors.surfacePrimary,
  },
  tripIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  tripContent: {
    flex: 1,
  },
  tripIP: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.accentLight,
    fontFamily: 'Courier',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  tripTime: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  addTripButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.surfaceGlass,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.accentPrimary,
  },
  addTripText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.accentPrimary,
    letterSpacing: 0.5,
  },
  cameraContainer: {
    flex: 1,
    backgroundColor: 'black',
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
    justifyContent: 'space-between',
  },
  cameraHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 20,
    paddingTop: 60,
  },
  cameraButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraFooter: {
    padding: 40,
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 5,
    borderColor: Colors.accentPrimary,
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.accentPrimary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  slideOver: {
    width: '85%',
    height: '100%',
    backgroundColor: Colors.background,
    borderLeftWidth: 1,
    borderLeftColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: -2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  slideOverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  slideOverTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideOverContent: {
    padding: 20,
  },
  detailItem: {
    marginBottom: 24,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.foreground,
    fontWeight: '500',
  },
  detailValueMono: {
    fontSize: 13,
    color: Colors.foreground,
    fontFamily: 'Courier',
    fontWeight: '500',
  },
  statusBadge: {
    backgroundColor: Colors.success + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
  mintCatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceGlass,
    borderWidth: 2,
    borderColor: Colors.accentPrimary,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    marginHorizontal: 16,
    marginBottom: 24,
    shadowColor: Colors.accentPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  mintCatchText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.accentPrimary,
    marginLeft: 12,
  },
  mintModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mintModalContent: {
    backgroundColor: Colors.surfacePrimary,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.accentPrimary,
    shadowColor: Colors.accentPrimary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  mintIconContainer: {
    marginBottom: 24,
  },
  mintModalTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.foreground,
    marginBottom: 8,
    textAlign: 'center',
  },
  mintModalSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 32,
    textAlign: 'center',
  },
  mintButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.accentPrimary,
    paddingVertical: 18,
    paddingHorizontal: 40,
    borderRadius: 16,
    width: '100%',
    marginBottom: 16,
    shadowColor: Colors.accentPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  mintButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.background,
    marginLeft: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  cancelButtonText: {
    fontSize: 16,
    color: Colors.textMuted,
    fontWeight: '600',
  },
  mintingContainer: {
    paddingVertical: 32,
    alignItems: 'center',
    width: '100%',
  },
  mintingText: {
    fontSize: 16,
    color: Colors.accentPrimary,
    marginTop: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
