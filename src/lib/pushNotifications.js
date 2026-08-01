export function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function subscribeToPush(swRegistration, vapidPublicKey) {
  const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey)
  try {
    return await swRegistration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey,
    })
  } catch (err) {
    console.error('Failed to subscribe to push:', err)
    if (err.name === 'AbortError' || err.name === 'InvalidStateError') {
      try {
        const stale = await swRegistration.pushManager.getSubscription()
        if (stale) await stale.unsubscribe()
        return await swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey,
        })
      } catch (retryErr) {
        console.error('Failed to resubscribe to push:', retryErr)
        return null
      }
    }
    return null
  }
}

export async function unsubscribeFromPush(swRegistration) {
  try {
    const subscription = await swRegistration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
      return true
    }
    return false
  } catch (err) {
    console.error('Failed to unsubscribe from push:', err)
    return false
  }
}

export function subscriptionToJSON(subscription) {
  if (!subscription) return null
  return {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.toJSON().keys.p256dh,
      auth: subscription.toJSON().keys.auth,
    },
  }
}