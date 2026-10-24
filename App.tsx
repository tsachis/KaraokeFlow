import { useKeepAwake } from 'expo-keep-awake';
import { NavigationBar } from 'expo-navigation-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ControlBar } from './src/components/ControlBar';
import { LyricsDisplay } from './src/components/LyricsDisplay';
import { PermissionScreen } from './src/components/PermissionScreen';
import { useLyrics } from './src/hooks/useLyrics';
import { useMediaSession } from './src/hooks/useMediaSession';
import { usePlaybackTime } from './src/hooks/usePlaybackTime';
import { useSettings, type Settings } from './src/hooks/useSettings';
import type { TrackQuery } from './src/lib/trackQuery';

const CONTROLS_VISIBLE_MS = 6000;

export function App() {
  useKeepAwake();
  const [settings, updateSettings] = useSettings();
  const media = useMediaSession();
  const { state } = media;

  const track = useMemo<TrackQuery | null>(() => {
    if (!state?.title) return null;
    return {
      title: state.title,
      artist: state.artist ?? '',
      album: state.album ?? undefined,
      durationSec: state.durationMs > 0 ? state.durationMs / 1000 : undefined,
    };
  }, [state?.title, state?.artist, state?.album, state?.durationMs]);

  const lyrics = useLyrics(track);
  const positionSec = usePlaybackTime(state);

  // Lying flat on the dash the accelerometer is unreliable, so HUD pins one landscape side.
  useEffect(() => {
    const lock =
      settings.mode === 'hud'
        ? ScreenOrientation.OrientationLock.LANDSCAPE_LEFT
        : ScreenOrientation.OrientationLock.LANDSCAPE;
    ScreenOrientation.lockAsync(lock).catch(() => undefined);
  }, [settings.mode]);

  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), CONTROLS_VISIBLE_MS);
  }, []);

  useEffect(() => {
    showControls();
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [showControls]);

  const changeSettings = useCallback(
    (patch: Partial<Settings>) => {
      updateSettings(patch);
      showControls();
    },
    [updateSettings, showControls],
  );

  const needsPermission = !media.available || !media.permissionGranted;

  return (
    <View style={styles.root}>
      <StatusBar hidden style="light" />
      <NavigationBar hidden style="light" />
      {needsPermission ? (
        <PermissionScreen available={media.available} onOpenSettings={media.openPermissionSettings} />
      ) : (
        <Pressable style={styles.root} onPress={showControls}>
          {controlsVisible ? <ControlBar settings={settings} onChange={changeSettings} /> : null}
          <LyricsDisplay
            title={state?.title ?? ''}
            artist={state?.artist ?? ''}
            lyrics={lyrics}
            positionSec={positionSec}
            mode={settings.mode}
            flipAxis={settings.flipAxis}
            textScale={settings.textScale}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    // Pure black turns OLED pixels off, so nothing but the lyrics reflects in the windshield.
    backgroundColor: '#000000',
  },
});
