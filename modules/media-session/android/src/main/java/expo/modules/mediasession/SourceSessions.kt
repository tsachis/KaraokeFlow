package expo.modules.mediasession

import android.content.ComponentName
import android.content.Context
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.PlaybackState
import android.os.SystemClock
import android.provider.Settings

fun notificationListenerComponent(context: Context) = ComponentName(context, MediaListenerService::class.java)

fun isListenerEnabled(context: Context): Boolean {
  val enabled = Settings.Secure.getString(context.contentResolver, "enabled_notification_listeners")
    ?: return false
  val component = notificationListenerComponent(context)
  return enabled.split(":").any { ComponentName.unflattenFromString(it) == component }
}

/** The other apps' sessions. Our own car session is in the list too and must never be read back. */
fun playerSessions(context: Context, sessions: List<MediaController>): List<MediaController> =
  sessions.filter { it.packageName != context.packageName }

/** The player the user is listening to: the one playing, else the last one with a track. */
fun pickActive(sessions: List<MediaController>): MediaController? =
  sessions.firstOrNull { it.playbackState?.state == PlaybackState.STATE_PLAYING }
    ?: sessions.firstOrNull { it.metadata != null }

fun artistOf(metadata: MediaMetadata?): String? =
  metadata?.getString(MediaMetadata.METADATA_KEY_ARTIST)
    ?: metadata?.getString(MediaMetadata.METADATA_KEY_ALBUM_ARTIST)
    ?: metadata?.getString(MediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE)

/** Players only report position on play, pause and seek, so extrapolate from the last report. */
fun estimatePositionMs(playback: PlaybackState?): Long {
  playback ?: return 0
  if (playback.state != PlaybackState.STATE_PLAYING) return playback.position
  val elapsed = SystemClock.elapsedRealtime() - playback.lastPositionUpdateTime
  return (playback.position + elapsed * (playback.playbackSpeed.takeIf { it > 0f } ?: 1f)).toLong()
}
