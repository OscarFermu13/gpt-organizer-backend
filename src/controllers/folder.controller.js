const prisma = require('../lib/prisma')
const { sendError, ERROR_CODES } = require('../utils/errors')
const { isValidId, isValidString, isValidHexColor } = require('../utils/validate')

async function getFolders(req, res) {
  const userId = req.user.userId

  try {
    const folders = await prisma.folder.findMany({
      where: { userId },
      include: {
        children: true,
        chats: true,
      },
    })
    res.json(folders)
  } catch (error) {
    console.error('getFolders error:', error.message)
    return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error fetching folders')
  }
}

async function createFolder(req, res) {
  const { name, parentId, color } = req.body
  const userId = req.user.userId

  if (!isValidString(name, { maxLength: 100 })) {
    return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid or missing folder name')
  }
  if (parentId !== undefined && parentId !== null && !isValidId(parentId)) {
    return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid parentId format')
  }
  if (color !== undefined && color !== null && !isValidHexColor(color)) {
    return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Color must be a valid hex value (e.g. #fff or #3b82f6)')
  }

  try {
    const folder = await prisma.folder.create({
      data: { userId, name, parentId: parentId ?? null, color: color ?? null },
    })
    res.status(201).json(folder)
  } catch (error) {
    console.error('createFolder error:', error.message)
    return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error creating folder')
  }
}

async function updateFolder(req, res) {
  const { id } = req.params
  const { name, color, parentId } = req.body
  const userId = req.user.userId

  if (!isValidId(id)) {
    return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid folder ID format')
  }
  if (name !== undefined && !isValidString(name, { maxLength: 100 })) {
    return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid folder name')
  }
  if (parentId !== undefined && parentId !== null && !isValidId(parentId)) {
    return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid parentId format')
  }
  if (color !== undefined && color !== null && !isValidHexColor(color)) {
    return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Color must be a valid hex value (e.g. #fff or #3b82f6)')
  }

  try {
    const folder = await prisma.folder.findUnique({ where: { id } })
    if (!folder || folder.userId !== userId) {
      return sendError(res, 403, ERROR_CODES.ACCESS_DENIED, 'Unauthorized')
    }

    const updated = await prisma.folder.update({
      where: { id },
      data: { name, parentId, color },
    })
    res.json(updated)
  } catch (error) {
    console.error('updateFolder error:', error.message)
    return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error updating folder')
  }
}

async function deleteFolder(req, res) {
  const { id } = req.params
  const userId = req.user.userId

  if (!isValidId(id)) {
    return sendError(res, 400, ERROR_CODES.INVALID_PAYLOAD, 'Invalid folder ID format')
  }

  try {
    const folder = await prisma.folder.findUnique({ where: { id } })
    if (!folder || folder.userId !== userId) {
      return sendError(res, 403, ERROR_CODES.ACCESS_DENIED, 'Unauthorized')
    }

    async function getAllSubfolderIds(folderId) {
      const children = await prisma.folder.findMany({
        where: { parentId: folderId },
        select: { id: true }
      })
      const subfolderIds = []
      for (const child of children) {
        subfolderIds.push(child.id)
        const nestedIds = await getAllSubfolderIds(child.id)
        subfolderIds.push(...nestedIds)
      }
      return subfolderIds
    }

    const allFolderIds = [folder.id, ...(await getAllSubfolderIds(folder.id))]

    const chatIds = await prisma.chat.findMany({
      where: { folderId: { in: allFolderIds } },
      select: { chatId: true },
    }).then((chats) => chats.map((c) => c.chatId))

    if (chatIds.length > 0) {
      await prisma.starredMessage.deleteMany({
        where: { chatId: { in: chatIds } },
      })
    }

    await prisma.chat.deleteMany({
      where: { folderId: { in: allFolderIds } },
    })

    await prisma.folder.deleteMany({
      where: { id: { in: allFolderIds } },
    })

    res.json({ message: 'Folder and related content deleted' })
  } catch (error) {
    console.error('deleteFolder error:', error.message)
    return sendError(res, 500, ERROR_CODES.INTERNAL_ERROR, 'Error deleting folder')
  }
}

module.exports = {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
}