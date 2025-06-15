const prisma = require('../lib/prisma');

async function requireProPlan(req, res, next) {
  const userId = req.user?.userId;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.plan !== 'pro') {
      return res.status(403).json({ error: 'Upgrade required' });
    }

    next();
  } catch (err) {
    console.error('Error checking pro plan:', err);
    res.status(500).json({ error: 'Server error' });
  }
}

module.exports = requireProPlan;