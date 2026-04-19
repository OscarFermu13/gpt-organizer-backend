const prisma = require('../lib/prisma');
const { sendError, ERROR_CODES } = require('../utils/errors')

async function getMessages(req, res) {
    const { chatId } = req.query;
    const userId = req.user.userId;

    if (!chatId) {
        return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'chatId is required')
    }

    try {
        const messages = await prisma.starredMessage.findMany({
            where: { chatId, userId },
            orderBy: { messageIndex: 'asc' }
        });
        res.json(messages);
    } catch (err) {
        console.error('getMessages error:', err.message)
        return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error fetching messages')
    }
}

async function createMessage(req, res) {
    const { chatId, messageIndex, text } = req.body;
    const userId = req.user.userId;

    if (!chatId || messageIndex === undefined || !text?.trim()) {
        return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Missing required fields')
    }

    try {
        const starredMessage = await prisma.starredMessage.create({
            data: { chatId, userId, messageIndex, text }
        });
        res.status(201).json(starredMessage);
    } catch (err) {
        if (err.code === 'P2002') {
            return sendError(res, 409, ERROR_CODES.CONFLICT, 'Message already starred')
        }
        console.error('createMessage error:', err.message)
        return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error starring message')
    }
}

async function deleteMessage(req, res) {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        const message = await prisma.starredMessage.findUnique({ where: { id } });

        if (!message || message.userId !== userId) {
            return sendError(res, 404, ERROR_CODES.NOT_FOUND, 'Message not found')
        }

        await prisma.starredMessage.delete({ where: { id } });
        res.json({ message: 'Starred message deleted' });
    } catch (err) {
        console.error('deleteMessage error:', err.message)
        return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error deleting message')
    }
}

module.exports = {
    createMessage,
    getMessages,
    deleteMessage
};