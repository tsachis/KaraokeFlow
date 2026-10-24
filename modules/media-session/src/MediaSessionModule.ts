import { NativeModule, requireOptionalNativeModule } from 'expo';

import type { MediaSessionEvents, MediaState } from './MediaSession.types';

declare class MediaSessionNativeModule extends NativeModule<MediaSessionEvents> {
  isPermissionGranted(): boolean;
  openPermissionSettings(): void;
  getCurrentState(): MediaState | null;
}

// Optional so the JS bundle still loads where the module is missing (iOS, web, Jest).
export const MediaSession = requireOptionalNativeModule<MediaSessionNativeModule>('MediaSession');
