jest.mock('../../lib/prisma', () => require('../mocks/prisma'));

const request = require('supertest');
const { makeTestApp } = require('../mocks/makeTestApp');
const prismaMock = require('../mocks/prisma');
const authenticateToken = require('../../middleware/authMiddleware');
const requireProPlan = require('../../middleware/requireProPlan');
const {
    getMessages,
    createMessage,
    deleteMessage,
} = require('../../controllers/message.controller');
const {
    makeProUser,
    makeStarredMessage,
    makeAuthCookie,
} = require('../mocks/factories');

function makeApp() {
    return makeTestApp((app) => {
        app.get('/messages', authenticateToken, requireProPlan, getMessages);
        app.post('/messages', authenticateToken, requireProPlan, createMessage);
        app.delete('/messages/:id', authenticateToken, requireProPlan, deleteMessage);
    });
}

// ── GET /messages ─────────────────────────────────────────────────────────────

describe('GET /messages', () => {
    const app = makeApp();
    const user = makeProUser();

    it('devuelve 401 sin autenticación', async () => {
        const res = await request(app).get('/messages?chatId=abc123');
        expect(res.status).toBe(401);
    });

    it('devuelve 400 si falta el parámetro chatId', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        const res = await request(app)
            .get('/messages')
            .set('Cookie', makeAuthCookie(user));
        expect(res.status).toBe(400);
    });

    it('devuelve 200 con los mensajes del chat', async () => {
        const chatId = 'chatgpt-conv-id-abc123';
        const messages = [
            makeStarredMessage({ userId: user.id, chatId }),
            makeStarredMessage({ id: 'clmsg2', userId: user.id, chatId, messageIndex: 1 }),
        ];
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.starredMessage.findMany.mockResolvedValue(messages);

        const res = await request(app)
            .get(`/messages?chatId=${chatId}`)
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(200);
        expect(res.body).toHaveLength(2);
    });

    it('filtra los mensajes por userId y chatId', async () => {
        const chatId = 'chatgpt-conv-id-abc123';
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.starredMessage.findMany.mockResolvedValue([]);

        await request(app)
            .get(`/messages?chatId=${chatId}`)
            .set('Cookie', makeAuthCookie(user));

        expect(prismaMock.starredMessage.findMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({ chatId, userId: user.id }),
            })
        );
    });
});

// ── POST /messages ────────────────────────────────────────────────────────────

describe('POST /messages', () => {
    const app = makeApp();
    const user = makeProUser();

    const validPayload = {
        chatId: 'chatgpt-conv-id-abc123',
        messageIndex: 3,
        text: 'Este es el mensaje que quiero guardar.',
    };

    it('devuelve 401 sin autenticación', async () => {
        const res = await request(app).post('/messages').send(validPayload);
        expect(res.status).toBe(401);
    });

    it('devuelve 400 si falta chatId', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        const res = await request(app)
            .post('/messages')
            .set('Cookie', makeAuthCookie(user))
            .send({ messageIndex: 3, text: 'Hola' });
        expect(res.status).toBe(400);
    });

    it('devuelve 400 si falta messageIndex', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        const res = await request(app)
            .post('/messages')
            .set('Cookie', makeAuthCookie(user))
            .send({ chatId: 'abc', text: 'Hola' });
        expect(res.status).toBe(400);
    });

    it('devuelve 400 si el texto está vacío', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        const res = await request(app)
            .post('/messages')
            .set('Cookie', makeAuthCookie(user))
            .send({ chatId: 'abc', messageIndex: 0, text: '   ' });
        expect(res.status).toBe(400);
    });

    it('devuelve 201 y el mensaje creado correctamente', async () => {
        const newMessage = makeStarredMessage({ userId: user.id, ...validPayload });
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.starredMessage.create.mockResolvedValue(newMessage);

        const res = await request(app)
            .post('/messages')
            .set('Cookie', makeAuthCookie(user))
            .send(validPayload);

        expect(res.status).toBe(201);
        expect(res.body.chatId).toBe(validPayload.chatId);
        expect(res.body.messageIndex).toBe(validPayload.messageIndex);
    });

    it('devuelve 409 si el mensaje ya estaba destacado (P2002)', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        const duplicateError = new Error('Unique constraint failed');
        duplicateError.code = 'P2002';
        prismaMock.starredMessage.create.mockRejectedValue(duplicateError);

        const res = await request(app)
            .post('/messages')
            .set('Cookie', makeAuthCookie(user))
            .send(validPayload);

        expect(res.status).toBe(409);
    });
});

// ── DELETE /messages/:id ──────────────────────────────────────────────────────

describe('DELETE /messages/:id', () => {
    const app = makeApp();
    const user = makeProUser();
    const message = makeStarredMessage({ userId: user.id });

    it('devuelve 401 sin autenticación', async () => {
        const res = await request(app).delete(`/messages/${message.id}`);
        expect(res.status).toBe(401);
    });

    it('devuelve 404 si el mensaje no existe', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.starredMessage.findUnique.mockResolvedValue(null);

        const res = await request(app)
            .delete(`/messages/${message.id}`)
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(404);
    });

    it('devuelve 404 si el mensaje pertenece a otro usuario', async () => {
        const otherMessage = makeStarredMessage({ userId: 'clotheruserid1234567890ab' });
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.starredMessage.findUnique.mockResolvedValue(otherMessage);

        const res = await request(app)
            .delete(`/messages/${otherMessage.id}`)
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(404);
    });

    it('devuelve 200 y elimina el mensaje correctamente', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.starredMessage.findUnique.mockResolvedValue(message);
        prismaMock.starredMessage.delete.mockResolvedValue(message);

        const res = await request(app)
            .delete(`/messages/${message.id}`)
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(200);
        expect(prismaMock.starredMessage.delete).toHaveBeenCalledWith({ where: { id: message.id } });
    });
});