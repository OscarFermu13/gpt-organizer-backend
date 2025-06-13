const express = require('express')
const router = express.Router()
const auth = require('../middleware/authMiddleware')

const { getBillingStatus } = require('../controllers/billing.controller');

router.get('/status', auth, getBillingStatus);

module.exports = router;