function requireProPlan(req, res, next) {
  const user = req.user;

  console.log(req.user)

  if (user.plan === 'pro') return next();

  const now = new Date();
  if (user.trialEndsAt && new Date(user.trialEndsAt) > now) return next();

  return res.status(403).json({ error: 'Upgrade required' });
}

module.exports = requireProPlan