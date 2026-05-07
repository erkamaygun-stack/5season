import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LiquidGlassTabBar } from '../../../lib/LiquidGlassTabBar';

export default function ParentTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <LiquidGlassTabBar {...props} activeColor="#2563eb" />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="bildirimler"
        options={{
          title: 'Bildirimler',
          tabBarIcon: ({ color }) => <Ionicons name="notifications-outline" color={color} size={23} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          title: 'Anasayfa',
          tabBarIcon: ({ color }) => <Ionicons name="home-outline" color={color} size={23} />,
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color }) => <Ionicons name="person-outline" color={color} size={23} />,
        }}
      />
    </Tabs>
  );
}
