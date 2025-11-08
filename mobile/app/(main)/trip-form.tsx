import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';

interface FishCategory {
  id: string;
  name: string;
}

export default function TripFormScreen() {
  const router = useRouter();
  const [name, setName] = useState('Captain John Smith');
  const [shipMake, setShipMake] = useState('Boston Whaler 270 Vantage');
  const [shipSerial, setShipSerial] = useState('BW-2024-45789');
  const [agreed, setAgreed] = useState(false);
  
  const [fishCategories, setFishCategories] = useState<FishCategory[]>([
    { id: '1', name: 'Tuna' },
    { id: '2', name: 'Cod' },
    { id: '3', name: 'Salmon' },
  ]);

  const addFishCategory = () => {
    const newId = (fishCategories.length + 1).toString();
    setFishCategories([...fishCategories, { id: newId, name: '' }]);
  };

  const updateFishCategory = (id: string, value: string) => {
    setFishCategories(fishCategories.map(cat => 
      cat.id === id ? { ...cat, name: value } : cat
    ));
  };

  const removeFishCategory = (id: string) => {
    if (fishCategories.length > 1) {
      setFishCategories(fishCategories.filter(cat => cat.id !== id));
    }
  };

  const handleSubmit = () => {
    if (!agreed) {
      alert('Please agree to the terms before submitting');
      return;
    }
    // TODO: Save trip data
    router.back();
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Things to Note</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* Name */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Enter your name"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Ship Make */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ship Make</Text>
          <TextInput
            style={styles.input}
            value={shipMake}
            onChangeText={setShipMake}
            placeholder="Enter ship make"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Ship Serial Number */}
        <View style={styles.formGroup}>
          <Text style={styles.label}>Ship Serial Number</Text>
          <TextInput
            style={styles.input}
            value={shipSerial}
            onChangeText={setShipSerial}
            placeholder="Enter serial number"
            placeholderTextColor={Colors.textMuted}
          />
        </View>

        {/* Fish Categories */}
        <View style={styles.formGroup}>
          <View style={styles.labelRow}>
            <Text style={styles.label}>Fish Categories</Text>
            <TouchableOpacity onPress={addFishCategory} style={styles.addButton}>
              <Ionicons name="add-circle" size={24} color={Colors.accentPrimary} />
              <Text style={styles.addButtonText}>Add More</Text>
            </TouchableOpacity>
          </View>

          {fishCategories.map((category, index) => (
            <View key={category.id} style={styles.categoryRow}>
              <TextInput
                style={[styles.input, styles.categoryInput]}
                value={category.name}
                onChangeText={(value) => updateFishCategory(category.id, value)}
                placeholder={`Fish type ${index + 1}`}
                placeholderTextColor={Colors.textMuted}
              />
              {fishCategories.length > 1 && (
                <TouchableOpacity 
                  onPress={() => removeFishCategory(category.id)}
                  style={styles.removeButton}
                >
                  <Ionicons name="close-circle" size={24} color={Colors.danger} />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>

        {/* Agreement Checkbox */}
        <TouchableOpacity 
          style={styles.checkboxRow}
          onPress={() => setAgreed(!agreed)}
          activeOpacity={0.7}
        >
          <View style={[styles.checkbox, agreed && styles.checkboxChecked]}>
            {agreed && <Ionicons name="checkmark" size={18} color="white" />}
          </View>
          <Text style={styles.checkboxLabel}>
            I agree to the terms and conditions and confirm the accuracy of the information provided
          </Text>
        </TouchableOpacity>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, !agreed && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!agreed}
          activeOpacity={0.7}
        >
          <Text style={styles.submitButtonText}>Submit</Text>
        </TouchableOpacity>
      </ScrollView>
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
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceGlass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.foreground,
    marginBottom: 8,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surfacePrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.foreground,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.accentPrimary,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  categoryInput: {
    flex: 1,
    marginBottom: 0,
  },
  removeButton: {
    padding: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 32,
    gap: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.accentPrimary,
    borderColor: Colors.accentPrimary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  submitButton: {
    backgroundColor: Colors.accentPrimary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 40,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.surfaceGlass,
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.foreground,
    letterSpacing: 0.5,
  },
});
