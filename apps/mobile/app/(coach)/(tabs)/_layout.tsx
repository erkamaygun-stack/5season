import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LiquidGlassTabBar } from '../../../lib/LiquidGlassTabBar';

export default function CoachTabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <LiquidGlassTabBar {...props} activeColor="#1d4ed8" />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen
        name="gecmis"
        options={{
          title: 'Geçmiş',
          tabBarIcon: ({ color }) => <Ionicons name="time-outline" color={color} size={23} />,
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
