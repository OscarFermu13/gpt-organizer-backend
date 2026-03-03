const stripe = require('../lib/stripe');
const prisma = require('../lib/prisma');

async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
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
    res.status(500).json({ error: 'Webhook handler error' });
  }
}

async function handleCheckoutCompleted(session) {
  
  try {
    // Obtener información de la sesión
    const customerId = session.customer;
    const customerEmail = session.customer_email;
    const userId = session.metadata?.userId;

    // Buscar usuario por email o userId
    let user;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    } else if (customerEmail) {
      user = await prisma.user.findUnique({ where: { email: customerEmail } });
    }

    if (!user) {
      return;
    }

    // Actualizar usuario con información de Stripe
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        stripeCustomerId: customerId,
        plan: 'pro'
      }
    });

  } catch (error) {
    throw error;
  }
}

async function handleSubscriptionCreated(subscription) {  
  try {
    await prisma.user.updateMany({
      where: { stripeCustomerId: subscription.customer },
      data: { 
        plan: 'pro',
        subscriptionId: subscription.id
      }
    });

  } catch (error) {
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription) {  
  try {
    const plan = subscription.status === 'active' ? 'pro' : 'free';
    
    await prisma.user.updateMany({
      where: { stripeCustomerId: subscription.customer },
      data: { 
        plan: plan,
        subscriptionId: subscription.id
      }
    });

  } catch (error) {
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription) {  
  try {
    await prisma.user.updateMany({
      where: { stripeCustomerId: subscription.customer },
      data: { 
        plan: 'free',
        subscriptionId: null
      }
    });

  } catch (error) {
    throw error;
  }
}

async function handlePaymentSucceeded(invoice) {
}

async function handlePaymentFailed(invoice) {
}

module.exports = {
  handleStripeWebhook
};
