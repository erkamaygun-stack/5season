import { Tabs } from 'expo-router';

export default function ParentLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#16a34a',
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Anasayfa' }} />
      <Tabs.Screen name="bildirimler" options={{ title: 'Bildirimler' }} />
      <Tabs.Screen name="profil" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
