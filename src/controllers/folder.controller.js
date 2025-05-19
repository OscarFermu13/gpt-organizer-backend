const prisma = require('../lib/prisma')

async function getFolders(req, res) {
    const userId = req.user.userId

    try {
        const folders = await prisma.folder.findMany({
            where: { userId },
            include: {
                children: true, // subcarpetas
            },
        })
        res.json(folders)
    } catch (error) {
        console.error('Error fetching folders:', error)
        res.status(500).json({ error: 'Error fetching folders' })
    }
}

async function createFolder(req, res) {
    const { name, parentId, color } = req.body
    const userId = req.user.userId

    try {
        const folder = await prisma.folder.create({
            data: { userId, name, parentId, color },
        })
        res.status(201).json(folder)
    } catch (error) {
        console.error('Error creating folder:', error)
        res.status(500).json({ error: 'Error creating folder' })
    }
}

async function updateFolder(req, res) {
    const { id } = req.params
    const { name, color, parentId } = req.body
    const userId = req.user.userId

    try {
        const folder = await prisma.folder.findUnique({ where: { id } })
        if (!folder || folder.userId !== userId) return res.status(403).json({ error: 'Unauthorized' })

        const updated = await prisma.folder.update({
            where: { id },
            data: { name, parentId, color },
        })
        res.json(updated)
    } catch (error) {
        console.error('Error updating folder:', error)
        res.status(500).json({ error: 'Error updating folder' })
    }

}

async function deleteFolder(req, res) {
    const { id } = req.params
    const userId = req.user.userId

    try {
        const folder = await prisma.folder.findUnique({ where: { id } })
        if (!folder || folder.userId !== userId) return res.status(403).json({ error: 'Unauthorized' })

        await prisma.folder.delete({ where: { id } })
        res.json({ message: 'Folder deleted' })
    } catch (error) {
        console.error('Error deleting folder:', error)
        res.status(500).json({ error: 'Error deleting folder' })
    }
}

module.exports = {
    getFolders,
    createFolder,
    updateFolder,
    deleteFolder,
}
