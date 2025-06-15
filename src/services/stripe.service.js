const stripe = require('../lib/stripe');
const prisma = require('../lib/prisma');

async function createCheckoutSession(userEmail, userId) {
  try {
    // Verificar si ya existe un cliente con este email
    const existingCustomers = await stripe.customers.list({
      email: userEmail,
      limit: 1
    });

    let customerId;
    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    }

    // Verificar si el usuario ya tuvo trial antes
    const user = await prisma.user.findUnique({
      where: { email: userEmail }
    });
    
    const hasHadTrial = user?.trialEndsAt !== null || user?.stripeCustomerId !== null;

    const sessionConfig = {
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: process.env.STRIPE_PRICE_ID,
        quantity: 1,
      }],
      success_url: `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/`,
      metadata: {
        userId: userId
      }
    };

    // Solo agregar trial si es nuevo usuario
    if (!hasHadTrial) {
      sessionConfig.subscription_data = {
        trial_period_days: 7,
        metadata: {
          userId: userId
        }
      };
    }

    // Si existe un cliente, usarlo; si no, Stripe creará uno nuevo
    if (customerId) {
      sessionConfig.customer = customerId;
    } else {
      sessionConfig.customer_email = userEmail;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    return session.url;
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

async function createCustomerPortalSession(customerId) {
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${process.env.FRONTEND_URL}/dashboard`
    });

    return portalSession.url;
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw error;
  }
}

async function getCustomerByEmail(email) {
  try {
    const customers = await stripe.customers.list({
      email: email,
      limit: 1
    });

    if (customers.data.length > 0) {
      return customers.data[0];
    }
    
    return null;
  } catch (error) {
    console.error('Error getting customer by email:', error);
    throw error;
  }
}

async function getSubscription(subscriptionId) {
  try {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    return subscription;
  } catch (error) {
    console.error('Error getting subscription:', error);
    throw error;
  }
}

module.exports = {
  createCheckoutSession,
  createCustomerPortalSession,
  getCustomerByEmail,
  getSubscription
};