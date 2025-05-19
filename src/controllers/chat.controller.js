const prisma = require('../lib/prisma')

async function getChats(req, res) {
    const userId = req.user.userId

    try {
        const chats = await prisma.chat.findMany({
            where: { userId },
            include: {
                folder: true,
                tags: true,
            },
        })
        res.json(chats)
    } catch (error) {
        console.error('Error fetching chats:', error)
        res.status(500).json({ error: 'Error fetching chats' })
    }
}

async function createChat(req, res) {
    const { chatId, favorite, archived, folderId, tagIds = [] } = req.body
    const userId = req.user.userId

    try {
        const chat = await prisma.chat.create({
            data: {
                userId,
                chatId,
                favorite,
                archived,
                folderId,
                tags: { connect: tagIds.map(id => ({ id })) },
            },
            include: {
                folder: true,
                tags: true,
            },
        })

        res.status(201).json(chat)
    } catch (error) {
        console.error('Error creating chat:', error)
        res.status(500).json({ error: 'Error creating chat' })
    }
}

async function deleteChat(req, res) {
    const { id } = req.params
    const userId = req.user.userId

    try {
        const chat = await prisma.chat.findUnique({ where: { id } })
        if (!chat || chat.userId !== userId) return res.status(403).json({ error: 'Unauthorized' })

        await prisma.chat.delete({ where: { id } })
        res.json({ message: 'Chat deleted' })
    } catch (error) {
        console.error('Error deleting chat:', error)
        return res.status(500).json({ error: 'Error deleting chat' })
    }
}

module.exports = {
    getChats,
    createChat,
    deleteChat,
}
