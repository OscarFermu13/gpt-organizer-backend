const prisma = require('../lib/prisma')
const { sendError, ERROR_CODES } = require('../utils/errors')
const { isValidId, isValidString, isValidChatId } = require('../utils/validate')

async function getChats(req, res) {
    const userId = req.user.userId

    try {
        const chats = await prisma.chat.findMany({
            where: { userId },
            include: { folder: true },
        })
        res.json(chats)
    } catch (error) {
        console.error('getChats error:', error.message)
        return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error fetching chats')
    }
}

async function createChat(req, res) {
    const { chatId, title, favorite, archived, folderId } = req.body
    const userId = req.user.userId

    if (!isValidChatId(chatId)) {
        return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid or missing chatId')
    }
    if (!isValidString(title, { maxLength: 500 })) {
        return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid or missing title')
    }
    if (folderId !== undefined && folderId !== null && !isValidId(folderId)) {
        return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid folderId format')
    }

    try {
        const chat = await prisma.chat.create({
            data: {
                userId,
                chatId,
                title,
                favorite: Boolean(favorite),
                archived: Boolean(archived),
                folderId: folderId ?? null,
            },
            include: { folder: true },
        })

        res.status(201).json(chat)
    } catch (error) {
        console.error('createChat error:', error.message)
        return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error creating chat')
    }
}

async function updateChat(req, res) {
    const { id } = req.params
    const { title, folderId } = req.body
    const userId = req.user.userId

    if (!isValidId(id)) {
        return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid chat ID format')
    }
    if (title !== undefined && !isValidString(title, { maxLength: 500 })) {
        return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid title')
    }
    if (folderId !== undefined && folderId !== null && !isValidId(folderId)) {
        return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid folderId format')
    }

    try {
        const chat = await prisma.chat.findUnique({ where: { id } })
        if (!chat || chat.userId !== userId) {
            return sendError(res, 403, ERROR_CODES.ACCESS_DENIED, 'Unauthorized')
        }

        const updated = await prisma.chat.update({
            where: { id },
            data: { title, folderId },
        })
        res.json(updated)
    } catch (error) {
        console.error('updateChat error:', error.message)
        return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error updating chat')
    }
}

async function deleteChat(req, res) {
    const { id } = req.params
    const userId = req.user.userId

    if (!isValidId(id)) {
        return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid chat ID format')
    }

    try {
        const chat = await prisma.chat.findUnique({ where: { id } })
        if (!chat || chat.userId !== userId) {
            return sendError(res, 403, ERROR_CODES.ACCESS_DENIED, 'Unauthorized')
        }

        await prisma.chat.delete({ where: { id } })
        res.json({ message: 'Chat deleted' })
    } catch (error) {
        console.error('deleteChat error:', error.message)
        return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error deleting chat')
    }
}

module.exports = {
    getChats,
    createChat,
    updateChat,
    deleteChat,
}