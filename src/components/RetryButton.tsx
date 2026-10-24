import { Pressable, StyleSheet, Text } from 'react-native';

interface RetryButtonProps {
  onPress: () => void;
}

export function RetryButton({ onPress }: RetryButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      hitSlop={12}
    >
      <Text style={styles.text}>Retry</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 24,
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 28,
  },
  buttonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  text: {
    color: '#DDDDDD',
    fontSize: 18,
    fontWeight: '600',
  },
});
