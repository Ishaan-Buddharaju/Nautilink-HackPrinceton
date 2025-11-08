import { Stack } from 'expo-router';

export default function MainLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="trip" />
      <Stack.Screen name="trip-form" />
    </Stack>
  );
}
