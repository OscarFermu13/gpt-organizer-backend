const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const dotenv = require('dotenv')

dotenv.config()

const app = express()

app.use(cors({
  origin: ['chrome-extension://coamoeeenfhnihibejoohkhcplckkjpm', 'chrome-extension://fcdfobpfnlhkcfiapnkffcmpkgnomjdd', 'https://chatgpt.com', 'https://gpt-organizer-backend.onrender.com', 'http://localhost:3000',  'https://gpt-organizer-landing.vercel.app', 'https://gptorganizersuite.com', 'https://www.gptorganizersuite.com'], 
  credentials: true, 
}))

app.use('/webhook/stripe', express.raw({ type: 'application/json' }))

app.use(express.json())
app.use(cookieParser())

// Rutas
app.get('/', (req, res) => {
    res.send('Hello World 👋🏻')
  })

const authRoutes = require('./routes/auth.route')
app.use('/auth', authRoutes)

const chatRoutes = require('./routes/chat.route')
app.use('/chats', chatRoutes)

const folderRoutes = require('./routes/folder.route')
app.use('/folders', folderRoutes)

const billingRoute = require('./routes/billing.route');
app.use('/billing', billingRoute);

const webhookRoute = require('./routes/webhook.route');
app.use('/webhook', webhookRoute);

const messageRoute = require('./routes/message.route');
app.use('/messages', messageRoute);

module.exports = app
