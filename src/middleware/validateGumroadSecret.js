require('dotenv').config();

function validateGumroadSecret(req, res, next) {
  const expectedSecret = process.env.GUMROAD_SECRET;
  const receivedSecret = req.query.token;

  if (!expectedSecret) {
    console.error('GUMROAD_SECRET is not set in environment variables');
    return res.status(500).json({ error: 'Server misconfiguration' });
  }

  if (!receivedSecret || receivedSecret !== expectedSecret) {
    console.warn('Invalid Gumroad webhook secret');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  next();
}

module.exports = validateGumroadSecret;