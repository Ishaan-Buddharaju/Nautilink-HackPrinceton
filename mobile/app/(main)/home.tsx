import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import LandingLoader from '../../components/LandingLoader';

const { width, height } = Dimensions.get('window');

export default function HomeScreen() {
  const router = useRouter();
  const [showContent, setShowContent] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  
  // Animation values for network nodes
  const nodeAnimations = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fade in content after loader completes
    setTimeout(() => setShowContent(true), 3100);

    // Animate network nodes
    const animations = nodeAnimations.map((anim, index) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000 + index * 300,
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 2000 + index * 300,
            useNativeDriver: true,
          }),
        ])
      );
    });

    animations.forEach(anim => anim.start());

    // Pulse animation for central node
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const handleEnterApp = () => {
    router.push('/(main)/dashboard');
  };

  return (
    <View style={styles.container}>
      {/* Landing Loader */}
      {showLoader && (
        <LandingLoader onComplete={() => setShowLoader(false)} />
      )}
      {/* Animated Network Nodes Background */}
      <View style={styles.nodesBackground}>
        {/* Central Pulsing Node */}
        <Animated.View
          style={[
            styles.nodeLarge,
            styles.centralNodeLarge,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <View style={styles.nodeCoreLarge} />
        </Animated.View>

        {/* Orbiting Nodes */}
        {nodeAnimations.map((anim, index) => {
          const angle = (index * 72 * Math.PI) / 180;
          const radius = 150;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;

          return (
            <Animated.View
              key={index}
              style={[
                styles.nodeSmall,
                {
                  left: width / 2 + x - 15,
                  top: height / 2 + y - 15,
                  opacity: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 1],
                  }),
                },
              ]}
            >
              <View style={styles.nodeCoreSmall} />
            </Animated.View>
          );
        })}

        {/* Connection Lines to Central Node */}
        {[0, 1, 2, 3, 4].map((index) => {
          const angle = (index * 72 * Math.PI) / 180;
          const length = 150;
          const rotation = `${(index * 72)}deg`;

          return (
            <View
              key={`line-${index}`}
              style={[
                styles.connectionLineLarge,
                {
                  transform: [{ rotate: rotation }],
                },
              ]}
            />
          );
        })}
      </View>

      {/* Content Overlay */}
      <View style={styles.contentOverlay}>
        {/* Branding Section */}
        <View style={styles.brandingSection}>
          <Text style={styles.logo}>Nautilink</Text>
          <Text style={styles.subtitle}>Advanced Maritime Intelligence{"\n"}& Surveillance Platform</Text>
        </View>

        {/* Enter Button */}
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={styles.enterButton}
            onPress={handleEnterApp}
            activeOpacity={0.8}
          >
            <Text style={styles.enterButtonText}>Consumer Dashboard</Text>
            <Ionicons name="arrow-forward" size={24} color="#e0f2fd" />
          </TouchableOpacity>

          <Link href="/(main)/trip" asChild>
            <TouchableOpacity style={styles.secondaryButton} activeOpacity={0.7}>
              <Ionicons name="fish" size={20} color={Colors.accentPrimary} />
              <Text style={styles.secondaryButtonText}>Fisher Dashboard</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#171717',
  },
  nodesBackground: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeLarge: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(70, 98, 171, 0.2)',
    borderWidth: 3,
    borderColor: '#4662ab',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4662ab',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 8,
  },
  centralNodeLarge: {
    left: width / 2 - 40,
    top: height / 2 - 40,
  },
  nodeCoreLarge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#4662ab',
  },
  nodeSmall: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(70, 98, 171, 0.3)',
    borderWidth: 2,
    borderColor: '#4662ab',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nodeCoreSmall: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4662ab',
  },
  connectionLineLarge: {
    position: 'absolute',
    width: 150,
    height: 2,
    backgroundColor: '#4662ab',
    opacity: 0.3,
    left: width / 2,
    top: height / 2,
    transformOrigin: 'left center',
  },
  contentOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    zIndex: 10,
  },
  brandingSection: {
    alignItems: 'center',
    marginBottom: 60,
  },
  logo: {
    fontSize: 48,
    fontWeight: '800',
    color: '#e0f2fd',
    letterSpacing: 4,
    marginBottom: 20,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '300',
    color: '#d2deea',
    textAlign: 'center',
    lineHeight: 24,
    letterSpacing: 0.5,
  },
  actionSection: {
    width: '100%',
    gap: 16,
  },
  enterButton: {
    backgroundColor: '#4662ab',
    paddingVertical: 18,
    paddingHorizontal: 32,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    shadowColor: '#4662ab',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  enterButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e0f2fd',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  secondaryButton: {
    backgroundColor: 'rgba(70, 98, 171, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4662ab',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4662ab',
    letterSpacing: 0.5,
  },
});
