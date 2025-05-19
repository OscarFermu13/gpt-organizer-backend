const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')

const {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
} = require('../controllers/folder.controller')

router.get('/', auth, getFolders)
router.post('/', auth, createFolder)
router.put('/:id', auth, updateFolder)
router.delete('/:id', auth, deleteFolder)

module.exports = router