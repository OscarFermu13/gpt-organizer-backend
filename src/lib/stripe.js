const Stripe = require('stripe');
const { STRIPE_SECRET_KEY } = require('../config');

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30',
});

module.exports = stripe;