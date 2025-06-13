const express = require('express')
const router = express.Router()

const { handleGumroadWebhook } = require('../controllers/webhook.controller');
const validateGumroadSecret = require('../middleware/validateGumroadSecret');

router.post('/gumroad', express.urlencoded({ extended: true }), validateGumroadSecret, handleGumroadWebhook);

module.exports = router;