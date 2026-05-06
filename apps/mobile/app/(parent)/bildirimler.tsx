import { View, Text, StyleSheet } from 'react-native';

export default function ParentNotificationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Bildirimler</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  text: { fontSize: 20, color: '#374151' },
});
