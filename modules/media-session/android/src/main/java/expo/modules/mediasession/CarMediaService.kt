package expo.modules.mediasession

import android.media.MediaDescription
import android.media.MediaMetadata
import android.media.browse.MediaBrowser
import android.media.session.MediaController
import android.media.session.MediaSession
import android.media.session.MediaSessionManager
import android.media.session.PlaybackState
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.service.media.MediaBrowserService

private const val ROOT_ID = "root"
private const val NOW_PLAYING_ID = "now-playing"
private const val MUSIC_NOTE = "♪"
// Re-check at least this often, so a missed position report can't freeze the line.
private const val MAX_TICK_MS = 1000L
private const val MIN_TICK_MS = 50L

private const val ACTIONS = PlaybackState.ACTION_PLAY or PlaybackState.ACTION_PAUSE or
  PlaybackState.ACTION_PLAY_PAUSE or PlaybackState.ACTION_SKIP_TO_NEXT or
  PlaybackState.ACTION_SKIP_TO_PREVIOUS or PlaybackState.ACTION_SEEK_TO or
  PlaybackState.ACTION_PLAY_FROM_MEDIA_ID

private val COPIED_ART_KEYS = listOf(
  MediaMetadata.METADATA_KEY_ALBUM_ART,
  MediaMetadata.METADATA_KEY_ART,
  MediaMetadata.METADATA_KEY_DISPLAY_ICON,
)
private val COPIED_ART_URI_KEYS = listOf(
  MediaMetadata.METADATA_KEY_ALBUM_ART_URI,
  MediaMetadata.METADATA_KEY_ART_URI,
  MediaMetadata.METADATA_KEY_DISPLAY_ICON_URI,
)

/**
 * Android Auto only shows template UIs, so lyrics reach the car screen as a media app:
 * this session mirrors the real player (Spotify, YouTube Music, ...) with the current
 * lyric line as the title and the next line as the subtitle, and forwards the car's
 * play/pause/skip/seek to that player.
 */
class CarMediaService : MediaBrowserService() {
  private val handler = Handler(Looper.getMainLooper())
  private val sessionManager by lazy { getSystemService(MEDIA_SESSION_SERVICE) as MediaSessionManager }
  private lateinit var session: MediaSession

  private var players: List<MediaController> = emptyList()
  private var player: MediaController? = null
  private var watching = false
  private var shown: Pair<String, String>? = null

  private val playerCallback = object : MediaController.Callback() {
    override fun onPlaybackStateChanged(state: PlaybackState?) = refresh()
    override fun onMetadataChanged(metadata: MediaMetadata?) = refresh()
    override fun onSessionDestroyed() = refresh()
  }

  private val sessionsListener = MediaSessionManager.OnActiveSessionsChangedListener { list ->
    attachPlayers(list.orEmpty())
    refresh()
  }

  private val lyricsListener: () -> Unit = { refresh() }

  private val tick = Runnable { updateMetadata() }

  override fun onCreate() {
    super.onCreate()
    session = MediaSession(this, "KaraokeFlow").apply {
      setCallback(ForwardToPlayer(), handler)
      isActive = true
    }
    sessionToken = session.sessionToken
    CarLyricsStore.addListener(lyricsListener)
    refresh()
  }

  override fun onDestroy() {
    handler.removeCallbacks(tick)
    CarLyricsStore.removeListener(lyricsListener)
    if (watching) sessionManager.removeOnActiveSessionsChangedListener(sessionsListener)
    attachPlayers(emptyList())
    session.release()
    super.onDestroy()
  }

  override fun onGetRoot(clientPackageName: String, clientUid: Int, rootHints: Bundle?): MediaBrowserService.BrowserRoot {
    // The user may have granted access since onCreate.
    refresh()
    return MediaBrowserService.BrowserRoot(ROOT_ID, null)
  }

  override fun onLoadChildren(parentId: String, result: MediaBrowserService.Result<MutableList<MediaBrowser.MediaItem>>) {
    if (parentId != ROOT_ID) return result.sendResult(mutableListOf())
    val description = MediaDescription.Builder()
      .setMediaId(NOW_PLAYING_ID)
      .setTitle("Now playing")
      .setSubtitle("Lyrics for the music on your phone")
      .build()
    result.sendResult(mutableListOf(MediaBrowser.MediaItem(description, MediaBrowser.MediaItem.FLAG_PLAYABLE)))
  }

  private inner class ForwardToPlayer : MediaSession.Callback() {
    private val controls get() = player?.transportControls

    override fun onPlay() { controls?.play() }
    override fun onPlayFromMediaId(mediaId: String?, extras: Bundle?) { controls?.play() }
    override fun onPause() { controls?.pause() }
    override fun onStop() { controls?.pause() }
    override fun onSkipToNext() { controls?.skipToNext() }
    override fun onSkipToPrevious() { controls?.skipToPrevious() }
    override fun onSeekTo(pos: Long) { controls?.seekTo(pos) }
  }

  private fun startWatching() {
    if (watching || !isListenerEnabled(this)) return
    try {
      val component = notificationListenerComponent(this)
      sessionManager.addOnActiveSessionsChangedListener(sessionsListener, component, handler)
      attachPlayers(sessionManager.getActiveSessions(component))
      watching = true
    } catch (e: SecurityException) {
      watching = false
    }
  }

  private fun attachPlayers(sessions: List<MediaController>) {
    players.forEach { it.unregisterCallback(playerCallback) }
    players = playerSessions(this, sessions)
    players.forEach { it.registerCallback(playerCallback, handler) }
  }

  private fun refresh() {
    startWatching()
    player = pickActive(players)
    val playback = player?.playbackState
    val state = PlaybackState.Builder().setActions(ACTIONS)
    if (playback == null) {
      state.setState(PlaybackState.STATE_NONE, 0, 1f)
    } else {
      state.setState(playback.state, playback.position, playback.playbackSpeed, playback.lastPositionUpdateTime)
    }
    session.setPlaybackState(state.build())
    shown = null
    updateMetadata()
  }

  private fun updateMetadata() {
    handler.removeCallbacks(tick)
    val metadata = player?.metadata
    val playback = player?.playbackState
    val positionMs = estimatePositionMs(playback)
    val lines = CarLyricsStore.lyrics
      ?.takeIf { it.title == metadata?.getString(MediaMetadata.METADATA_KEY_TITLE) }
      ?.lines.orEmpty()
    val index = activeIndex(lines, positionMs)

    val text = displayText(metadata, lines, index)
    if (text != shown) {
      session.setMetadata(buildMetadata(text, metadata))
      shown = text
    }

    if (playback?.state == PlaybackState.STATE_PLAYING && lines.isNotEmpty()) {
      val nextTime = lines.getOrNull(index + 1)?.timeMs
      val wait = if (nextTime == null) MAX_TICK_MS else (nextTime - positionMs).coerceIn(MIN_TICK_MS, MAX_TICK_MS)
      handler.postDelayed(tick, wait)
    }
  }

  /** Title and subtitle for the car screen. */
  private fun displayText(metadata: MediaMetadata?, lines: List<CarLine>, index: Int): Pair<String, String> {
    val title = metadata?.getString(MediaMetadata.METADATA_KEY_TITLE)
    if (title == null) {
      val hint = if (watching) "Play music to see lyrics" else "Open KaraokeFlow on your phone to allow access"
      return "KaraokeFlow" to hint
    }
    val song = listOfNotNull(title, artistOf(metadata)).joinToString(" — ")
    if (lines.isEmpty()) {
      val lyrics = CarLyricsStore.lyrics
      val message = when {
        !CarLyricsStore.appRunning -> "Open KaraokeFlow on your phone to load lyrics"
        lyrics != null && lyrics.title == title -> lyrics.message ?: ""
        else -> "Finding lyrics..."
      }
      return song to message
    }
    val current = if (index < 0) MUSIC_NOTE else lines[index].text.ifEmpty { MUSIC_NOTE }
    val next = lines.getOrNull(index + 1)?.text?.ifEmpty { MUSIC_NOTE } ?: song
    return current to next
  }

  private fun buildMetadata(text: Pair<String, String>, source: MediaMetadata?): MediaMetadata {
    val builder = MediaMetadata.Builder()
      .putString(MediaMetadata.METADATA_KEY_MEDIA_ID, NOW_PLAYING_ID)
      .putString(MediaMetadata.METADATA_KEY_TITLE, text.first)
      .putString(MediaMetadata.METADATA_KEY_DISPLAY_TITLE, text.first)
      .putString(MediaMetadata.METADATA_KEY_ARTIST, text.second)
      .putString(MediaMetadata.METADATA_KEY_DISPLAY_SUBTITLE, text.second)
    if (source != null) {
      source.getString(MediaMetadata.METADATA_KEY_TITLE)?.let {
        val song = listOfNotNull(it, artistOf(source)).joinToString(" — ")
        builder.putString(MediaMetadata.METADATA_KEY_ALBUM, song)
      }
      builder.putLong(MediaMetadata.METADATA_KEY_DURATION, source.getLong(MediaMetadata.METADATA_KEY_DURATION))
      COPIED_ART_KEYS.forEach { key -> source.getBitmap(key)?.let { builder.putBitmap(key, it) } }
      COPIED_ART_URI_KEYS.forEach { key -> source.getString(key)?.let { builder.putString(key, it) } }
    }
    return builder.build()
  }
}

/** Index of the line playing at `positionMs`, or -1 before the first line. Same as findActiveIndex in src/lib/lrc.ts. */
private fun activeIndex(lines: List<CarLine>, positionMs: Long): Int {
  var low = 0
  var high = lines.size - 1
  var found = -1
  while (low <= high) {
    val mid = (low + high) ushr 1
    if (lines[mid].timeMs <= positionMs) {
      found = mid
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return found
}
