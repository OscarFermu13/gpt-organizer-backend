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

module.exports = app
