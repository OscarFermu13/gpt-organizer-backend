const express = require('express')
const cors = require('cors')
const cookieParser = require('cookie-parser')
const dotenv = require('dotenv')

dotenv.config()

const app = express()

app.use(cors({
  origin: ['chrome-extension://coamoeeenfhnihibejoohkhcplckkjpm', 'https://chatgpt.com', 'http://localhost:3000'], // Reemplaza con el origen de tu frontend
  credentials: true, 
}))
app.use(express.json())
app.use(cookieParser())

// Rutas
app.get('/', (req, res) => {
    res.send('Hello World 👋🏻')
  })

const authRoutes = require('./routes/auth.route')
app.use('/auth', authRoutes)

const tagRoutes = require('./routes/tag.route')
app.use('/tags', tagRoutes)

const chatRoutes = require('./routes/chat.route')
app.use('/chats', chatRoutes)

const folderRoutes = require('./routes/folder.route')
app.use('/folders', folderRoutes)

module.exports = app
