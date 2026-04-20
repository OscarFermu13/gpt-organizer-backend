jest.mock('../../lib/prisma', () => require('../mocks/prisma'));

const request = require('supertest');
const { makeTestApp } = require('../mocks/makeTestApp');
const prismaMock = require('../mocks/prisma');
const authenticateToken = require('../../middleware/authMiddleware');
const requireProPlan = require('../../middleware/requireProPlan');
const {
    getFolders,
    createFolder,
    updateFolder,
    deleteFolder,
} = require('../../controllers/folder.controller');
const {
    makeProUser,
    makeFolder,
    makeAuthCookie,
} = require('../mocks/factories');

function makeApp() {
    return makeTestApp((app) => {
        app.get('/folders', authenticateToken, requireProPlan, getFolders);
        app.post('/folders', authenticateToken, requireProPlan, createFolder);
        app.put('/folders/:id', authenticateToken, requireProPlan, updateFolder);
        app.delete('/folders/:id', authenticateToken, requireProPlan, deleteFolder);
    });
}

// ── GET /folders ──────────────────────────────────────────────────────────────

describe('GET /folders', () => {
    const app = makeApp();
    const user = makeProUser();

    it('devuelve 401 sin autenticación', async () => {
        const res = await request(app).get('/folders');
        expect(res.status).toBe(401);
    });

    it('devuelve 200 con array de carpetas del usuario', async () => {
        const folders = [makeFolder({ userId: user.id }), makeFolder({ id: 'clfolder2abcdefghijklmno', userId: user.id })];
        prismaMock.user.findUnique.mockResolvedValueOnce(user);
        prismaMock.folder.findMany.mockResolvedValueOnce(folders);

        const res = await request(app)
            .get('/folders')
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    it('solo devuelve carpetas del usuario autenticado', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(user);
        prismaMock.folder.findMany.mockResolvedValueOnce([]);

        await request(app)
            .get('/folders')
            .set('Cookie', makeAuthCookie(user));

        expect(prismaMock.folder.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ where: { userId: user.id } })
        );
    });
});

// ── POST /folders ─────────────────────────────────────────────────────────────

describe('POST /folders', () => {
    const app = makeApp();
    const user = makeProUser();

    it('devuelve 401 sin autenticación', async () => {
        const res = await request(app).post('/folders').send({ name: 'Nueva Carpeta' });
        expect(res.status).toBe(401);
    });

    it('devuelve 400 si falta el nombre', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(user);
        const res = await request(app)
            .post('/folders')
            .set('Cookie', makeAuthCookie(user))
            .send({ color: '#3b82f6' });
        expect(res.status).toBe(400);
    });

    it('devuelve 400 si el nombre está vacío', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(user);
        const res = await request(app)
            .post('/folders')
            .set('Cookie', makeAuthCookie(user))
            .send({ name: '   ' });
        expect(res.status).toBe(400);
    });

    it('devuelve 400 si el color no es un hex válido', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(user);
        const res = await request(app)
            .post('/folders')
            .set('Cookie', makeAuthCookie(user))
            .send({ name: 'Mi Carpeta', color: 'red' });
        expect(res.status).toBe(400);
    });

    it('devuelve 400 si parentId no tiene formato cuid', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(user);
        const res = await request(app)
            .post('/folders')
            .set('Cookie', makeAuthCookie(user))
            .send({ name: 'Mi Carpeta', parentId: 'not-a-cuid' });
        expect(res.status).toBe(400);
    });

    it('devuelve 201 y la carpeta creada', async () => {
        const newFolder = makeFolder({ userId: user.id, name: 'Nueva Carpeta' });
        prismaMock.user.findUnique.mockResolvedValueOnce(user);
        prismaMock.folder.create.mockResolvedValueOnce(newFolder);

        const res = await request(app)
            .post('/folders')
            .set('Cookie', makeAuthCookie(user))
            .send({ name: 'Nueva Carpeta', color: '#3b82f6' });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Nueva Carpeta');
    });

    it('acepta color en formato corto #fff', async () => {
        const newFolder = makeFolder({ userId: user.id, color: '#fff' });
        prismaMock.user.findUnique.mockResolvedValueOnce(user);
        prismaMock.folder.create.mockResolvedValueOnce(newFolder);

        const res = await request(app)
            .post('/folders')
            .set('Cookie', makeAuthCookie(user))
            .send({ name: 'Carpeta', color: '#fff' });

        expect(res.status).toBe(201);
    });
});

// ── PUT /folders/:id ──────────────────────────────────────────────────────────

describe('PUT /folders/:id', () => {
    const app = makeApp();
    const user = makeProUser();
    const folder = makeFolder({ userId: user.id });

    it('devuelve 401 sin autenticación', async () => {
        const res = await request(app).put(`/folders/${folder.id}`).send({ name: 'Nuevo nombre' });
        expect(res.status).toBe(401);
    });

    it('devuelve 400 si el ID no tiene formato cuid', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(user);
        const res = await request(app)
            .put('/folders/not-a-valid-id')
            .set('Cookie', makeAuthCookie(user))
            .send({ name: 'Nombre' });
        expect(res.status).toBe(400);
    });

    it('devuelve 403 si la carpeta pertenece a otro usuario', async () => {
        const otherFolder = makeFolder({ userId: 'clotheruserid1234567890ab' });
        prismaMock.user.findUnique.mockResolvedValueOnce(user);
        prismaMock.folder.findUnique.mockResolvedValueOnce(otherFolder);

        const res = await request(app)
            .put(`/folders/${otherFolder.id}`)
            .set('Cookie', makeAuthCookie(user))
            .send({ name: 'Intento' });

        expect(res.status).toBe(403);
    });

    it('devuelve 200 y la carpeta actualizada', async () => {
        const updatedFolder = { ...folder, name: 'Carpeta Actualizada', color: '#ef4444' };
        prismaMock.user.findUnique.mockResolvedValueOnce(user);
        prismaMock.folder.findUnique.mockResolvedValueOnce(folder);
        prismaMock.folder.update.mockResolvedValueOnce(updatedFolder);

        const res = await request(app)
            .put(`/folders/${folder.id}`)
            .set('Cookie', makeAuthCookie(user))
            .send({ name: 'Carpeta Actualizada', color: '#ef4444' });

        expect(res.status).toBe(200);
        expect(res.body.name).toBe('Carpeta Actualizada');
    });
});

// ── DELETE /folders/:id ───────────────────────────────────────────────────────

describe('DELETE /folders/:id', () => {
    const app = makeApp();
    const user = makeProUser();
    const folder = makeFolder({ userId: user.id });

    it('devuelve 401 sin autenticación', async () => {
        const res = await request(app).delete(`/folders/${folder.id}`);
        expect(res.status).toBe(401);
    });

    it('devuelve 400 si el ID no tiene formato cuid', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(user);
        const res = await request(app)
            .delete('/folders/not-a-valid-id')
            .set('Cookie', makeAuthCookie(user));
        expect(res.status).toBe(400);
    });

    it('devuelve 403 si la carpeta pertenece a otro usuario', async () => {
        const otherFolder = makeFolder({ userId: 'clotheruserid1234567890ab' });
        prismaMock.user.findUnique.mockResolvedValueOnce(user);
        prismaMock.folder.findUnique.mockResolvedValueOnce(otherFolder);

        const res = await request(app)
            .delete(`/folders/${otherFolder.id}`)
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(403);
    });

    it('devuelve 200 al eliminar una carpeta sin subcarpetas ni chats', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(user);
        prismaMock.folder.findUnique.mockResolvedValueOnce(folder);
        prismaMock.folder.findMany.mockResolvedValueOnce([]); // sin hijos
        prismaMock.chat.findMany.mockResolvedValueOnce([]);   // sin chats
        prismaMock.chat.deleteMany.mockResolvedValueOnce({ count: 0 });
        prismaMock.folder.deleteMany.mockResolvedValueOnce({ count: 1 });

        const res = await request(app)
            .delete(`/folders/${folder.id}`)
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(200);
        expect(res.body.message).toBeDefined();
    });


    it('elimina starred messages de los chats de la carpeta antes de borrar los chats', async () => {
        const chatInFolder = {
            id: 'clchat123456789abcdefgh',
            chatId: 'chatgpt-conv-id-abc123',
            userId: user.id,
            folderId: folder.id,
        };

        prismaMock.user.findUnique.mockResolvedValueOnce(user);
        prismaMock.folder.findUnique.mockResolvedValueOnce(folder);
        prismaMock.folder.findMany.mockResolvedValueOnce([]);
        prismaMock.chat.findMany.mockResolvedValueOnce([chatInFolder]);
        prismaMock.starredMessage.deleteMany.mockResolvedValueOnce({ count: 3 });
        prismaMock.chat.deleteMany.mockResolvedValueOnce({ count: 1 });
        prismaMock.folder.deleteMany.mockResolvedValueOnce({ count: 1 });

        const res = await request(app)
            .delete(`/folders/${folder.id}`)
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(200);
        expect(prismaMock.starredMessage.deleteMany).toHaveBeenCalledWith({
            where: { chatId: { in: ['chatgpt-conv-id-abc123'] } },
        });
    });

    it('elimina starred messages de chats en subcarpetas anidadas', async () => {
        const child = makeFolder({ id: 'clfolder_child_001234abcde', userId: user.id, parentId: folder.id });
        const chatInChild = {
            id: 'clchat_child_123456abcde',
            chatId: 'chatgpt-conv-child-456',
            userId: user.id,
            folderId: child.id,
        };

        prismaMock.user.findUnique.mockResolvedValueOnce(user);
        prismaMock.folder.findUnique.mockResolvedValueOnce(folder);
        prismaMock.folder.findMany
            .mockResolvedValueOnce([child])
            .mockResolvedValueOnce([]);
        prismaMock.chat.findMany.mockResolvedValueOnce([chatInChild]);
        prismaMock.starredMessage.deleteMany.mockResolvedValueOnce({ count: 1 });
        prismaMock.chat.deleteMany.mockResolvedValueOnce({ count: 1 });
        prismaMock.folder.deleteMany.mockResolvedValueOnce({ count: 2 });

        const res = await request(app)
            .delete(`/folders/${folder.id}`)
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(200);
        expect(prismaMock.starredMessage.deleteMany).toHaveBeenCalledWith({
            where: { chatId: { in: ['chatgpt-conv-child-456'] } },
        });
    });

    it('no llama a starredMessage.deleteMany si no hay chats en las carpetas', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(user);
        prismaMock.folder.findUnique.mockResolvedValueOnce(folder);
        prismaMock.folder.findMany.mockResolvedValueOnce([]);
        prismaMock.chat.findMany.mockResolvedValueOnce([]);
        prismaMock.chat.deleteMany.mockResolvedValueOnce({ count: 0 });
        prismaMock.folder.deleteMany.mockResolvedValueOnce({ count: 1 });

        await request(app)
            .delete(`/folders/${folder.id}`)
            .set('Cookie', makeAuthCookie(user));

        expect(prismaMock.starredMessage.deleteMany).not.toHaveBeenCalled();
    });
});