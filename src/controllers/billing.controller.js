const prisma = require('../lib/prisma');

async function getBillingStatus(req, res) {
  const userId = req.user.userId;

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { plan: true, trialEndsAt: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const now = new Date();
    const isTrial = user.trialEndsAt && new Date(user.trialEndsAt) > now;
    const isPro = user.plan === 'pro';

    return res.json({
      plan: user.plan,
      trialEndsAt: user.trialEndsAt,
      isPro: isPro || isTrial
    });
  } catch (err) {
    console.error('Error getting billing status:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = {
  getBillingStatus
};