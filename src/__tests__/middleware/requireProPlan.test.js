jest.mock('../../lib/prisma', () => require('../mocks/prisma'));

const request = require('supertest');
const { makeTestApp } = require('../mocks/makeTestApp');
const prismaMock = require('../mocks/prisma');
const authenticateToken = require('../../middleware/authMiddleware');
const requireProPlan = require('../../middleware/requireProPlan');
const {
    makeUser,
    makeProUser,
    makeExpiredTrialUser,
    makeAuthCookie,
} = require('../mocks/factories');

function makeApp() {
    return makeTestApp((app) => {
        app.get('/pro-only', authenticateToken, requireProPlan, (req, res) => {
            res.json({ ok: true });
        });
    });
}

// ── Usuario Pro ───────────────────────────────────────────────────────────────

describe('requireProPlan — usuario pro', () => {
    const app = makeApp();
    const user = makeProUser();

    it('permite el acceso a usuarios con plan pro', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        const res = await request(app)
            .get('/pro-only')
            .set('Cookie', makeAuthCookie(user));
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });
});

// ── Trial activo ──────────────────────────────────────────────────────────────

describe('requireProPlan — trial activo', () => {
    const app = makeApp();
    const user = makeUser(); // trialEndsAt en el futuro por defecto

    it('permite el acceso a usuarios free con trial vigente', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        const res = await request(app)
            .get('/pro-only')
            .set('Cookie', makeAuthCookie(user));
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
    });
});

// ── Trial expirado ────────────────────────────────────────────────────────────

describe('requireProPlan — trial expirado', () => {
    const app = makeApp();
    const user = makeExpiredTrialUser();

    it('bloquea el acceso a usuarios free con trial expirado', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        const res = await request(app)
            .get('/pro-only')
            .set('Cookie', makeAuthCookie(user));
        expect(res.status).toBe(403);
        expect(res.body.error).toBeDefined();
    });
});

// ── Sin autenticación ─────────────────────────────────────────────────────────

describe('requireProPlan — sin token', () => {
    const app = makeApp();

    it('devuelve 401 si no hay token (authMiddleware corta antes)', async () => {
        const res = await request(app).get('/pro-only');
        expect(res.status).toBe(401);
    });
});

// ── Usuario inexistente ───────────────────────────────────────────────────────

describe('requireProPlan — usuario no encontrado en DB', () => {
    const app = makeApp();
    const user = makeUser();

    it('devuelve 403 si el userId del token no existe en la base de datos', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(null);
        const res = await request(app)
            .get('/pro-only')
            .set('Cookie', makeAuthCookie(user));
        expect(res.status).toBe(403);
    });
});