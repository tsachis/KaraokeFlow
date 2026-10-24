package expo.modules.mediasession

import android.service.notification.NotificationListenerService

// Empty on purpose: Android only hands active media sessions to apps that own
// an enabled notification listener. We read sessions, not notifications.
class MediaListenerService : NotificationListenerService()
