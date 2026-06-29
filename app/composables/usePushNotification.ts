export function usePushNotification() {
  const supabase = useSupabaseClient()
  const user = useSupabaseUser()
  const config = useRuntimeConfig()

  const supported = computed(
    () => import.meta.client && 'serviceWorker' in navigator && 'PushManager' in window,
  )
  const permission = ref<NotificationPermission>('default')
  const subscribed = ref(false)
  const loading = ref(false)

  async function checkStatus() {
    if (!import.meta.client || !supported.value) return
    permission.value = Notification.permission
    if (permission.value === 'granted' && user.value) {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      subscribed.value = !!sub
    } else {
      subscribed.value = false
    }
  }

  function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4)
    const raw = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
    return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)))
  }

  async function subscribe() {
    if (!supported.value || !user.value) return
    loading.value = true
    try {
      const perm = await Notification.requestPermission()
      permission.value = perm
      if (perm !== 'granted') return

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(config.public.vapidPublicKey as string),
      } as PushSubscriptionOptionsInit)

      const json = sub.toJSON()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from('push_subscriptions').upsert(
        {
          user_id: user.value.id,
          endpoint: json.endpoint!,
          p256dh: json.keys?.p256dh ?? null,
          auth: json.keys?.auth ?? null,
        },
        { onConflict: 'user_id,endpoint' },
      )

      subscribed.value = true
    } finally {
      loading.value = false
    }
  }

  async function unsubscribe() {
    if (!supported.value || !user.value) return
    loading.value = true
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint)
          .eq('user_id', user.value.id)
        await sub.unsubscribe()
      }
      subscribed.value = false
    } finally {
      loading.value = false
    }
  }

  return { supported, permission, subscribed, loading, checkStatus, subscribe, unsubscribe }
}
