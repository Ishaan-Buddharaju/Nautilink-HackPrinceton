import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';

interface HeaderProps {
  title: string;
  onBackPress?: () => void;
  rightAction?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  };
}

export default function Header({ title, onBackPress, rightAction }: HeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.leftSection}>
        {onBackPress && (
          <TouchableOpacity onPress={onBackPress} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={Colors.foreground} />
          </TouchableOpacity>
        )}
      </View>
      
      <Text style={styles.title}>{title}</Text>
      
      <View style={styles.rightSection}>
        {rightAction && (
          <TouchableOpacity onPress={rightAction.onPress} style={styles.iconButton}>
            <Ionicons name={rightAction.icon} size={24} color={Colors.foreground} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  leftSection: {
    width: 40,
    alignItems: 'flex-start',
  },
  rightSection: {
    width: 40,
    alignItems: 'flex-end',
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
    color: Colors.foreground,
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  iconButton: {
    padding: 4,
  },
});
