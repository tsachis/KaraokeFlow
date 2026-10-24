import { Pressable, StyleSheet, Text, View } from 'react-native';

interface PermissionScreenProps {
  available: boolean;
  onOpenSettings: () => void;
}

export function PermissionScreen({ available, onOpenSettings }: PermissionScreenProps) {
  if (!available) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Android only</Text>
        <Text style={styles.body}>
          KaraokeFlow reads the music player through a native Android module. Run it from a development or release
          build on Android (Expo Go is not supported).
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Allow notification access</Text>
      <Text style={styles.body}>
        KaraokeFlow needs notification access to see which song is playing in Spotify, YouTube Music or any other
        player, and how far into the song it is. It does not read your other notifications.
      </Text>
      <Pressable style={styles.button} onPress={onOpenSettings}>
        <Text style={styles.buttonText}>Open settings</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
    gap: 20,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  body: {
    color: '#AAAAAA',
    fontSize: 18,
    textAlign: 'center',
    maxWidth: 640,
  },
  button: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
  },
  buttonText: {
    color: '#000000',
    fontSize: 18,
    fontWeight: '600',
  },
});
