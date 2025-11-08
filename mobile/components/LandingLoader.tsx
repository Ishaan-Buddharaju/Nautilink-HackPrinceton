import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Dimensions, Image } from 'react-native';

const DURATION_MS = 3000;
const ROW_COUNT = 6;
const FISH_PER_ROW = 10;
const { width, height } = Dimensions.get('window');

interface LandingLoaderProps {
  onComplete?: () => void;
}

export default function LandingLoader({ onComplete }: LandingLoaderProps) {
  const [visible, setVisible] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  
  // Create animated values for each row
  const rowAnimations = useRef(
    Array.from({ length: ROW_COUNT }, () => new Animated.Value(0))
  ).current;

  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Start all fish swimming animations
    const fishAnimations = rowAnimations.map((anim, index) => {
      return Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 3000,
          delay: index * 250,
          useNativeDriver: true,
        })
      );
    });

    fishAnimations.forEach((anim) => anim.start());

    // Start progress bar animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: DURATION_MS,
      useNativeDriver: false,
    }).start();

    // Fade out animation
    const fadeTimer = setTimeout(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, DURATION_MS - 600);

    // Hide component
    const hideTimer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, DURATION_MS);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
      fishAnimations.forEach((anim) => anim.stop());
    };
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* Fish rows */}
      {rowAnimations.map((anim, rowIdx) => {
        const translateX = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-width * 0.25, width * 1.25],
        });

        const scale = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.95, 1.05],
        });

        const opacity = anim.interpolate({
          inputRange: [0, 0.1, 0.6, 1],
          outputRange: [0.1, 0.8, 1, 0.15],
        });

        return (
          <Animated.View
            key={rowIdx}
            style={[
              styles.row,
              {
                top: `${12 + rowIdx * 12}%`,
                transform: [{ translateX }, { scale }],
                opacity,
              },
            ]}
          >
            {Array.from({ length: FISH_PER_ROW }).map((_, fishIdx) => (
              <Image
                key={fishIdx}
                source={require('../assets/fish-landing.png')}
                style={styles.fish}
                resizeMode="contain"
              />
            ))}
          </Animated.View>
        );
      })}

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 0.18, 0.38, 0.62, 0.82, 1],
                  outputRange: ['0%', '40%', '70%', '100%', '100%', '100%'],
                }),
                opacity: progressAnim.interpolate({
                  inputRange: [0, 0.18, 0.38, 0.62, 0.82, 1],
                  outputRange: [0, 0.85, 1, 0.9, 0.6, 0],
                }),
              },
            ]}
          />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 2000,
  },
  row: {
    position: 'absolute',
    flexDirection: 'row',
    left: 0,
    width: width * 2,
    gap: 32,
  },
  fish: {
    width: 120,
    height: 120,
    shadowColor: '#4662ab',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
  },
  progressContainer: {
    position: 'absolute',
    bottom: '7%',
    left: '12%',
    right: '12%',
    height: 10,
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
    shadowColor: '#4662ab',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  progressTrack: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    bottom: 2,
  },
  progressBar: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: 'rgba(224, 242, 253, 0.85)',
    shadowColor: 'rgba(224, 242, 253, 0.45)',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
});
