import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

export type DisplayMode = 'hud' | 'direct';
/** Which axis the HUD mirror flips; depends on how the phone lies under the windshield. */
export type FlipAxis = 'vertical' | 'horizontal' | 'both';

export interface Settings {
  mode: DisplayMode;
  flipAxis: FlipAxis;
  /** Positive shows lyrics earlier. */
  offsetMs: number;
}

const STORAGE_KEY = 'settings:v1';
const DEFAULT_SETTINGS: Settings = { mode: 'hud', flipAxis: 'vertical', offsetMs: 0 };

export function useSettings(): [Settings, (patch: Partial<Settings>) => void] {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);

  useEffect(() => {
    const load = async (): Promise<void> => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setSettings({ ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) });
      } catch {
        // Fall back to defaults.
      }
    };
    void load();
  }, []);

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)).catch(() => undefined);
      return next;
    });
  }, []);

  return [settings, update];
}
