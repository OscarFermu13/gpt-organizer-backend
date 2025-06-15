const stripe = require('../lib/stripe');
const prisma = require('../lib/prisma');

async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  console.log(`Received webhook: ${event.type}`);

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
    console.error('Error handling webhook:', err);
    res.status(500).json({ error: 'Webhook handler error' });
  }
}

async function handleCheckoutCompleted(session) {
  console.log('Processing checkout.session.completed:', session.id);
  
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
      console.error('User not found for checkout session:', session.id);
      return;
    }

    // Verificar si es la primera suscripción del usuario
    const isFirstSubscription = !user.stripeCustomerId;
    
    // Calcular fecha de fin del trial (7 días desde ahora)
    const trialEndsAt = isFirstSubscription ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : user.trialEndsAt;

    // Actualizar usuario con información de Stripe
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        stripeCustomerId: customerId,
        plan: 'pro',
        ...(isFirstSubscription && { trialEndsAt })
      }
    });

    console.log(`User ${user.email} upgraded to pro plan${isFirstSubscription ? ' with 7-day trial' : ''}`);
  } catch (error) {
    console.error('Error in handleCheckoutCompleted:', error);
    throw error;
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log('Processing customer.subscription.created:', subscription.id);
  
  try {
    // Buscar el usuario por stripeCustomerId
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: subscription.customer }
    });

    if (!user) {
      console.error('User not found for subscription:', subscription.id);
      return;
    }

    // Verificar si el usuario ya tiene una fecha de fin de trial
    const isFirstSubscription = !user.trialEndsAt;
    
    // Calcular fecha de fin del trial (7 días desde ahora) solo si es la primera vez
    const trialEndsAt = isFirstSubscription ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) : user.trialEndsAt;

    await prisma.user.updateMany({
      where: { stripeCustomerId: subscription.customer },
      data: { 
        plan: 'pro',
        subscriptionId: subscription.id,
        ...(isFirstSubscription && { trialEndsAt })
      }
    });

    console.log(`Subscription created: ${subscription.id}${isFirstSubscription ? ' with 7-day trial' : ''}`);
  } catch (error) {
    console.error('Error in handleSubscriptionCreated:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Processing customer.subscription.updated:', subscription.id);
  
  try {
    const plan = subscription.status === 'active' ? 'pro' : 'free';
    
    await prisma.user.updateMany({
      where: { stripeCustomerId: subscription.customer },
      data: { 
        plan: plan,
        subscriptionId: subscription.id
      }
    });

    console.log(`Subscription updated: ${subscription.id}, status: ${subscription.status}`);
  } catch (error) {
    console.error('Error in handleSubscriptionUpdated:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Processing customer.subscription.deleted:', subscription.id);
  
  try {
    await prisma.user.updateMany({
      where: { stripeCustomerId: subscription.customer },
      data: { 
        plan: 'free',
        subscriptionId: null
      }
    });

    console.log(`Subscription deleted: ${subscription.id}`);
  } catch (error) {
    console.error('Error in handleSubscriptionDeleted:', error);
    throw error;
  }
}

async function handlePaymentSucceeded(invoice) {
  console.log('Processing invoice.payment_succeeded:', invoice.id);
}

async function handlePaymentFailed(invoice) {
  console.log('Processing invoice.payment_failed:', invoice.id);
  
  try {
    // Buscar el usuario por la suscripción
    const user = await prisma.user.findFirst({
      where: { subscriptionId: invoice.subscription }
    });

    if (user) {
      // Verificar si el trial ha expirado
      const now = new Date();
      const trialExpired = user.trialEndsAt && now > user.trialEndsAt;
      
      if (trialExpired) {
        // Si el trial expiró y el pago falló, downgrade a free
        await prisma.user.update({
          where: { id: user.id },
          data: { plan: 'free' }
        });
        
        console.log(`User ${user.email} downgraded to free plan due to failed payment after trial expiry`);
      }
    }
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error);
  }

}

module.exports = {
  handleStripeWebhook
};