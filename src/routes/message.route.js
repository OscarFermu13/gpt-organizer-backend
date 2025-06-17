const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const pro = require('../middleware/requireProPlan')

const { 
    createMessage, 
    getMessages, 
    deleteMessage 
} = require('../controllers/message.controller');

router.get('/', auth, pro, getMessages)
router.post('/', auth, pro, createMessage)
router.delete('/:id', auth, pro, deleteMessage)

module.exports = router