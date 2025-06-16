const express = require('express')
const router = express.Router()
const { register, login, logout, validateUser, changePassword, deleteUser } = require('../controllers/auth.controller')

router.post('/register', register)
router.post('/login', login)
router.post('/logout', logout)
router.put('/change-password', changePassword)
router.delete('/delete-user', deleteUser)
router.get('/validate', validateUser)

module.exports = router
