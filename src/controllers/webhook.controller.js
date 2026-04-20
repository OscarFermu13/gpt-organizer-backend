const stripe = require('../lib/stripe');
const prisma = require('../lib/prisma');
const { sendError, ERROR_CODES } = require('../utils/errors')
const { STRIPE_WEBHOOK_SECRET } = require('../config')

async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err.message)
    return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Webhook handler error')
  }
}

async function handleCheckoutCompleted(session) {
  try {
    const customerId = session.customer;
    const customerEmail = session.customer_email;
    const userId = session.metadata?.userId;

    let user;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } else if (customerEmail) {
      user = await prisma.user.findUnique({ where: { email: customerEmail } });
    }

    if (!user) {
      console.warn('handleCheckoutCompleted: no user found for session', session.id)
      return;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId: customerId, plan: 'pro' },
    });
  } catch (error) {
    console.error('handleCheckoutCompleted error:', error.message)
    throw error;
  }
}

async function handleSubscriptionCreated(subscription) {
  try {
    await prisma.user.updateMany({
      where: { stripeCustomerId: subscription.customer },
      data: { plan: 'pro', subscriptionId: subscription.id },
    });
  } catch (error) {
    console.error('handleSubscriptionCreated error:', error.message)
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription) {
  try {
    const plan = subscription.status === 'active' ? 'pro' : 'free';
    await prisma.user.updateMany({
      where: { stripeCustomerId: subscription.customer },
      data: { plan, subscriptionId: subscription.id },
    });
  } catch (error) {
    console.error('handleSubscriptionUpdated error:', error.message)
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription) {
  try {
    await prisma.user.updateMany({
      where: { stripeCustomerId: subscription.customer },
      data: { plan: 'free', subscriptionId: null },
    });
  } catch (error) {
    console.error('handleSubscriptionDeleted error:', error.message)
    throw error;
  }
}

async function handlePaymentSucceeded(invoice) {
  // TODO: enviar email de confirmación al usuario
  console.log('Payment succeeded for customer:', invoice.customer)
}

async function handlePaymentFailed(invoice) {
  // TODO: notificar al usuario por email, marcar cuenta como past_due
  console.warn('Payment failed for customer:', invoice.customer)
}

module.exports = { handleStripeWebhook };