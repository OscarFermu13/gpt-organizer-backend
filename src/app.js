const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const rateLimit = require('express-rate-limit')
const dotenv = require('dotenv')

const authRoutes = require('./routes/auth.route')
const chatRoutes = require('./routes/chat.route')
const folderRoutes = require('./routes/folder.route')
const billingRoute = require('./routes/billing.route')
const webhookRoute = require('./routes/webhook.route')
const messageRoute = require('./routes/message.route')

dotenv.config()

const app = express()

app.use(cors({
  origin: [
    'chrome-extension://coamoeeenfhnihibejoohkhcplckkjpm',
    'chrome-extension://fcdfobpfnlhkcfiapnkffcmpkgnomjdd',
    'https://chatgpt.com',
    'https://gpt-organizer-backend.onrender.com',
    'http://localhost:3000',
    'https://gpt-organizer-landing.vercel.app',
    'https://gptorganizersuite.com',
    'https://www.gptorganizersuite.com',
  ],
  credentials: true,
}))

app.use('/webhook/stripe', express.raw({ type: 'application/json' }))
app.use(express.json())
app.use(cookieParser())

// ── Rate limiting ─────────────────────────────────────────────────────────────

// Límite global: protege todos los endpoints de abuso genérico.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.', code: 'RATE_LIMITED' },
})

// Límite estricto para auth: previene fuerza bruta sobre /login y /register.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.', code: 'RATE_LIMITED' },
})

// Límite para webhooks de Stripe: solo Stripe debería llamar a este endpoint.
const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests.', code: 'RATE_LIMITED' },
})

app.use(globalLimiter)

// ── Rutas ─────────────────────────────────────────────────────────────────────

app.use('/auth', authLimiter, authRoutes)
app.use('/chats', chatRoutes)
app.use('/folders', folderRoutes)
app.use('/billing', billingRoute)
app.use('/webhook', webhookLimiter, webhookRoute)
app.use('/messages', messageRoute)

// ── Manejo global de errores ──────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack)
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    code: 'INTERNAL_ERROR',
  })
})

module.exports = app