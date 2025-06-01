const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')

const {
  getChats,
  createChat,
  updateChat,
  deleteChat,
} = require('../controllers/chat.controller')

router.get('/', auth, getChats)
router.post('/', auth, createChat)
router.put('/:id', auth, updateChat)
router.delete('/:id', auth, deleteChat)

module.exports = router
