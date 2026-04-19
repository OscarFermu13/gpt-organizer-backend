jest.mock('../../lib/prisma', () => require('../mocks/prisma'));

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { makeTestApp } = require('../mocks/makeTestApp');
const prismaMock = require('../mocks/prisma');
const { makeUser, makeAuthCookie, makeJwt } = require('../mocks/factories');
const authenticateToken = require('../../middleware/authMiddleware');

const JWT_SECRET = process.env.JWT_SECRET;

function makeApp() {
    return makeTestApp((app) => {
        app.get('/protected', authenticateToken, (req, res) => {
            res.json({ userId: req.user.userId });
        });
    });
}

// ── Sin token ─────────────────────────────────────────────────────────────────

describe('authenticateToken — sin token', () => {
    const app = makeApp();

    it('devuelve 401 si no hay cookie', async () => {
        const res = await request(app).get('/protected');
        expect(res.status).toBe(401);
        expect(res.body.error).toBeDefined();
    });
});

// ── Token inválido ────────────────────────────────────────────────────────────

describe('authenticateToken — token inválido', () => {
    const app = makeApp();

    it('devuelve 403 con token aleatorio', async () => {
        const res = await request(app)
            .get('/protected')
            .set('Cookie', 'token=not-a-jwt-at-all');
        expect(res.status).toBe(403);
    });

    it('devuelve 403 con token firmado con secret incorrecto', async () => {
        const badToken = jwt.sign({ userId: 'cluser123456789abcdefgh' }, 'wrong-secret');
        const res = await request(app)
            .get('/protected')
            .set('Cookie', `token=${badToken}`);
        expect(res.status).toBe(403);
    });

    it('devuelve 403 con token expirado', async () => {
        const expiredToken = jwt.sign(
            { userId: 'cluser123456789abcdefgh' },
            JWT_SECRET,
            { expiresIn: '-1s' }
        );
        const res = await request(app)
            .get('/protected')
            .set('Cookie', `token=${expiredToken}`);
        expect(res.status).toBe(403);
    });
});

// ── Token válido ──────────────────────────────────────────────────────────────

describe('authenticateToken — token válido', () => {
    const app = makeApp();
    const user = makeUser();

    it('llama a next() y adjunta req.user si el token es correcto', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        const res = await request(app)
            .get('/protected')
            .set('Cookie', makeAuthCookie(user));
        expect(res.status).toBe(200);
        expect(res.body.userId).toBe(user.id);
    });

    it('NO acepta el token por query string', async () => {
        const token = makeJwt(user);
        const res = await request(app).get(`/protected?token=${token}`);
        expect(res.status).toBe(401);
    });
});