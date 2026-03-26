import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { AccessToken } from 'livekit-server-sdk'

const app = express()
app.use(express.json({ limit: '256kb' }))

const corsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean)

app.use(
  cors({
    origin: corsOrigins.length ? corsOrigins : true,
  }),
)

const PORT = Number(process.env.PORT || 8787)
const LIVEKIT_URL = process.env.LIVEKIT_URL || ''
const LIVEKIT_API_KEY = process.env.LIVEKIT_API_KEY || ''
const LIVEKIT_API_SECRET = process.env.LIVEKIT_API_SECRET || ''
const MATRIX_BASE_URL = process.env.MATRIX_BASE_URL || ''

function assertConfig() {
  const missing = []
  if (!LIVEKIT_URL) missing.push('LIVEKIT_URL')
  if (!LIVEKIT_API_KEY) missing.push('LIVEKIT_API_KEY')
  if (!LIVEKIT_API_SECRET) missing.push('LIVEKIT_API_SECRET')
  if (missing.length) {
    throw new Error(`Missing env vars: ${missing.join(', ')}`)
  }
}

function deriveLivekitRoomName(matrixRoomId) {
  return `mx_${String(matrixRoomId).replaceAll(':', '_')}`
}

async function whoami(matrixAccessToken, matrixBaseUrl) {
  const res = await fetch(`${matrixBaseUrl}/_matrix/client/v3/account/whoami`, {
    headers: {
      authorization: `Bearer ${matrixAccessToken}`,
    },
  })
  if (!res.ok) {
    throw new Error(`Matrix whoami failed (${res.status})`)
  }
  return await res.json()
}

async function ensureJoined(matrixAccessToken, roomId, matrixBaseUrl) {
  const encodedRoomId = encodeURIComponent(roomId)
  const res = await fetch(
    `${matrixBaseUrl}/_matrix/client/v3/rooms/${encodedRoomId}/joined_members`,
    {
    headers: {
      authorization: `Bearer ${matrixAccessToken}`,
    },
    },
  )

  if (!res.ok) {
    throw new Error(`Matrix joined_members failed (${res.status})`)
  }

  const body = await res.json()
  return body?.joined || {}
}

app.get('/healthz', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/livekit/token', async (req, res) => {
  try {
    const auth = req.headers.authorization || ''
    const matrixAccessToken = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
    const matrixRoomId = req.body?.matrix_room_id
    const matrixBaseUrl =
      req.body?.matrix_base_url || (MATRIX_BASE_URL ? MATRIX_BASE_URL : '')

    if (!matrixBaseUrl) {
      return res.status(400).json({
        error: 'Missing matrix_base_url (send from frontend or set MATRIX_BASE_URL env var)',
      })
    }
    if (!matrixBaseUrl.startsWith('http://') && !matrixBaseUrl.startsWith('https://')) {
      return res.status(400).json({ error: 'matrix_base_url must start with http:// or https://' })
    }

    if (!matrixAccessToken) {
      return res.status(401).json({ error: 'Missing Matrix bearer token' })
    }
    if (!matrixRoomId) {
      return res.status(400).json({ error: 'Missing matrix_room_id' })
    }

    const user = await whoami(matrixAccessToken, matrixBaseUrl)
    const joinedMap = await ensureJoined(matrixAccessToken, matrixRoomId, matrixBaseUrl)
    if (!joinedMap[user.user_id]) {
      return res.status(403).json({ error: 'User not joined in room' })
    }

    const token = new AccessToken(LIVEKIT_API_KEY, LIVEKIT_API_SECRET, {
      identity: user.user_id,
      name: user.user_id,
      ttl: '2h',
    })

    const roomName = deriveLivekitRoomName(matrixRoomId)
    token.addGrant({
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    })

    const jwt = await token.toJwt()

    return res.json({
      livekit_url: LIVEKIT_URL,
      room_name: roomName,
      token: jwt,
      user_id: user.user_id,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return res.status(500).json({ error: msg })
  }
})

try {
  assertConfig()
  app.listen(PORT, () => {
    console.log(`livekit-token-service listening on http://localhost:${PORT}`)
  })
} catch (error) {
  const msg = error instanceof Error ? error.message : String(error)
  console.error(msg)
  process.exit(1)
}
