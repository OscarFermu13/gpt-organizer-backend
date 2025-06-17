const prisma = require('../lib/prisma');

async function getMessages(req, res) {
    const { chatId } = req.body;
    const userId = req.user.userId;

    if (!chatId) {
        return res.status(400).json({ error: 'chatId is required' });
    }

    try {
        const messages = await prisma.starredMessage.findMany({
            where: { chatId, userId },
            orderBy: { messageIndex: 'asc' }
        });
        res.json(messages);
    } catch (err) {
        console.error('Error listing starred messages:', err);
        res.status(500).json({ error: 'Error fetching messages' });
    }
}

async function createMessage(req, res) {
    const { chatId, messageIndex, text } = req.body;
    const userId = req.user.userId;

    if (!chatId || messageIndex === undefined || !text?.trim()) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const starredMessage = await prisma.starredMessage.create({
            data: {
                chatId,
                userId,
                messageIndex,
                text
            }
        });
        res.status(201).json(starredMessage);
    } catch (err) {
        if (err.code === 'P2002') {
            return res.status(409).json({ error: 'Message already starred' });
        }
        console.error('Error creating starred message:', err);
        res.status(500).json({ error: 'Error starring message' });
    }
}

async function deleteMessage(req, res) {
    const { id } = req.params;
    const userId = req.user.userId;

    try {
        const message = await prisma.starredMessage.findUnique({
            where: { id }
        });

        if (!message || message.userId !== userId) {
            return res.status(404).json({ error: 'Message not found' });
        }

        await prisma.starredMessage.delete({
            where: { id }
        });

        res.json({ message: 'Starred message deleted' });
    } catch (err) {
        console.error('Error deleting starred message:', err);
        res.status(500).json({ error: 'Error deleting message' });
    }
}

module.exports = {
    createMessage,
    getMessages,
    deleteMessage
};
