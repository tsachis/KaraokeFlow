package expo.modules.mediasession

/** One synced lyric line; `timeMs` is from the start of the track, `text` is empty for a gap. */
data class CarLine(val timeMs: Long, val text: String)

/** What JS found for one track. `message` is shown when there are no synced lines. */
data class CarLyrics(val title: String, val lines: List<CarLine>, val message: String?)

/**
 * Hands lyrics from JS to [CarMediaService]. Lookup, cache and matching stay in JS;
 * the service only does the timing, because JS timers stop while the app is in the background.
 * Touch only on the main thread.
 */
object CarLyricsStore {
  var lyrics: CarLyrics? = null
    private set

  /** False when Android Auto started the process without the app UI, so nothing will load lyrics. */
  var appRunning = false
    private set

  private val listeners = mutableSetOf<() -> Unit>()

  fun setLyrics(value: CarLyrics?) {
    lyrics = value
    notifyListeners()
  }

  fun setAppRunning(value: Boolean) {
    appRunning = value
    if (!value) lyrics = null
    notifyListeners()
  }

  fun addListener(listener: () -> Unit) = listeners.add(listener)

  fun removeListener(listener: () -> Unit) = listeners.remove(listener)

  private fun notifyListeners() = listeners.toList().forEach { it() }
}
