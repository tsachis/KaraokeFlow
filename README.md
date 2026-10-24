# KaraokeFlow

Real-time, time-synced song lyrics for a phone in your car. Made for an old Android phone on the dashboard.

- **HUD mode** — the phone lies flat under the windshield. The text is mirrored so its reflection reads correctly.
- **Direct mode** — the phone sits in a normal dash or vent mount.
- Works with **Spotify, YouTube Music** and any player that has a media session.
- Lyrics from [LRCLIB](https://lrclib.net) (free, community-made). **Hebrew / RTL** lines are shown in the right direction.

> ⚠️ Keep your eyes on the road. Use this at your own risk, and follow local laws about screens in the car.

## How it works

| Part | Where | What it does |
|---|---|---|
| Media session module | `modules/media-session` (Kotlin) | Reads title, artist, duration, position and play state from the active player through `MediaSessionManager`. Android only gives this to apps with **notification access**. |
| Playback clock | `src/lib/playbackClock.ts` | Players only report position on play / pause / seek. The app estimates the position from the last report and updates 10× per second. |
| Lyrics lookup | `src/lib/lrclib.ts` | Exact match by title + artist + duration first, then searches with a cleaned title ("- Remastered", "feat. X" removed). Results are cached on the device. |
| LRC parser | `src/lib/lrc.ts` | Supports `[mm:ss.xx]`, several tags on one line, and `[offset:]`. |
| RTL | `src/lib/textDirection.ts` | Each line gets a direction mark based on its main script. Android ignores `writingDirection`, so the mark does the work. The app layout itself stays LTR. |

## Using the app

1. Open the app and tap **Open settings**. Turn on notification access for KaraokeFlow.
2. Play music in Spotify, YouTube Music, or another player.
3. Tap the screen to show the controls (they hide after 6 seconds):

| Control | What it does |
|---|---|
| **Mode** | Switches between HUD and DIRECT. |
| **Mirror** (HUD only) | `vertical` / `horizontal` / `both`. Use `vertical` when the top of the phone points at the windshield. Try the others if the reflection reads wrong. |
| **Later / Earlier** | Moves the lyrics by 0.25 s if they're out of sync. Long-press the value to reset it. |

The screen stays on, and the app locks to landscape.

## Development

You need Node 20+. Expo Go **can't** run this app because it has a custom native module. Use a development build instead.

```bash
npm install
npm test           # unit tests
npm run typecheck
```

### Build an APK with EAS (no Android SDK needed)

```bash
npx eas-cli login
npx eas-cli build:configure       # first time only: links the project to your Expo account
npm run build:dev                 # dev client APK; then run `npm start` and open it on the phone
npm run build:apk                 # standalone APK to install on the car phone
```

### Build locally

You need JDK 17 and the Android SDK. Then run `npm run android` with the phone connected over USB.

## Hardware tips

- Use an **OLED** phone. Pure black pixels are off, so only the lyrics reflect in the windshield.
- HUD: put the phone on an anti-slip dash mat at the bottom of the windshield. It works best at night.
- Use a strong USB-C car charger, and connect the phone to the car by Bluetooth or AUX.

## License

MIT
