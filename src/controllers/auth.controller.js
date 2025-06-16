const prisma = require('../lib/prisma')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret'

const cookieOptions = {
      httpOnly: true,
      secure: true,
      sameSite: 'None',
      maxAge: 7 * 24 * 60 * 60 * 1000
    };

async function register(req, res) {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' })
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        plan: 'free',
        trialEndsAt
      },
    })

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

    res.cookie('token', token, cookieOptions);
    res.status(201).json({ token })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function login(req, res) {
  const { email, password } = req.body

  try {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })

    res.cookie('token', token, cookieOptions);
    res.json({ token })
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' })
  }
}

async function logout(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: true,
    sameSite: 'None',
  })
  res.status(200).json({ message: 'Logged out successfully' })
}

async function validateUser(req, res, next) {
  const token = req.cookies.token;
  
  if (!token) {
    return res.status(401).json({ error: 'No token' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    res.json({ email: user.email, plan: user.plan, trialEndsAt: user.trialEndsAt, subscriptionId: user.subscriptionId });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = {
  register,
  login,
  logout,
  validateUser,
}
