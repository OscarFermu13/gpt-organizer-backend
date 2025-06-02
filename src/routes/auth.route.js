const express = require('express')
const router = express.Router()
const { register, login, logout, validateUser } = require('../controllers/auth.controller')

router.post('/register', register)
router.post('/login', login)
router.post('/logout', logout)
router.get('/validate', validateUser)

module.exports = router
