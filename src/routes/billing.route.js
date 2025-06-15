const express = require('express');
const router = express.Router();
const { startCheckout, startCustomerPortal } = require('../controllers/billing.controller');

router.post('/checkout', startCheckout);
router.post('/portal', startCustomerPortal);

module.exports = router;
