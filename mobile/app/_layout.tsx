import React from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '../constants/Colors';

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" backgroundColor={Colors.background} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.background },
          animation: 'fade',
        }}
      >
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(main)" />
      </Stack>
    </AuthProvider>
  );
}
