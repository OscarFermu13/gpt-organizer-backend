const stripe = require('../lib/stripe');
const { STRIPE_PRICE_ID, FRONTEND_URL } = require('../config');

async function createCheckoutSession(userEmail, userId) {
  try {
    const existingCustomers = await stripe.customers.list({ email: userEmail, limit: 1 });

    let customerId;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    }

    const sessionConfig = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{ price: STRIPE_PRICE_ID, quantity: 1 }],
      success_url: `${FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/`,
      metadata: { userId },
    };

    if (customerId) {
      sessionConfig.customer = customerId;
    } else {
      sessionConfig.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    return session.url;
  } catch (error) {
    throw error;
  }
}

async function createCustomerPortalSession(customerId) {
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${FRONTEND_URL}/dashboard`,
    });
    return portalSession.url;
  } catch (error) {
    throw error;
  }
}

async function getCustomerByEmail(email) {
  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    return customers.data.length > 0 ? customers.data[0] : null;
  } catch (error) {
    throw error;
  }
}

async function getSubscription(subscriptionId) {
  try {
    return await stripe.subscriptions.retrieve(subscriptionId);
  } catch (error) {
    throw error;
  }
}

module.exports = {
  createCheckoutSession,
  createCustomerPortalSession,
  getCustomerByEmail,
  getSubscription,
};