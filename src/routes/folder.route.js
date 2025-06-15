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
router.post('/', auth, createFolder)
router.put('/:id', auth, updateFolder)
router.delete('/:id', auth, deleteFolder)

module.exports = router