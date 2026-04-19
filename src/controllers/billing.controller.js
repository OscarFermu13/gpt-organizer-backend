const prisma = require('../lib/prisma');
const { createCheckoutSession, createCustomerPortalSession, getCustomerByEmail } = require('../services/stripe.service');
const { sendError, ERROR_CODES } = require('../utils/errors')

async function startCheckout(req, res) {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return sendError(res, 404, ERROR_CODES.NOT_FOUND, 'User not found')
    }

    if (user.plan === 'pro') {
      return sendError(res, 400, ERROR_CODES.ALREADY_SUBSCRIBED, 'User already has an active subscription')
    }

    const url = await createCheckoutSession(user.email, userId);
    res.json({ url });
  } catch (err) {
    console.error('startCheckout error:', err.message)
    return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Could not create checkout session')
  }
}

async function startCustomerPortal(req, res) {
  try {
    const userId = req.user.userId;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return sendError(res, 404, ERROR_CODES.NOT_FOUND, 'User not found')
    }

    let stripeCustomerId = user.stripeCustomerId;

    if (!stripeCustomerId) {
      const customer = await getCustomerByEmail(user.email);
      if (!customer) {
        return sendError(res, 400, ERROR_CODES.NO_STRIPE_CUSTOMER, 'No Stripe customer found. Please complete a purchase first.')
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
    console.error('startCustomerPortal error:', err.message)
    return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Could not create portal session')
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
      return sendError(res, 404, ERROR_CODES.NOT_FOUND, 'User not found')
    }

    res.json({
      plan: user.plan,
      stripeCustomerId: user.stripeCustomerId,
      trialEndsAt: user.trialEndsAt,
      hasActiveSubscription: user.plan === 'pro'
    });
  } catch (err) {
    console.error('getSubscriptionStatus error:', err.message)
    return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Could not get subscription status')
  }
}

module.exports = {
  startCheckout,
  startCustomerPortal,
  getSubscriptionStatus
};