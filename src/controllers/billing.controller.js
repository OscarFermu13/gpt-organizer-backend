const prisma = require('../lib/prisma');
const { createCheckoutSession, createCustomerPortalSession, getCustomerByEmail } = require('../services/stripe.service');

async function startCheckout(req, res) {
  try {
    const userId = req.user.userId;
    
    // Obtener datos completos del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verificar si ya tiene una suscripción activa
    if (user.plan === 'pro') {
      return res.status(400).json({ error: 'User already has an active subscription' });
    }

    const url = await createCheckoutSession(user.email, userId);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Could not create checkout session' });
  }
}

async function startCustomerPortal(req, res) {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ error: 'User not found' });

    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await getCustomerByEmail(user.email);
      if (!customer) {
        return res.status(400).json({ error: 'No Stripe customer found. Please complete a purchase first.' });
      }

      stripeCustomerId = customer.id;
      await prisma.user.update({
        where: { id: userId },
        data: { stripeCustomerId }
      });
    }

    const url = await createCustomerPortalSession(stripeCustomerId);
    res.json({ url });
  } catch (err) {
    res.status(500).json({ error: 'Could not create portal session' });
  }
}

async function getSubscriptionStatus(req, res) {
  try {
    const userId = req.user.userId;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        plan: true,
        stripeCustomerId: true,
        trialEndsAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      plan: user.plan,
      stripeCustomerId: user.stripeCustomerId,
      trialEndsAt: user.trialEndsAt,
      hasActiveSubscription: user.plan === 'pro'
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not get subscription status' });
  }
}

module.exports = {
  startCheckout,
  startCustomerPortal,
  getSubscriptionStatus
};