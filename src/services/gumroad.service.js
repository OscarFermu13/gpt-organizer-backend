const axios = require('axios');
const prisma = require('../lib/prisma');

const GUMROAD_API_BASE = 'https://api.gumroad.com/v2';
const GUMROAD_ACCESS_TOKEN = process.env.GUMROAD_ACCESS_TOKEN;

async function fetchSubscription(subscriptionId) {
  const url = `${GUMROAD_API_BASE}/resource_subscriptions`;

  try {
    const response = await axios.get(url, {
      params: {
        access_token: GUMROAD_ACCESS_TOKEN,
        resource_name: sale
      }
    });

    const subscriptions = response.data.resource_subscriptions;
    const subscription = subscriptions.find(sub => sub.id === subscriptionId);

    if (!subscription) {
      console.warn(`No subscription found for ID ${subscriptionId}`);
      return null;
    }

    return subscription;

  } catch (err) {
    console.error(`Error fetching resource subscriptions for ${resourceName}:`, err.response?.data || err.message);
    throw new Error('Failed to fetch resource subscriptions');
  }
}

async function syncUserSubscription(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user || !user.subscriptionId) {
    console.warn(`User ${userId} not found or no subscriptionId`);
    return;
  }

  const subscription = await fetchSubscription(user.subscriptionId);

  const isActive = !subscription.canceled_at;
  const createdAt = new Date(subscription.created_at);
  const trialEndsAt = new Date(createdAt);
  trialEndsAt.setDate(trialEndsAt.getDate() + 7);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      plan: isActive ? 'pro' : 'free',
      trialEndsAt: trialEndsAt,
    }
  });

  console.log(`Synced user ${user.email}: plan=${isActive ? 'pro' : 'free'}`);
}

module.exports = {
  fetchSubscription,
  syncUserSubscription
};
