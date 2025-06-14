const axios = require('axios');
const prisma = require('../lib/prisma');

const GUMROAD_API_BASE = 'https://api.gumroad.com/v2';
const GUMROAD_ACCESS_TOKEN = process.env.GUMROAD_ACCESS_TOKEN;

async function fetchSubscription(subscriptionId) {
  const url = `${GUMROAD_API_BASE}/subscriptions/${subscriptionId}`;
  
  try {
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${GUMROAD_ACCESS_TOKEN}`
      }
    });
    
    return response.data.subscription;
  } catch (err) {
    console.error(`Error fetching subscription ${subscriptionId}:`, err.response?.data || err.message);
    throw new Error('Failed to fetch subscription');
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
  trialEndsAt.setDate(trialEndsAt.getDate() + 7); // 7 días de trial

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
