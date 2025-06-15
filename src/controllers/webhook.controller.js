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

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object);
        break;

      case 'invoice.created':
        await handleInvoiceCreated(event.data.object);
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

    // Actualizar usuario con información de Stripe
    await prisma.user.update({
      where: { id: user.id },
      data: { 
        stripeCustomerId: customerId,
        plan: 'pro' // Usuario tiene acceso inmediato durante el trial
      }
    });

    console.log(`User ${user.email} upgraded to pro plan${isFirstSubscription ? ' (checkout completed)' : ''}`);
  } catch (error) {
    console.error('Error in handleCheckoutCompleted:', error);
    throw error;
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log('Processing customer.subscription.created:', subscription.id);
  
  try {
    // Verificar si la suscripción tiene trial
    const hasTrialEnd = subscription.trial_end !== null;
    
    let trialEndsAt = null;
    if (hasTrialEnd) {
      // Convertir timestamp de Stripe a Date
      trialEndsAt = new Date(subscription.trial_end * 1000);
    }

    await prisma.user.updateMany({
      where: { stripeCustomerId: subscription.customer },
      data: { 
        plan: 'pro', // Durante el trial ya tiene acceso pro
        subscriptionId: subscription.id,
        subscriptionStatus: subscription.status, // 'trialing', 'active', etc.
        ...(trialEndsAt && { trialEndsAt })
      }
    });

    const trialInfo = hasTrialEnd ? ` with trial ending ${trialEndsAt.toISOString()}` : '';
    console.log(`Subscription created: ${subscription.id}, status: ${subscription.status}${trialInfo}`);
  } catch (error) {
    console.error('Error in handleSubscriptionCreated:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Processing customer.subscription.updated:', subscription.id);
  
  try {
    // Determinar el plan basado en el status de la suscripción
    let plan = 'free';
    if (subscription.status === 'active' || subscription.status === 'trialing') {
      plan = 'pro';
    }
    
    const updateData = {
      plan: plan,
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status
    };

    // Si el trial terminó (pasó de trialing a active), limpiar trialEndsAt
    if (subscription.status === 'active' && subscription.trial_end && subscription.trial_end < Date.now() / 1000) {
      updateData.trialEndsAt = null;
    }

    await prisma.user.updateMany({
      where: { stripeCustomerId: subscription.customer },
      data: updateData
    });

    console.log(`Subscription updated: ${subscription.id}, status: ${subscription.status}, plan: ${plan}`);
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
        subscriptionId: null,
        subscriptionStatus: 'canceled',
        trialEndsAt: null
      }
    });

    console.log(`Subscription deleted: ${subscription.id}`);
  } catch (error) {
    console.error('Error in handleSubscriptionDeleted:', error);
    throw error;
  }
}

async function handleTrialWillEnd(subscription) {
  console.log('Processing customer.subscription.trial_will_end:', subscription.id);
  
  try {
    // Buscar el usuario
    const user = await prisma.user.findFirst({
      where: { stripeCustomerId: subscription.customer }
    });

    if (user) {
      console.log(`Trial will end soon for user: ${user.email}, subscription: ${subscription.id}`);
    }
  } catch (error) {
    console.error('Error in handleTrialWillEnd:', error);
  }
}

async function handleInvoiceCreated(invoice) {
  console.log('Processing invoice.created:', invoice.id);
  
  try {
    // Esta factura se crea cuando termina el trial
    if (invoice.subscription) {
      const user = await prisma.user.findFirst({
        where: { subscriptionId: invoice.subscription }
      });

      if (user) {
        console.log(`Invoice created for user: ${user.email} after trial period`);
      }
    }
  } catch (error) {
    console.error('Error in handleInvoiceCreated:', error);
  }
}

async function handlePaymentSucceeded(invoice) {
  console.log('Processing invoice.payment_succeeded:', invoice.id);
  
  try {
    if (invoice.subscription) {
      // Asegurar que el usuario mantenga acceso pro
      await prisma.user.updateMany({
        where: { subscriptionId: invoice.subscription },
        data: { 
          plan: 'pro',
          subscriptionStatus: 'active'
        }
      });

      console.log(`Payment succeeded for subscription: ${invoice.subscription}`);
    }
  } catch (error) {
    console.error('Error in handlePaymentSucceeded:', error);
  }
}

async function handlePaymentFailed(invoice) {
  console.log('Processing invoice.payment_failed:', invoice.id);
  
  try {
    if (invoice.subscription) {
      const user = await prisma.user.findFirst({
        where: { subscriptionId: invoice.subscription }
      });

      if (user) {
        // Verificar si el trial ya terminó
        const now = new Date();
        const trialExpired = !user.trialEndsAt || now > user.trialEndsAt;
        
        if (trialExpired) {
          // Trial terminó y pago falló - downgrade a free
          await prisma.user.update({
            where: { id: user.id },
            data: { 
              plan: 'free',
              subscriptionStatus: 'past_due'
            }
          });
          
          console.log(`User ${user.email} downgraded to free due to failed payment after trial`);
        } else {
          // Aún en trial, mantener acceso pro pero marcar status
          await prisma.user.update({
            where: { id: user.id },
            data: { 
              subscriptionStatus: 'past_due'
            }
          });
          
          console.log(`Payment failed for user ${user.email} but still in trial period`);
        }
      }
    }
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error);
  }
}

module.exports = {
  handleStripeWebhook
};