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
    makeChat,
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
        const folders = [makeFolder({ userId: user.id }), makeFolder({ id: 'clfolder2', userId: user.id })];
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.folder.findMany.mockResolvedValue(folders);

        const res = await request(app)
            .get('/folders')
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    it('solo devuelve carpetas del usuario autenticado', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.folder.findMany.mockResolvedValue([]);

        await request(app)
            .get('/folders')
            .set('Cookie', makeAuthCookie(user));

        expect(prismaMock.folder.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: user.id },
            })
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

    it('devuelve 201 y la carpeta creada', async () => {
        const newFolder = makeFolder({ userId: user.id, name: 'Nueva Carpeta' });
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.folder.create.mockResolvedValue(newFolder);

        const res = await request(app)
            .post('/folders')
            .set('Cookie', makeAuthCookie(user))
            .send({ name: 'Nueva Carpeta', color: '#3b82f6' });

        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Nueva Carpeta');
    });

    it('asocia la carpeta al usuario autenticado', async () => {
        const newFolder = makeFolder({ userId: user.id });
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.folder.create.mockResolvedValue(newFolder);

        await request(app)
            .post('/folders')
            .set('Cookie', makeAuthCookie(user))
            .send({ name: 'Mi Carpeta' });

        expect(prismaMock.folder.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ userId: user.id }),
            })
        );
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

    it('devuelve 403 si la carpeta pertenece a otro usuario', async () => {
        const otherFolder = makeFolder({ userId: 'clotheruserid1234567890ab' });
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.folder.findUnique.mockResolvedValue(otherFolder);

        const res = await request(app)
            .put(`/folders/${otherFolder.id}`)
            .set('Cookie', makeAuthCookie(user))
            .send({ name: 'Intento' });

        expect(res.status).toBe(403);
    });

    it('devuelve 200 y la carpeta actualizada', async () => {
        const updatedFolder = { ...folder, name: 'Carpeta Actualizada', color: '#ef4444' };
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.folder.findUnique.mockResolvedValue(folder);
        prismaMock.folder.update.mockResolvedValue(updatedFolder);

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

    it('devuelve 403 si la carpeta pertenece a otro usuario', async () => {
        const otherFolder = makeFolder({ userId: 'clotheruserid1234567890ab' });
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.folder.findUnique.mockResolvedValue(otherFolder);

        const res = await request(app)
            .delete(`/folders/${otherFolder.id}`)
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(403);
    });

    it('elimina la carpeta raíz y sus subcarpetas', async () => {
        const child1 = makeFolder({ id: 'clfolder_child_001234abcde', userId: user.id, parentId: folder.id });
        const child2 = makeFolder({ id: 'clfolder_child_002234abcde', userId: user.id, parentId: child1.id });

        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.folder.findUnique.mockResolvedValue(folder);

        prismaMock.folder.findMany
            .mockResolvedValueOnce([child1])
            .mockResolvedValueOnce([child2])
            .mockResolvedValueOnce([]);

        prismaMock.chat.deleteMany.mockResolvedValue({ count: 0 });
        prismaMock.folder.deleteMany.mockResolvedValue({ count: 3 });

        const res = await request(app)
            .delete(`/folders/${folder.id}`)
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(200);
        expect(prismaMock.chat.deleteMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    folderId: expect.objectContaining({ in: expect.any(Array) }),
                }),
            })
        );
    });

    it('devuelve 200 al eliminar una carpeta vacía sin subcarpetas', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.folder.findUnique.mockResolvedValue(folder);
        prismaMock.folder.findMany.mockResolvedValue([]);
        prismaMock.chat.deleteMany.mockResolvedValue({ count: 0 });
        prismaMock.folder.deleteMany.mockResolvedValue({ count: 1 });

        const res = await request(app)
            .delete(`/folders/${folder.id}`)
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(200);
        expect(res.body.message).toBeDefined();
    });
});