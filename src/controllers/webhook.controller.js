const stripe = require('../lib/stripe');
const prisma = require('../lib/prisma');

async function handleStripeWebhook(req, res) {
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const data = event.data.object;

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        // Guarda stripeCustomerId al usuario
        await prisma.user.update({
          where: { email: data.customer_email },
          data: { 
            stripeCustomerId: data.customer,
            plan: 'pro'
          }
        });
        console.log(`User ${data.customer_email} checkout completed.`);
        break;

      case 'customer.subscription.updated':
      case 'invoice.payment_succeeded':
        // Actualiza plan si es necesario
        console.log(`Subscription updated: ${data.id}`);
        break;

      case 'customer.subscription.deleted':
        await prisma.user.updateMany({
          where: { stripeCustomerId: data.customer },
          data: { plan: 'free' }
        });
        console.log(`Subscription deleted: ${data.id}`);
        break;

      case 'invoice.payment_failed':
        console.warn(`Payment failed for subscription: ${data.subscription}`);
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

module.exports = {
  handleStripeWebhook
};
