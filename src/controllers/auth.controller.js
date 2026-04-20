const prisma = require('../lib/prisma')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const { sendError, ERROR_CODES } = require('../utils/errors')
const { isValidEmail, isValidPassword } = require('../utils/validate')
const { JWT_SECRET, IS_PRODUCTION } = require('../config')

const cookieOptions = {
  httpOnly: true,
  secure: IS_PRODUCTION,
  sameSite: IS_PRODUCTION ? 'None' : 'Lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

async function register(req, res) {
  const { email, password } = req.body

  if (!email || !password) {
    return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Email and password are required')
  }
  if (!isValidEmail(email)) {
    return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid email format')
  }
  if (!isValidPassword(password)) {
    return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Password must be between 8 and 72 characters')
  }

  try {
    const existingUser = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (existingUser) {
      return sendError(res, 409, ERROR_CODES.CONFLICT, 'User already exists')
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const user = await prisma.user.create({
      data: {
        email: email.trim().toLowerCase(),
        password: hashedPassword,
        plan: 'free',
        trialEndsAt,
      },
    })

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
    res.cookie('token', token, cookieOptions)
    res.status(201).json({ token })
  } catch (error) {
    console.error('register error:', error.message)
    return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Internal server error')
  }
}

async function login(req, res) {
  const { email, password } = req.body

  if (!email || !password) {
    return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Email and password are required')
  }
  if (!isValidEmail(email)) {
    return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid email format')
  }

  try {
    const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } })
    if (!user) {
      return sendError(res, 401, ERROR_CODES.UNAUTHORIZED, 'Invalid credentials')
    }

    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return sendError(res, 401, ERROR_CODES.UNAUTHORIZED, 'Invalid credentials')
    }

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' })
    res.cookie('token', token, cookieOptions)
    res.json({ token })
  } catch (error) {
    console.error('login error:', error.message)
    return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Internal server error')
  }
}

async function logout(req, res) {
  res.clearCookie('token', {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: IS_PRODUCTION ? 'None' : 'Lax',
  })
  res.status(200).json({ message: 'Logged out successfully' })
}

async function changePassword(req, res) {
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword) {
    return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Current and new password are required')
  }
  if (!isValidPassword(newPassword)) {
    return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'New password must be between 8 and 72 characters')
  }

  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } })
    if (!user) {
      return sendError(res, 404, ERROR_CODES.NOT_FOUND, 'User not found')
    }

    const isValid = await bcrypt.compare(currentPassword, user.password)
    if (!isValid) {
      return sendError(res, 401, ERROR_CODES.UNAUTHORIZED, 'Current password is incorrect')
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedNewPassword },
    })

    res.status(200).json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('changePassword error:', error.message)
    return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Internal server error')
  }
}

async function deleteUser(req, res) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } })
    if (!user) {
      return sendError(res, 404, ERROR_CODES.NOT_FOUND, 'User not found')
    }

    await prisma.$transaction([
      prisma.starredMessage.deleteMany({ where: { userId: user.id } }),
      prisma.chat.deleteMany({ where: { userId: user.id } }),
      prisma.folder.deleteMany({ where: { userId: user.id } }),
      prisma.user.delete({ where: { id: user.id } }),
    ])

    res.clearCookie('token', {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: IS_PRODUCTION ? 'None' : 'Lax',
    })
    res.status(200).json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('deleteUser error:', error.message)
    return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Internal server error')
  }
}

async function validateUser(req, res) {
  const token = req.cookies.token

  if (!token) {
    return sendError(res, 401, ERROR_CODES.NO_TOKEN, 'No token')
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    if (!user) {
      return sendError(res, 401, ERROR_CODES.INVALID_TOKEN, 'Invalid token')
    }

    res.json({
      email: user.email,
      plan: user.plan,
      trialEndsAt: user.trialEndsAt,
      subscriptionId: user.subscriptionId,
    })
  } catch (error) {
    return sendError(res, 401, ERROR_CODES.INVALID_TOKEN, 'Invalid or expired token')
  }
}

module.exports = {
  register,
  login,
  logout,
  changePassword,
  deleteUser,
  validateUser,
}