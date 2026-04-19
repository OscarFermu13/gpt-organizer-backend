const prisma = require('../lib/prisma');
const { sendError, ERROR_CODES } = require('../utils/errors')

async function requireProPlan(req, res, next) {
  const userId = req.user?.userId;

  if (!userId) {
    return sendError(res, 401, ERROR_CODES.UNAUTHORIZED, 'Unauthorized')
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const now = new Date();

    if (!user) {
      return sendError(res, 403, ERROR_CODES.ACCESS_DENIED, 'No user found')
    }

    if (user.plan === 'free' && user.trialEndsAt && new Date(user.trialEndsAt) < now) {
      return sendError(res, 403, ERROR_CODES.UPGRADE_REQUIRED, 'Upgrade required')
    }

    next();
  } catch (err) {
    console.error('requireProPlan error:', err.message)
    return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Server error')
  }
}

module.exports = requireProPlan;