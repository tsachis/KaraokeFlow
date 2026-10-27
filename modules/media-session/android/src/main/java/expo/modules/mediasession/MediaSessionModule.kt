package expo.modules.mediasession

import android.content.Context
import android.content.Intent
import android.media.MediaMetadata
import android.media.session.MediaController
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.provider.Settings
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

private const val STATE_EVENT = "onStateChange"

class CarLineRecord : Record {
  @Field val timeMs: Double = 0.0
  @Field val text: String = ""
}

class CarLyricsRecord : Record {
  @Field val title: String = ""
  @Field val lines: List<CarLineRecord> = emptyList()
  @Field val message: String? = null
}

class MediaSessionModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  private val mainHandler = Handler(Looper.getMainLooper())
  private val sessionManager by lazy {
    context.getSystemService(Context.MEDIA_SESSION_SERVICE) as MediaSessionManager
  }
  private val listenerComponent by lazy { notificationListenerComponent(context) }

  private var controllers: List<MediaController> = emptyList()
  private var listening = false

  private val controllerCallback = object : MediaController.Callback() {
    override fun onPlaybackStateChanged(state: PlaybackState?) = emitState()
    override fun onMetadataChanged(metadata: MediaMetadata?) = emitState()
    override fun onSessionDestroyed() = emitState()
  }

  private val sessionsListener = MediaSessionManager.OnActiveSessionsChangedListener { list ->
    attachControllers(list ?: emptyList())
    emitState()
  }

  override fun definition() = ModuleDefinition {
    Name("MediaSession")

    Events(STATE_EVENT)

    Function("isPermissionGranted") { isPermissionGranted() }

    Function("openPermissionSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    Function("getCurrentState") { activeController()?.let(::toBundle) }

    // The car screen shows lyrics that JS looked up; see CarMediaService.
    Function("setCarLyrics") { lyrics: CarLyricsRecord? ->
      val value = lyrics?.let {
        CarLyrics(it.title, it.lines.map { line -> CarLine(line.timeMs.toLong(), line.text) }, it.message)
      }
      mainHandler.post { CarLyricsStore.setLyrics(value) }
    }

    OnCreate { mainHandler.post { CarLyricsStore.setAppRunning(true) } }

    OnStartObserving(STATE_EVENT) { mainHandler.post { startListening() } }

    OnStopObserving(STATE_EVENT) { mainHandler.post { stopListening() } }

    OnDestroy {
      mainHandler.post {
        stopListening()
        CarLyricsStore.setAppRunning(false)
      }
    }
  }

  private fun isPermissionGranted(): Boolean = isListenerEnabled(context)

  // Called again from JS after the user grants access, so it must be safe to repeat.
  private fun startListening() {
    if (listening || !isPermissionGranted()) return
    try {
      sessionManager.addOnActiveSessionsChangedListener(sessionsListener, listenerComponent, mainHandler)
      attachControllers(sessionManager.getActiveSessions(listenerComponent))
      listening = true
      emitState()
    } catch (e: SecurityException) {
      listening = false
    }
  }

  private fun stopListening() {
    if (!listening) return
    sessionManager.removeOnActiveSessionsChangedListener(sessionsListener)
    controllers.forEach { it.unregisterCallback(controllerCallback) }
    controllers = emptyList()
    listening = false
  }

  private fun attachControllers(next: List<MediaController>) {
    controllers.forEach { it.unregisterCallback(controllerCallback) }
    controllers = playerSessions(context, next)
    controllers.forEach { it.registerCallback(controllerCallback, mainHandler) }
  }

  private fun activeController(): MediaController? {
    return pickActive(if (listening) controllers else playerSessions(context, safeActiveSessions()))
  }

  private fun safeActiveSessions(): List<MediaController> =
    try {
      if (isPermissionGranted()) sessionManager.getActiveSessions(listenerComponent) else emptyList()
    } catch (e: SecurityException) {
      emptyList()
    }

  private fun emitState() {
    val bundle = activeController()?.let(::toBundle) ?: Bundle().apply { putBoolean("empty", true) }
    sendEvent(STATE_EVENT, bundle)
  }

  private fun toBundle(controller: MediaController): Bundle {
    val metadata = controller.metadata
    val playback = controller.playbackState
    val artist = artistOf(metadata)

    // lastPositionUpdateTime is on the elapsedRealtime clock; JS works in wall-clock ms.
    val updatedAt = playback?.let {
      System.currentTimeMillis() - (SystemClock.elapsedRealtime() - it.lastPositionUpdateTime)
    } ?: System.currentTimeMillis()

    return Bundle().apply {
      putString("packageName", controller.packageName)
      putString("title", metadata?.getString(MediaMetadata.METADATA_KEY_TITLE))
      putString("artist", artist)
      putString("album", metadata?.getString(MediaMetadata.METADATA_KEY_ALBUM))
      putDouble("durationMs", (metadata?.getLong(MediaMetadata.METADATA_KEY_DURATION) ?: 0L).toDouble())
      putDouble("positionMs", (playback?.position ?: 0L).toDouble())
      putDouble("positionUpdatedAt", updatedAt.toDouble())
      putDouble("playbackSpeed", (playback?.playbackSpeed ?: 1f).toDouble())
      putBoolean("isPlaying", playback?.state == PlaybackState.STATE_PLAYING)
    }
  }
}
