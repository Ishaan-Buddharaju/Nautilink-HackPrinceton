import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/Colors';

// Root - redirects to home if authenticated, login if not
export default function Index() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (user) {
        router.replace('/(main)/home');
      } else {
        router.replace('/(auth)/login');
      }
    }
  }, [user, isLoading, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Colors.accentPrimary} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
