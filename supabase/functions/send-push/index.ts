import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT')!

// ── VAPID JWT (ES256) ──────────────────────────────────────────────────────
function base64urlEncode(data: Uint8Array | string): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str + '='.repeat((4 - (str.length % 4)) % 4)
  const bin = atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(bin, (c) => c.charCodeAt(0))
}

// raw 32바이트 P-256 private key → PKCS8 DER
function rawKeyToPkcs8(raw: Uint8Array): ArrayBuffer {
  const prefix = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13,
    0x06, 0x07, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x02, 0x01,
    0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03, 0x01, 0x07,
    0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20,
  ])
  const pkcs8 = new Uint8Array(prefix.length + raw.length)
  pkcs8.set(prefix)
  pkcs8.set(raw, prefix.length)
  return pkcs8.buffer
}

async function createVapidJwt(endpoint: string): Promise<string> {
  const audience = new URL(endpoint).origin
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60

  const header = base64urlEncode(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))
  const payload = base64urlEncode(JSON.stringify({ aud: audience, exp, sub: VAPID_SUBJECT }))
  const unsigned = `${header}.${payload}`

  const rawKey = base64urlDecode(VAPID_PRIVATE_KEY)
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    rawKeyToPkcs8(rawKey),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  )

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    cryptoKey,
    new TextEncoder().encode(unsigned),
  )

  return `${unsigned}.${base64urlEncode(new Uint8Array(sig))}`
}

// ── Web Push (no payload encryption — SW shows hardcoded message) ──────────
async function sendPush(endpoint: string): Promise<Response> {
  const jwt = await createVapidJwt(endpoint)
  return fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `vapid t=${jwt}, k=${VAPID_PUBLIC_KEY}`,
      TTL: '86400',
      'Content-Length': '0',
    },
  })
}

// ── Main ───────────────────────────────────────────────────────────────────
Deno.serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // 현재 KST 시간 (UTC+9)
  const now = new Date()
  const kstHour = (now.getUTCHours() + 9) % 24
  const kstMinute = now.getUTCMinutes()
  const timeStr = `${String(kstHour).padStart(2, '0')}:${String(kstMinute).padStart(2, '0')}`

  const { data: settings } = await supabase
    .from('user_settings')
    .select('user_id')
    .like('notification_time', `${timeStr}%`)

  if (!settings?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } })
  }

  const userIds = settings.map((s: { user_id: string }) => s.user_id)
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, user_id')
    .in('user_id', userIds)

  if (!subs?.length) {
    return new Response(JSON.stringify({ sent: 0 }), { headers: { 'Content-Type': 'application/json' } })
  }

  let sent = 0
  const expired: string[] = []

  await Promise.allSettled(
    subs.map(async (sub: { endpoint: string; user_id: string }) => {
      const res = await sendPush(sub.endpoint)
      if (res.ok || res.status === 201) {
        sent++
      } else if (res.status === 410) {
        expired.push(sub.endpoint)
      }
    }),
  )

  // 만료된 구독 정리
  if (expired.length) {
    await supabase.from('push_subscriptions').delete().in('endpoint', expired)
  }

  return new Response(
    JSON.stringify({ sent, total: subs.length }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
