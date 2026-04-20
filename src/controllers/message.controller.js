const prisma = require('../lib/prisma')
const { sendError, ERROR_CODES } = require('../utils/errors')
const { isValidId, isValidString, isValidChatId, isValidMessageIndex } = require('../utils/validate')

async function getMessages(req, res) {
    const { chatId } = req.query
    const userId = req.user.userId

    if (!isValidChatId(chatId)) {
        return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid or missing chatId')
    }

    try {
        const messages = await prisma.starredMessage.findMany({
            where: { chatId, userId },
            orderBy: { messageIndex: 'asc' }
        })
        res.json(messages)
    } catch (err) {
        console.error('getMessages error:', err.message)
        return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error fetching messages')
    }
}

async function createMessage(req, res) {
    const { chatId, messageIndex, text } = req.body
    const userId = req.user.userId

    if (!isValidChatId(chatId)) {
        return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid or missing chatId')
    }
    if (!isValidMessageIndex(messageIndex)) {
        return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'messageIndex must be a non-negative integer')
    }
    if (!isValidString(text, { maxLength: 10000 })) {
        return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid or missing text')
    }

    try {
        const starredMessage = await prisma.starredMessage.create({
            data: { chatId, userId, messageIndex, text: text.trim() }
        })
        res.status(201).json(starredMessage)
    } catch (err) {
        if (err.code === 'P2002') {
            return sendError(res, 409, ERROR_CODES.CONFLICT, 'Message already starred')
        }
        console.error('createMessage error:', err.message)
        return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error starring message')
    }
}

async function deleteMessage(req, res) {
    const { id } = req.params
    const userId = req.user.userId

    if (!isValidId(id)) {
        return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid message ID format')
    }

    try {
        const message = await prisma.starredMessage.findUnique({ where: { id } })
        if (!message || message.userId !== userId) {
            return sendError(res, 404, ERROR_CODES.NOT_FOUND, 'Message not found')
        }

        await prisma.starredMessage.delete({ where: { id } })
        res.json({ message: 'Starred message deleted' })
    } catch (err) {
        console.error('deleteMessage error:', err.message)
        return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error deleting message')
    }
}

module.exports = {
    createMessage,
    getMessages,
    deleteMessage
}