const prisma = require('../lib/prisma');
const { syncUserSubscription } = require('../services/gumroad.service');

async function handleGumroadWebhook(req, res) {
  try {
    const {
      email,
      subscription_id,
      product_permalink,
      sale_id
    } = req.body;

    if (!email || !subscription_id) {
      console.warn('Webhook missing required fields:', req.body);
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (product_permalink !== 'https://oscarfermi.gumroad.com/l/gpt-organizer') {
      console.warn(`Invalid product permalink: ${product_permalink}`);
      return res.status(400).json({ error: 'Invalid product' });
    }

    let user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          subscriptionId: subscription_id,
          plan: 'free'
        }
      });
      console.log(`Created user ${email}`);
    } else if (!user.subscriptionId) {
      await prisma.user.update({
        where: { id: user.id },
        data: { subscriptionId: subscription_id }
      });
      console.log(`Updated user ${email} with subscriptionId`);
    }

    await syncUserSubscription(user.id, sale_id);

    res.status(200).json({ received: true });
  } catch (err) {
    console.error('Error processing Gumroad webhook:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}

module.exports = {
  handleGumroadWebhook
};
