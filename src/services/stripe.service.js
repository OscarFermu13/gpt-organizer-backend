const stripe = require('../lib/stripe');

async function createCheckoutSession(userEmail) {
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{
      price: process.env.STRIPE_PRICE_ID, // tu precio de Stripe
      quantity: 1,
    }],
    customer_email: userEmail,
    success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.FRONTEND_URL}/cancel`
  });

  return session.url;
}

async function createCustomerPortalSession(customerId) {
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.FRONTEND_URL}/dashboard`
  });

  return portalSession.url;
}

module.exports = {
  createCheckoutSession,
  createCustomerPortalSession
};
