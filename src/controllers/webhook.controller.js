const prisma = require('../lib/prisma');

async function handleGumroadWebhook(req, res) {
  const {
    email,
    subscription_id,
    charge_occurrence,
    cancel_reason,
    product_permalink
  } = req.body;

  if (product_permalink !== 'https://oscarfermi.gumroad.com/l/gpt-organizer') {
    console.warn('Webhook received for invalid product:', product_permalink);
    return res.status(400).json({ error: 'Invalid product' });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { email: email }
    });

    if (!user) {
      console.warn(`Webhook: user not found for email ${email}`);
      return res.status(404).json({ error: 'User not found' });
    }

    if (cancel_reason) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: 'free',
          subscriptionId: null
        }
      });
      console.log(`User ${user.email} subscription cancelled.`);
    } else if (charge_occurrence === 1) {
      // First charge occurrence = trial
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7); 

      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: 'pro',
          trialEndsAt,
          subscriptionId: subscription_id
        }
      });
      console.log(`User ${user.email} started trial.`);
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          plan: 'pro',
          subscriptionId: subscription_id
        }
      });
      console.log(`User ${user.email} subscription payment received.`);
    }

    res.status(200).json({ message: 'Webhook processed successfully' });
  } catch (err) {
    console.error('Error processing Gumroad webhook:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  handleGumroadWebhook
};