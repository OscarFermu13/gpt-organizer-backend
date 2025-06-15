const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const pro = require('../middleware/requireProPlan')

const {
  getChats,
  createChat,
  updateChat,
  deleteChat,
} = require('../controllers/chat.controller')

router.get('/', auth, pro, getChats)
router.post('/', auth, pro, createChat)
router.put('/:id', auth, pro, updateChat)
router.delete('/:id', auth, pro, deleteChat)

module.exports = router
