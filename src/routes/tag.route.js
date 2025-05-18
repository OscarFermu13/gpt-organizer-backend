const express = require('express')
const router = express.Router()
const {
  getTags,
  createTag,
  updateTag,
  deleteTag,
} = require('../controllers/tag.controller')

// CRUD endpoints
router.get('/', getTags)
router.post('/', createTag)
router.put('/:id', updateTag)
router.delete('/:id', deleteTag)

module.exports = router
