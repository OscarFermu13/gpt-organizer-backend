jest.mock('../../lib/prisma', () => require('../mocks/prisma'));
jest.mock('bcrypt');

const request = require('supertest');
const bcrypt = require('bcrypt');
const { makeTestApp } = require('../mocks/makeTestApp');
const prismaMock = require('../mocks/prisma');
const authenticateToken = require('../../middleware/authMiddleware');
const {
    register,
    login,
    logout,
    validateUser,
    changePassword,
    deleteUser,
} = require('../../controllers/auth.controller');
const {
    makeUser,
    makeProUser,
    makeAuthCookie,
} = require('../mocks/factories');

function makeApp() {
    return makeTestApp((app) => {
        app.post('/auth/register', register);
        app.post('/auth/login', login);
        app.post('/auth/logout', logout);
        app.get('/auth/validate', validateUser);
        app.put('/auth/change-password', authenticateToken, changePassword);
        app.delete('/auth/delete-user', authenticateToken, deleteUser);
    });
}

// ── POST /auth/register ───────────────────────────────────────────────────────

describe('POST /auth/register', () => {
    const app = makeApp();

    it('devuelve 400 si falta el email', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send({ password: 'password123' });
        expect(res.status).toBe(400);
    });

    it('devuelve 400 si falta la contraseña', async () => {
        const res = await request(app)
            .post('/auth/register')
            .send({ email: 'test@example.com' });
        expect(res.status).toBe(400);
    });

    it('devuelve 409 si el email ya está registrado', async () => {
        prismaMock.user.findUnique.mockResolvedValue(makeUser());
        const res = await request(app)
            .post('/auth/register')
            .send({ email: 'test@example.com', password: 'password123' });
        expect(res.status).toBe(409);
    });

    it('devuelve 201 y un token al registrar correctamente', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);
        bcrypt.hash.mockResolvedValue('$2b$10$hashedpassword');
        prismaMock.user.create.mockResolvedValue(makeUser());

        const res = await request(app)
            .post('/auth/register')
            .send({ email: 'new@example.com', password: 'password123' });

        expect(res.status).toBe(201);
        expect(res.body.token).toBeDefined();
    });

    it('establece la cookie token al registrar correctamente', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);
        bcrypt.hash.mockResolvedValue('$2b$10$hashedpassword');
        prismaMock.user.create.mockResolvedValue(makeUser());

        const res = await request(app)
            .post('/auth/register')
            .send({ email: 'new@example.com', password: 'password123' });

        const cookies = res.headers['set-cookie'] || [];
        expect(cookies.some((c) => c.startsWith('token='))).toBe(true);
    });

    it('crea al usuario con plan free y trial de 7 días', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);
        bcrypt.hash.mockResolvedValue('$2b$10$hashedpassword');
        prismaMock.user.create.mockResolvedValue(makeUser());

        await request(app)
            .post('/auth/register')
            .send({ email: 'new@example.com', password: 'password123' });

        expect(prismaMock.user.create).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({
                    plan: 'free',
                    trialEndsAt: expect.any(Date),
                }),
            })
        );
    });
});

// ── POST /auth/login ──────────────────────────────────────────────────────────

describe('POST /auth/login', () => {
    const app = makeApp();
    const user = makeUser();

    it('devuelve 401 si el usuario no existe', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);
        const res = await request(app)
            .post('/auth/login')
            .send({ email: 'noexiste@example.com', password: 'password123' });
        expect(res.status).toBe(401);
    });

    it('devuelve 401 si la contraseña es incorrecta', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        bcrypt.compare.mockResolvedValue(false);
        const res = await request(app)
            .post('/auth/login')
            .send({ email: user.email, password: 'wrongpassword' });
        expect(res.status).toBe(401);
    });

    it('devuelve 200 y un token con credenciales correctas', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        bcrypt.compare.mockResolvedValue(true);
        const res = await request(app)
            .post('/auth/login')
            .send({ email: user.email, password: 'correctpassword' });
        expect(res.status).toBe(200);
        expect(res.body.token).toBeDefined();
    });

    it('establece la cookie token al hacer login correctamente', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        bcrypt.compare.mockResolvedValue(true);
        const res = await request(app)
            .post('/auth/login')
            .send({ email: user.email, password: 'correctpassword' });
        const cookies = res.headers['set-cookie'] || [];
        expect(cookies.some((c) => c.startsWith('token='))).toBe(true);
    });
});

// ── POST /auth/logout ─────────────────────────────────────────────────────────

describe('POST /auth/logout', () => {
    const app = makeApp();

    it('devuelve 200 con mensaje de éxito', async () => {
        const res = await request(app).post('/auth/logout');
        expect(res.status).toBe(200);
        expect(res.body.message).toBeDefined();
    });

    it('limpia la cookie token', async () => {
        const res = await request(app).post('/auth/logout');
        const cookies = res.headers['set-cookie'] || [];
        const tokenCookie = cookies.find((c) => c.startsWith('token='));
        expect(tokenCookie).toBeDefined();
        expect(tokenCookie).toMatch(/Max-Age=0|Expires=.*1970/i);
    });
});

// ── GET /auth/validate ────────────────────────────────────────────────────────

describe('GET /auth/validate', () => {
    const app = makeApp();

    it('devuelve 401 si no hay cookie', async () => {
        const res = await request(app).get('/auth/validate');
        expect(res.status).toBe(401);
    });

    it('devuelve 401 si el usuario del token no existe', async () => {
        const user = makeUser();
        prismaMock.user.findUnique.mockResolvedValue(null);
        const res = await request(app)
            .get('/auth/validate')
            .set('Cookie', makeAuthCookie(user));
        expect(res.status).toBe(401);
    });

    it('devuelve 200 con datos del usuario si el token es válido', async () => {
        const user = makeUser();
        prismaMock.user.findUnique.mockResolvedValue(user);
        const res = await request(app)
            .get('/auth/validate')
            .set('Cookie', makeAuthCookie(user));
        expect(res.status).toBe(200);
        expect(res.body.email).toBe(user.email);
        expect(res.body.plan).toBeDefined();
    });

    it('no expone la contraseña en la respuesta', async () => {
        const user = makeUser();
        prismaMock.user.findUnique.mockResolvedValue(user);
        const res = await request(app)
            .get('/auth/validate')
            .set('Cookie', makeAuthCookie(user));
        expect(res.body.password).toBeUndefined();
    });
});

// ── PUT /auth/change-password ─────────────────────────────────────────────────

describe('PUT /auth/change-password', () => {
    const app = makeApp();
    const user = makeUser();

    it('devuelve 401 sin autenticación', async () => {
        const res = await request(app)
            .put('/auth/change-password')
            .send({ currentPassword: 'old', newPassword: 'new' });
        expect(res.status).toBe(401);
    });

    it('devuelve 400 si faltan campos', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        const res = await request(app)
            .put('/auth/change-password')
            .set('Cookie', makeAuthCookie(user))
            .send({ currentPassword: 'old' });
        expect(res.status).toBe(400);
    });

    it('devuelve 401 si la contraseña actual es incorrecta', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        bcrypt.compare.mockResolvedValue(false);
        const res = await request(app)
            .put('/auth/change-password')
            .set('Cookie', makeAuthCookie(user))
            .send({ currentPassword: 'wrong', newPassword: 'newpassword' });
        expect(res.status).toBe(401);
    });

    it('devuelve 200 y actualiza la contraseña correctamente', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        bcrypt.compare.mockResolvedValue(true);
        bcrypt.hash.mockResolvedValue('$2b$10$newhashedpassword');
        prismaMock.user.update.mockResolvedValue({ ...user, password: '$2b$10$newhashedpassword' });

        const res = await request(app)
            .put('/auth/change-password')
            .set('Cookie', makeAuthCookie(user))
            .send({ currentPassword: 'correct', newPassword: 'newpassword' });

        expect(res.status).toBe(200);
        expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    });
});

// ── DELETE /auth/delete-user ──────────────────────────────────────────────────

describe('DELETE /auth/delete-user', () => {
    const app = makeApp();
    const user = makeUser();

    it('devuelve 401 sin autenticación', async () => {
        const res = await request(app).delete('/auth/delete-user');
        expect(res.status).toBe(401);
    });

    it('devuelve 404 si el usuario no existe en BD', async () => {
        // deleteUser busca el usuario → no lo encuentra → 404
        prismaMock.user.findUnique.mockResolvedValueOnce(null);
        const res = await request(app)
            .delete('/auth/delete-user')
            .set('Cookie', makeAuthCookie(user));
        expect(res.status).toBe(404);
    });

    it('devuelve 200 y ejecuta $transaction con los 4 deletes', async () => {
        prismaMock.user.findUnique.mockResolvedValueOnce(user);
        prismaMock.$transaction.mockResolvedValueOnce([{}, {}, {}, {}]);

        const res = await request(app)
            .delete('/auth/delete-user')
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(200);
        expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
    });

    it('limpia la cookie token al eliminar el usuario', async () => {
        prismaMock.user.findUnique
            .mockResolvedValueOnce(user)
            .mockResolvedValueOnce(user);
        prismaMock.$transaction.mockResolvedValue([{}, {}, {}, {}]);

        const res = await request(app)
            .delete('/auth/delete-user')
            .set('Cookie', makeAuthCookie(user));

        const cookies = res.headers['set-cookie'] || [];
        const tokenCookie = cookies.find((c) => c.startsWith('token='));
        expect(tokenCookie).toBeDefined();
        expect(tokenCookie).toMatch(/Max-Age=0|Expires=.*1970/i);
    });
});