jest.mock('../../lib/prisma', () => require('../mocks/prisma'));

const request = require('supertest');
const { makeTestApp } = require('../mocks/makeTestApp');
const prismaMock = require('../mocks/prisma');
const authenticateToken = require('../../middleware/authMiddleware');
const requireProPlan = require('../../middleware/requireProPlan');
const {
    getChats,
    createChat,
    updateChat,
    deleteChat,
} = require('../../controllers/chat.controller');
const {
    makeUser,
    makeProUser,
    makeChat,
    makeAuthCookie,
} = require('../mocks/factories');

function makeApp() {
    return makeTestApp((app) => {
        app.get('/chats', authenticateToken, requireProPlan, getChats);
        app.post('/chats', authenticateToken, requireProPlan, createChat);
        app.put('/chats/:id', authenticateToken, requireProPlan, updateChat);
        app.delete('/chats/:id', authenticateToken, requireProPlan, deleteChat);
    });
}

// ── GET /chats ────────────────────────────────────────────────────────────────

describe('GET /chats', () => {
    const app = makeApp();
    const user = makeProUser();

    it('devuelve 401 sin autenticación', async () => {
        const res = await request(app).get('/chats');
        expect(res.status).toBe(401);
    });

    it('devuelve 403 con usuario free sin trial', async () => {
        const freeUser = require('../mocks/factories').makeExpiredTrialUser();
        prismaMock.user.findUnique.mockResolvedValue(freeUser);
        const res = await request(app)
            .get('/chats')
            .set('Cookie', makeAuthCookie(freeUser));
        expect(res.status).toBe(403);
    });

    it('devuelve 200 con array de chats del usuario', async () => {
        const chats = [makeChat({ userId: user.id }), makeChat({ id: 'clchat2', userId: user.id })];
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.chat.findMany.mockResolvedValue(chats);

        const res = await request(app)
            .get('/chats')
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    it('devuelve un array vacío si el usuario no tiene chats', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.chat.findMany.mockResolvedValue([]);

        const res = await request(app)
            .get('/chats')
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(200);
        expect(res.body).toEqual([]);
    });

    it('solo devuelve los chats del usuario autenticado', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.chat.findMany.mockResolvedValue([]);

        await request(app)
            .get('/chats')
            .set('Cookie', makeAuthCookie(user));

        expect(prismaMock.chat.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { userId: user.id },
            })
        );
    });
});

// ── POST /chats ───────────────────────────────────────────────────────────────

describe('POST /chats', () => {
    const app = makeApp();
    const user = makeProUser();

    const validPayload = {
        chatId: 'chatgpt-conv-id-abc123',
        title: 'Mi conversación',
        favorite: false,
        archived: false,
        folderId: null,
    };

    it('devuelve 401 sin autenticación', async () => {
        const res = await request(app).post('/chats').send(validPayload);
        expect(res.status).toBe(401);
    });

    it('devuelve 201 y el chat creado', async () => {
        const newChat = makeChat({ userId: user.id, ...validPayload });
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.chat.create.mockResolvedValue(newChat);

        const res = await request(app)
            .post('/chats')
            .set('Cookie', makeAuthCookie(user))
            .send(validPayload);

        expect(res.status).toBe(201);
        expect(res.body.chatId).toBe(validPayload.chatId);
    });

    it('crea el chat asociado al usuario autenticado', async () => {
        const newChat = makeChat({ userId: user.id });
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.chat.create.mockResolvedValue(newChat);

        await request(app)
            .post('/chats')
            .set('Cookie', makeAuthCookie(user))
            .send(validPayload);

        expect(prismaMock.chat.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ userId: user.id }),
            })
        );
    });
});

// ── PUT /chats/:id ────────────────────────────────────────────────────────────

describe('PUT /chats/:id', () => {
    const app = makeApp();
    const user = makeProUser();
    const chat = makeChat({ userId: user.id });

    it('devuelve 401 sin autenticación', async () => {
        const res = await request(app).put(`/chats/${chat.id}`).send({ title: 'Nuevo título' });
        expect(res.status).toBe(401);
    });

    it('devuelve 403 si el chat pertenece a otro usuario', async () => {
        const otherUserChat = makeChat({ userId: 'clotheruserid1234567890ab' });
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.chat.findUnique.mockResolvedValue(otherUserChat);

        const res = await request(app)
            .put(`/chats/${otherUserChat.id}`)
            .set('Cookie', makeAuthCookie(user))
            .send({ title: 'Intento de hackeo' });

        expect(res.status).toBe(403);
    });

    it('devuelve 200 y el chat actualizado', async () => {
        const updatedChat = { ...chat, title: 'Título actualizado' };
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.chat.findUnique.mockResolvedValue(chat);
        prismaMock.chat.update.mockResolvedValue(updatedChat);

        const res = await request(app)
            .put(`/chats/${chat.id}`)
            .set('Cookie', makeAuthCookie(user))
            .send({ title: 'Título actualizado' });

        expect(res.status).toBe(200);
        expect(res.body.title).toBe('Título actualizado');
    });
});

// ── DELETE /chats/:id ─────────────────────────────────────────────────────────

describe('DELETE /chats/:id', () => {
    const app = makeApp();
    const user = makeProUser();
    const chat = makeChat({ userId: user.id });

    it('devuelve 401 sin autenticación', async () => {
        const res = await request(app).delete(`/chats/${chat.id}`);
        expect(res.status).toBe(401);
    });

    it('devuelve 403 si el chat pertenece a otro usuario', async () => {
        const otherUserChat = makeChat({ userId: 'clotheruserid1234567890ab' });
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.chat.findUnique.mockResolvedValue(otherUserChat);

        const res = await request(app)
            .delete(`/chats/${otherUserChat.id}`)
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(403);
    });

    it('devuelve 200 y elimina el chat correctamente', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.chat.findUnique.mockResolvedValue(chat);
        prismaMock.chat.delete.mockResolvedValue(chat);

        const res = await request(app)
            .delete(`/chats/${chat.id}`)
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(200);
        expect(prismaMock.chat.delete).toHaveBeenCalledWith({ where: { id: chat.id } });
    });
});