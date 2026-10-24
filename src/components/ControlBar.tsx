import { Pressable, StyleSheet, Text, View } from 'react-native';

import { TEXT_SCALE, type FlipAxis, type Settings } from '../hooks/useSettings';

const NEXT_FLIP: Record<FlipAxis, FlipAxis> = { vertical: 'horizontal', horizontal: 'both', both: 'vertical' };

interface ControlBarProps {
  settings: Settings;
  onChange: (patch: Partial<Settings>) => void;
}

interface ControlButtonProps {
  label: string;
  onPress: () => void;
}

function ControlButton({ label, onPress }: ControlButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      hitSlop={8}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

export function ControlBar({ settings, onChange }: ControlBarProps) {
  const { mode, flipAxis, textScale } = settings;
  // Rounded so repeated 0.1 steps don't drift into 1.0000000002.
  const zoom = (delta: number) => {
    const next = Math.round((textScale + delta) * 10) / 10;
    onChange({ textScale: Math.min(TEXT_SCALE.max, Math.max(TEXT_SCALE.min, next)) });
  };

  return (
    <View style={styles.bar}>
      <ControlButton
        label={mode === 'hud' ? 'Mode: HUD' : 'Mode: DIRECT'}
        onPress={() => onChange({ mode: mode === 'hud' ? 'direct' : 'hud' })}
      />
      {mode === 'hud' ? (
        <ControlButton label={`Mirror: ${flipAxis}`} onPress={() => onChange({ flipAxis: NEXT_FLIP[flipAxis] })} />
      ) : null}
      <ControlButton label="−" onPress={() => zoom(-TEXT_SCALE.step)} />
      <Pressable onLongPress={() => onChange({ textScale: TEXT_SCALE.default })}>
        <Text style={styles.zoomLabel}>Text {Math.round(textScale * 100)}%</Text>
      </Pressable>
      <ControlButton label="+" onPress={() => zoom(TEXT_SCALE.step)} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    top: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    zIndex: 10,
  },
  button: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
  },
  buttonPressed: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  buttonText: {
    color: '#AAAAAA',
    fontSize: 16,
    fontWeight: '600',
  },
  zoomLabel: {
    color: '#888888',
    fontSize: 14,
    minWidth: 90,
    textAlign: 'center',
  },
});
