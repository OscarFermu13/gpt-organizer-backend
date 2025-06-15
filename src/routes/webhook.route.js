const express = require('express');
const router = express.Router();
const { handleStripeWebhook } = require('../controllers/webhook.controller');

router.post('/stripe', handleStripeWebhook);

module.exports = router;