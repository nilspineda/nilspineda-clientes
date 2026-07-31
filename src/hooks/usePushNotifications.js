import { useEffect, useRef } from 'react'
import { useAuth } from './useAuth'
import pb from '@/lib/pocketbaseClient'
import { subscribeToPush, unsubscribeFromPush, subscriptionToJSON } from '@/lib/pushNotifications'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY
const COLLECTION = 'push notifications'

async function getRegistration() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) return null
  const regs = await navigator.serviceWorker.getRegistrations()
  return regs.find((r) => r.active?.scriptURL?.includes('sw.js')) || null
}

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

    async function init() {
      if (!('Notification' in window)) return
      if (Notification.permission === 'denied') return

      if (Notification.permission === 'default') {
        const result = await Notification.requestPermission()
        if (result !== 'granted') return
      }

      const reg = await getRegistration()
      if (!reg || cancelled) return

      const existingSub = await reg.pushManager.getSubscription()
      if (existingSub) {
        const subJSON = subscriptionToJSON(existingSub)
        if (subJSON) {
          await saveSubscription(subJSON, pb.authStore.model?.id)
          subscribedRef.current = true

          existingSub.addEventListener('pushsubscriptionchange', async () => {
            const newSub = await reg.pushManager.getSubscription()
            if (newSub) {
              await saveSubscription(subscriptionToJSON(newSub), pb.authStore.model?.id)
            } else {
              await removeSubscription(existingSub.endpoint)
              subscribedRef.current = false
            }
          })
        }
        return
      }

      const newSub = await subscribeToPush(reg, VAPID_PUBLIC_KEY)
      if (newSub && !cancelled) {
        const subJSON = subscriptionToJSON(newSub)
        await saveSubscription(subJSON, pb.authStore.model?.id)
        subscribedRef.current = true
      }
    }

    init()

    return () => {
      cancelled = true
    }
  }, [isAdmin])
}