const jwt = require('jsonwebtoken')
const { sendError, ERROR_CODES } = require('../utils/errors')

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret'

function authenticateToken(req, res, next) {
  const token = req.cookies.token

  if (!token) {
    return sendError(res, 401, ERROR_CODES.NO_TOKEN, 'No token provided')
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return sendError(res, 403, ERROR_CODES.INVALID_TOKEN, 'Invalid or expired token')
    }
    req.user = decoded
    next()
  })
}

module.exports = authenticateToken