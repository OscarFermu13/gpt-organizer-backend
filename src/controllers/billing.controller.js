const prisma = require('../lib/prisma');
const { createCheckoutSession, createCustomerPortalSession } = require('../services/stripe.service');

async function startCheckout(req, res) {
  try {
    const user = req.user; 
    const url = await createCheckoutSession(user.email);
    res.json({ url });
  } catch (err) {
    console.error('Error creating checkout session:', err);
    res.status(500).json({ error: 'Could not create checkout session' });
  }
}

async function startCustomerPortal(req, res) {
  try {
    const user = req.user;
    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'User has no Stripe customer ID' });
    }

    const url = await createCustomerPortalSession(user.stripeCustomerId);
    res.json({ url });
  } catch (err) {
    console.error('Error creating portal session:', err);
    res.status(500).json({ error: 'Could not create portal session' });
  }
}

module.exports = {
  startCheckout,
  startCustomerPortal
};
