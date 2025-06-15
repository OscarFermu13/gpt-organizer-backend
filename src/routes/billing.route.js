const express = require('express');
const router = express.Router();
const auth = require('../middleware/authMiddleware');
const { startCheckout, startCustomerPortal, getSubscriptionStatus } = require('../controllers/billing.controller');

router.post('/checkout', auth, startCheckout);
router.post('/portal', auth, startCustomerPortal);
router.get('/status', auth, getSubscriptionStatus);


module.exports = router;