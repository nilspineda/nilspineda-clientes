import { useEffect, useRef } from 'react'
import { useAuth } from './useAuth'
import pb from '@/lib/pocketbaseClient'
import { subscribeToPush, subscriptionToJSON } from '@/lib/pushNotifications'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY
const COLLECTION = 'push_notifications'

async function saveSubscription(subscriptionJSON, userId) {
  try {
    const existing = await pb.collection(COLLECTION).getFullList({
      filter: `endpoint = "${subscriptionJSON.endpoint}"`,
      requestKey: null,
    })
    if (existing.length > 0) {
      await pb.collection(COLLECTION).update(existing[0].id, {
        user_id: userId,
        keys_p256dh: subscriptionJSON.keys.p256dh,
        keys_auth: subscriptionJSON.keys.auth,
      })
    } else {
      await pb.collection(COLLECTION).create({
        user_id: userId,
        endpoint: subscriptionJSON.endpoint,
        keys_p256dh: subscriptionJSON.keys.p256dh,
        keys_auth: subscriptionJSON.keys.auth,
      })
    }
  } catch (err) {
    console.error('Error saving push subscription:', err)
  }
}

async function removeSubscription(endpoint) {
  try {
    const existing = await pb.collection(COLLECTION).getFullList({
      filter: `endpoint = "${endpoint}"`,
      requestKey: null,
    })
    for (const sub of existing) {
      await pb.collection(COLLECTION).delete(sub.id)
    }
  } catch (err) {
    console.error('Error removing push subscription:', err)
  }
}

export function usePushNotifications() {
  const { isAdmin } = useAuth()
  const subscribedRef = useRef(false)

  useEffect(() => {
    if (!isAdmin) return
    if (!VAPID_PUBLIC_KEY) {
      console.warn('VITE_VAPID_PUBLIC_KEY not set, skipping push')
      return
    }
    if (subscribedRef.current) return

    let cancelled = false

    const delay = (ms) => new Promise((r) => setTimeout(r, ms))

    // FCM (Chrome Android) a menudo falla el primer intento con
    // "Registration failed - push service error". Reintentamos con esperas.
    async function subscribeWithRetry(reg, attempts = 3) {
      for (let i = 0; i < attempts; i++) {
        if (cancelled) return null
        const sub = await subscribeToPush(reg, VAPID_PUBLIC_KEY)
        if (sub) return sub
        await delay(2500 * (i + 1))
      }
      return null
    }

    async function init() {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return

      try {
        const reg = await navigator.serviceWorker.ready

        if (cancelled) return

        if (Notification.permission === 'denied') return
        if (Notification.permission === 'default') {
          const result = await Notification.requestPermission()
          if (result !== 'granted') return
        }

        const existingSub = await reg.pushManager.getSubscription()
        if (existingSub) {
          const subJSON = subscriptionToJSON(existingSub)
          if (subJSON) {
            await saveSubscription(subJSON, pb.authStore.model?.id)
            subscribedRef.current = true
          }
          return
        }

        const newSub = await subscribeWithRetry(reg)
        if (newSub && !cancelled) {
          const subJSON = subscriptionToJSON(newSub)
          await saveSubscription(subJSON, pb.authStore.model?.id)
          subscribedRef.current = true
        }
      } catch (err) {
        console.warn('Push subscription failed:', err?.message || err)
        console.warn('Push notifications require HTTPS. If testing locally, the app must be deployed to Vercel or accessed via localhost.')
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [isAdmin])
}