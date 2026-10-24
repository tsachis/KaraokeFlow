import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { MediaSession, type MediaState } from '../../modules/media-session';

export interface MediaSessionInfo {
  /** False on platforms without the native module (iOS, web, Expo Go). */
  available: boolean;
  permissionGranted: boolean;
  state: MediaState | null;
  openPermissionSettings: () => void;
}

export function useMediaSession(): MediaSessionInfo {
  const [permissionGranted, setPermissionGranted] = useState(() => MediaSession?.isPermissionGranted() ?? false);
  const [state, setState] = useState<MediaState | null>(null);

  // The user grants access in system settings, so re-check every time we come back.
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') setPermissionGranted(MediaSession?.isPermissionGranted() ?? false);
    });
    return () => subscription.remove();
  }, []);

  // Re-subscribing after permission flips restarts native listening, which bails out without access.
  useEffect(() => {
    if (!MediaSession || !permissionGranted) return;
    setState(MediaSession.getCurrentState());
    const subscription = MediaSession.addListener('onStateChange', (event) => {
      setState('empty' in event ? null : event);
    });
    return () => subscription.remove();
  }, [permissionGranted]);

  const openPermissionSettings = useCallback(() => MediaSession?.openPermissionSettings(), []);

  return { available: MediaSession != null, permissionGranted, state, openPermissionSettings };
}
