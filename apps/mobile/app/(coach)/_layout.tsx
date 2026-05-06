import { Tabs } from 'expo-router';

export default function CoachLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1d4ed8',
        headerShown: false,
      }}
    >
      <Tabs.Screen name="yoklama" options={{ title: 'Yoklama' }} />
      <Tabs.Screen name="gecmis" options={{ title: 'Geçmiş' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
