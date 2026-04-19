const prisma = require('../lib/prisma')
const { sendError, ERROR_CODES } = require('../utils/errors')

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

  try {
    const folder = await prisma.folder.create({
      data: { userId, name, parentId, color },
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
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder || folder.userId !== userId) {
      return sendError(res, 403, ERROR_CODES.ACCESS_DENIED, 'Unauthorized')
    }

    async function getAllSubfolderIds(folderId) {
      const children = await prisma.folder.findMany({
        where: { parentId: folderId },
        select: { id: true }
      });

      const subfolderIds = [];
      for (const child of children) {
        subfolderIds.push(child.id);
        const nestedIds = await getAllSubfolderIds(child.id);
        subfolderIds.push(...nestedIds);
      }
      return subfolderIds;
    }

    const allFolderIds = [folder.id, ...(await getAllSubfolderIds(folder.id))];

    await prisma.chat.deleteMany({
      where: { folderId: { in: allFolderIds } }
    });

    await prisma.folder.deleteMany({
      where: { id: { in: allFolderIds } }
    });

    res.json({ message: 'Folder and related content deleted' });
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