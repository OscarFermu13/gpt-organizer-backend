const prisma = require('../lib/prisma')

// GET /tags - solo tags del usuario autenticado
async function getTags(req, res) {
    const userId = req.user.userId
    try {
        const tags = await prisma.tag.findMany({
            where: { userId },
        })
        res.json(tags)
    } catch (error) {
        console.error('Error fetching tags:', error)
        res.status(500).json({ error: 'Error fetching tags' })
    }
}

// POST /tags - crear tag asociado al usuario
async function createTag(req, res) {
    const { name } = req.body
    const userId = req.user.userId
    try {
        const tag = await prisma.tag.create({
            data: { name, userId },
        })
        res.status(201).json(tag)
    } catch (error) {
        console.error('Error creating tag:', error)
        res.status(500).json({ error: 'Error creating tag' })
    }
}

// PUT /tags/:id - actualizar solo si el tag es del usuario
async function updateTag(req, res) {
    const { id } = req.params
    const { name } = req.body
    const userId = req.user.userId

    try {
        const tag = await prisma.tag.findUnique({ where: { id } })
        if (!tag || tag.userId !== userId) {
            return res.status(403).json({ error: 'Unauthorized' })
        }

        const updatedTag = await prisma.tag.update({
            where: { id },
            data: { name },
        })

        res.json(updatedTag)
    } catch (error) {
        console.error('Error updating tag:', error)
        res.status(500).json({ error: 'Error updating tag' })
    }
}

// DELETE /tags/:id - eliminar solo si es del usuario
async function deleteTag(req, res) {
    const { id } = req.params
    const userId = req.user.userId

    try {
        const tag = await prisma.tag.findUnique({ where: { id } })

        if (!tag || tag.userId !== userId) return res.status(403).json({ error: 'Unauthorized' })

        await prisma.tag.delete({ where: { id } })
        res.json({ message: 'Tag deleted' })
    } catch (error) {
        console.error('Error deleting tag:', error)
        res.status(500).json({ error: 'Error deleting tag' })
    }
}

module.exports = {
    getTags,
    createTag,
    updateTag,
    deleteTag,
}
