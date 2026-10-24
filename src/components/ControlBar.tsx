import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { FlipAxis, Settings } from '../hooks/useSettings';

const OFFSET_STEP_MS = 250;
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
  const { mode, flipAxis, offsetMs } = settings;
  const offsetLabel = `${offsetMs > 0 ? '+' : ''}${(offsetMs / 1000).toFixed(2)}s`;

  return (
    <View style={styles.bar}>
      <ControlButton
        label={mode === 'hud' ? 'Mode: HUD' : 'Mode: DIRECT'}
        onPress={() => onChange({ mode: mode === 'hud' ? 'direct' : 'hud' })}
      />
      {mode === 'hud' ? (
        <ControlButton label={`Mirror: ${flipAxis}`} onPress={() => onChange({ flipAxis: NEXT_FLIP[flipAxis] })} />
      ) : null}
      <ControlButton label="Later" onPress={() => onChange({ offsetMs: offsetMs - OFFSET_STEP_MS })} />
      <Pressable onLongPress={() => onChange({ offsetMs: 0 })}>
        <Text style={styles.offset}>Sync {offsetLabel}</Text>
      </Pressable>
      <ControlButton label="Earlier" onPress={() => onChange({ offsetMs: offsetMs + OFFSET_STEP_MS })} />
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
  offset: {
    color: '#888888',
    fontSize: 14,
    minWidth: 90,
    textAlign: 'center',
  },
});
