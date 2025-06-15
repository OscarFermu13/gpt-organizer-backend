const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')
const pro = require('../middleware/requireProPlan')

const {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
} = require('../controllers/folder.controller')

router.get('/', auth, pro, getFolders)
router.post('/', auth, pro, createFolder)
router.put('/:id', auth, pro, updateFolder)
router.delete('/:id', auth, pro, deleteFolder)

module.exports = router