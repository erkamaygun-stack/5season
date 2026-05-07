import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

type Props = BottomTabBarProps & { activeColor: string };

export function LiquidGlassTabBar({ state, descriptors, navigation, activeColor }: Props) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom + 10, 28);

  return (
    <View style={[styles.wrapper, { bottom }]}>
      <View style={styles.bar}>
        <View style={styles.topShine} />
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const focused = state.index === index;
            const color = focused ? activeColor : '#9ca3af';
            const label = options.title ?? route.name;

            function onPress() {
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              } as Parameters<typeof navigation.emit>[0]);
              if (!focused && !event.defaultPrevented) navigation.navigate(route.name, {});
            }

            return (
              <TouchableOpacity key={route.key} style={styles.tab} onPress={onPress} activeOpacity={0.65}>
                {focused && <View style={[styles.activePill, { backgroundColor: activeColor + '20' }]} />}
                {options.tabBarIcon?.({ focused, color, size: 23 })}
                <Text style={[styles.label, { color }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 20,
    right: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 16,
  },
  bar: {
    backgroundColor: '#ffffff',
    borderRadius: 28,
    overflow: 'hidden',
  },
  topShine: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  row: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 6,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    gap: 3,
  },
  activePill: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    left: 4,
    right: 4,
    borderRadius: 18,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
});
