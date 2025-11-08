import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="dashboard" />
      <Stack.Screen name="trip" />
      <Stack.Screen name="trip-form" />
      <Stack.Screen name="add-trip" />
      <Stack.Screen name="nfc-tap" />
      <Stack.Screen name="qr-scanner" />
      <Stack.Screen name="catch-em" />
    </Stack>
  );
}
