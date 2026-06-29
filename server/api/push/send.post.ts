import webPush from 'web-push'
import { createClient } from '@supabase/supabase-js'

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()

  webPush.setVapidDetails(
    config.vapidSubject,
    config.public.vapidPublicKey,
    config.vapidPrivateKey,
  )

  // 현재 KST 시간 계산 (UTC+9)
  const now = new Date()
  const kstHour = (now.getUTCHours() + 9) % 24
  const kstMinute = now.getUTCMinutes()
  const timeStr = `${String(kstHour).padStart(2, '0')}:${String(kstMinute).padStart(2, '0')}:00`

  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_KEY!,
  )

  // 현재 시각에 알림을 받을 유저 조회
  const { data: settings } = await supabase
    .from('user_settings')
    .select('user_id')
    .eq('notification_time', timeStr)

  if (!settings?.length) return { sent: 0 }

  const userIds = settings.map((s) => s.user_id)

  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('user_id', userIds)

  if (!subs?.length) return { sent: 0 }

  const payload = JSON.stringify({
    title: 're:read',
    body: '오늘의 읽기 목표를 달성해보세요! 📖',
  })

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ).catch(async (err) => {
        // 만료된 구독 삭제 (410 Gone)
        if (err.statusCode === 410) {
          await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
        }
        throw err
      })
    )
  )

  const sent = results.filter((r) => r.status === 'fulfilled').length
  return { sent, total: subs.length }
})
