const express = require('express')
const cors = require('cors')
const dotenv = require('dotenv')

dotenv.config()

const app = express()

app.use(cors())
app.use(express.json())

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
