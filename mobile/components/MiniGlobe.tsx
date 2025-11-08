import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Fish tracking data schema (matches frontend globe pointer schema)
export interface FishLocation {
  id: string;
  lat: number;
  lng: number;
  name: string;
  vessel?: {
    name: string;
    imo_number: string;
    model: string;
    flag_state: string;
    year_built: number;
  };
  sustainability_score?: {
    total_score: number;
    categories: {
      vessel_efficiency: { score: number };
      fishing_method: { score: number };
      environmental_practices: { score: number };
      compliance_and_transparency: { score: number };
      social_responsibility: { score: number };
    };
  };
  registered?: boolean;
}

interface MiniGlobeProps {
  fishData: FishLocation[];
  onLocationSelect?: (location: FishLocation) => void;
}

// Utility function to compute grade from score (matches frontend)
const getSustainabilityGrade = (score: number) => {
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  return 'F';
};

// Get color based on sustainability score
const getScoreColor = (score: number) => {
  if (score >= 80) return '#2eb700';
  if (score >= 70) return '#f59e0b';
  if (score >= 60) return '#fb923c';
  return '#fc0303';
};

export default function MiniGlobe({ fishData, onLocationSelect }: MiniGlobeProps) {
  const [selectedLocation, setSelectedLocation] = useState<FishLocation | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  const handleLocationPress = (location: FishLocation) => {
    setSelectedLocation(location);
    setShowPopup(true);
    onLocationSelect?.(location);
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelectedLocation(null);
  };

  // Simple grid layout for fish locations (simulating globe view)
  const renderLocationGrid = () => {
    return (
      <View style={styles.gridContainer}>
        {fishData.map((location, index) => (
          <TouchableOpacity
            key={location.id}
            style={[
              styles.locationPin,
              {
                backgroundColor: location.registered === false 
                  ? Colors.danger 
                  : location.sustainability_score 
                    ? getScoreColor(location.sustainability_score.total_score)
                    : Colors.accentPrimary
              }
            ]}
            onPress={() => handleLocationPress(location)}
          >
            <Ionicons 
              name="location" 
              size={16} 
              color="white" 
            />
            <Text style={styles.pinText} numberOfLines={1}>
              {location.name.split(' ')[0]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  const renderLocationPopup = () => {
    if (!selectedLocation) return null;

    return (
      <Modal
        visible={showPopup}
        transparent
        animationType="fade"
        onRequestClose={closePopup}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.popupContainer}>
            {/* Header */}
            <View style={styles.popupHeader}>
              <View style={styles.headerContent}>
                <Text style={styles.vesselName}>
                  {selectedLocation.vessel?.name || selectedLocation.name}
                </Text>
                {selectedLocation.vessel?.imo_number && (
                  <Text style={styles.imoNumber}>
                    IMO: {selectedLocation.vessel.imo_number}
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={closePopup} style={styles.closeButton}>
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.popupContent} showsVerticalScrollIndicator={false}>
              {/* Coordinates */}
              <View style={styles.coordinatesRow}>
                <View style={styles.coordinateItem}>
                  <Text style={styles.coordinateLabel}>LATITUDE</Text>
                  <Text style={styles.coordinateValue}>{selectedLocation.lat.toFixed(4)}°</Text>
                </View>
                <View style={styles.coordinateItem}>
                  <Text style={styles.coordinateLabel}>LONGITUDE</Text>
                  <Text style={styles.coordinateValue}>{selectedLocation.lng.toFixed(4)}°</Text>
                </View>
              </View>

              {/* Location */}
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>LOCATION</Text>
                <Text style={styles.infoValue}>{selectedLocation.name}</Text>
              </View>

              {/* Vessel Info */}
              {selectedLocation.vessel && (
                <View style={styles.infoSection}>
                  <Text style={styles.infoLabel}>VESSEL MODEL</Text>
                  <Text style={styles.infoValue}>{selectedLocation.vessel.model}</Text>
                  <Text style={styles.infoSubtext}>
                    {selectedLocation.vessel.flag_state} • Built {selectedLocation.vessel.year_built}
                  </Text>
                </View>
              )}

              {/* Registration Status */}
              <View style={styles.infoSection}>
                <Text style={styles.infoLabel}>STATUS</Text>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: selectedLocation.registered === false ? Colors.danger : Colors.success }
                ]}>
                  <Text style={styles.statusText}>
                    {selectedLocation.registered === false ? 'UNREGISTERED' : 'REGISTERED'}
                  </Text>
                </View>
              </View>

              {/* Sustainability Score */}
              {selectedLocation.sustainability_score && (
                <View style={styles.sustainabilitySection}>
                  <View style={styles.scoreHeader}>
                    <Text style={styles.scoreLabel}>SUSTAINABILITY SCORE</Text>
                    <View style={styles.scoreDisplay}>
                      <Text style={[
                        styles.scoreValue,
                        { color: getScoreColor(selectedLocation.sustainability_score.total_score) }
                      ]}>
                        {selectedLocation.sustainability_score.total_score}
                      </Text>
                      <Text style={styles.scoreMax}>/ 100</Text>
                    </View>
                  </View>
                  
                  <View style={[
                    styles.gradeBadge,
                    { backgroundColor: getScoreColor(selectedLocation.sustainability_score.total_score) }
                  ]}>
                    <Text style={styles.gradeText}>
                      Grade: {getSustainabilityGrade(selectedLocation.sustainability_score.total_score)}
                    </Text>
                  </View>

                  {/* Category Breakdown */}
                  <View style={styles.categoriesContainer}>
                    <Text style={styles.categoriesTitle}>Category Breakdown:</Text>
                    {Object.entries(selectedLocation.sustainability_score.categories).map(([key, value]) => (
                      <View key={key} style={styles.categoryRow}>
                        <Text style={styles.categoryName}>
                          {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </Text>
                        <Text style={styles.categoryScore}>{value.score}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="globe-outline" size={24} color={Colors.accentPrimary} />
        <Text style={styles.title}>Fish Tracking Map</Text>
        <Text style={styles.subtitle}>{fishData.length} locations</Text>
      </View>
      
      <View style={styles.mapContainer}>
        {renderLocationGrid()}
      </View>

      {renderLocationPopup()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: 16,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginTop: 8,
  },
  subtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  mapContainer: {
    height: 200,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  gridContainer: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    alignContent: 'space-around',
  },
  locationPin: {
    width: 60,
    height: 50,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  pinText: {
    fontSize: 10,
    color: 'white',
    fontWeight: '600',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  popupContainer: {
    backgroundColor: Colors.surfacePrimary,
    borderRadius: 16,
    width: screenWidth * 0.9,
    maxHeight: screenHeight * 0.8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  popupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerContent: {
    flex: 1,
  },
  vesselName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  imoNumber: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  closeButton: {
    padding: 4,
  },
  popupContent: {
    padding: 20,
  },
  coordinatesRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 16,
  },
  coordinateItem: {
    flex: 1,
  },
  coordinateLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  coordinateValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  infoSection: {
    marginBottom: 16,
  },
  infoLabel: {
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  infoSubtext: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  sustainabilitySection: {
    backgroundColor: Colors.surfaceGlass,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  scoreLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
  },
  scoreDisplay: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  scoreMax: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  gradeBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  gradeText: {
    fontSize: 12,
    fontWeight: '700',
    color: 'white',
  },
  categoriesContainer: {
    marginTop: 8,
  },
  categoriesTitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  categoryName: {
    fontSize: 12,
    color: Colors.textPrimary,
    flex: 1,
  },
  categoryScore: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
});
