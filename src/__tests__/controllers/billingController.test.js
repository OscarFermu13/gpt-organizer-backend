jest.mock('../../lib/prisma', () => require('../mocks/prisma'));
jest.mock('../../services/stripe.service');

const request = require('supertest');
const { makeTestApp } = require('../mocks/makeTestApp');
const prismaMock = require('../mocks/prisma');
const stripeService = require('../../services/stripe.service');
const authenticateToken = require('../../middleware/authMiddleware');
const {
    startCheckout,
    startCustomerPortal,
    getSubscriptionStatus,
} = require('../../controllers/billing.controller');
const {
    makeUser,
    makeProUser,
    makeAuthCookie,
} = require('../mocks/factories');

function makeApp() {
    return makeTestApp((app) => {
        app.post('/billing/checkout', authenticateToken, startCheckout);
        app.post('/billing/portal', authenticateToken, startCustomerPortal);
        app.get('/billing/status', authenticateToken, getSubscriptionStatus);
    });
}

// ── POST /billing/checkout ────────────────────────────────────────────────────

describe('POST /billing/checkout', () => {
    const app = makeApp();
    const user = makeUser();

    it('devuelve 401 sin autenticación', async () => {
        const res = await request(app).post('/billing/checkout');
        expect(res.status).toBe(401);
    });

    it('devuelve 400 si el usuario ya tiene plan pro', async () => {
        const proUser = makeProUser();
        prismaMock.user.findUnique.mockResolvedValue(proUser);

        const res = await request(app)
            .post('/billing/checkout')
            .set('Cookie', makeAuthCookie(proUser));

        expect(res.status).toBe(400);
    });

    it('devuelve 200 con la URL de checkout para usuario free', async () => {
        prismaMock.user.findUnique.mockResolvedValue(user);
        stripeService.createCheckoutSession.mockResolvedValue('https://checkout.stripe.com/test-session');

        const res = await request(app)
            .post('/billing/checkout')
            .set('Cookie', makeAuthCookie(user));

        expect(res.status).toBe(200);
        expect(res.body.url).toContain('stripe.com');
    });

    it('devuelve 404 si el usuario no existe en BD', async () => {
        const fakeUser = makeUser();
        prismaMock.user.findUnique.mockResolvedValueOnce(null);

        const res = await request(app)
            .post('/billing/checkout')
            .set('Cookie', makeAuthCookie(fakeUser));

        expect(res.status).toBe(404);
    });
});

// ── POST /billing/portal ──────────────────────────────────────────────────────

describe('POST /billing/portal', () => {
    const app = makeApp();
    const proUser = makeProUser();

    it('devuelve 401 sin autenticación', async () => {
        const res = await request(app).post('/billing/portal');
        expect(res.status).toBe(401);
    });

    it('devuelve 200 con la URL del portal si el usuario tiene stripeCustomerId', async () => {
        prismaMock.user.findUnique.mockResolvedValue(proUser);
        stripeService.createCustomerPortalSession.mockResolvedValue('https://billing.stripe.com/test-portal');

        const res = await request(app)
            .post('/billing/portal')
            .set('Cookie', makeAuthCookie(proUser));

        expect(res.status).toBe(200);
        expect(res.body.url).toContain('stripe.com');
    });

    it('busca el customer en Stripe si no hay stripeCustomerId en BD', async () => {
        const userWithoutCustomer = makeProUser({ stripeCustomerId: null });
        prismaMock.user.findUnique.mockResolvedValue(userWithoutCustomer);
        stripeService.getCustomerByEmail.mockResolvedValue({ id: 'cus_found_in_stripe' });
        prismaMock.user.update.mockResolvedValue({ ...userWithoutCustomer, stripeCustomerId: 'cus_found_in_stripe' });
        stripeService.createCustomerPortalSession.mockResolvedValue('https://billing.stripe.com/test-portal');

        const res = await request(app)
            .post('/billing/portal')
            .set('Cookie', makeAuthCookie(userWithoutCustomer));

        expect(res.status).toBe(200);
        expect(stripeService.getCustomerByEmail).toHaveBeenCalledWith(userWithoutCustomer.email);
    });

    it('devuelve 400 si no existe customer ni en BD ni en Stripe', async () => {
        const userWithoutCustomer = makeUser({ stripeCustomerId: null });
        prismaMock.user.findUnique.mockResolvedValue(userWithoutCustomer);
        stripeService.getCustomerByEmail.mockResolvedValue(null);

        const res = await request(app)
            .post('/billing/portal')
            .set('Cookie', makeAuthCookie(userWithoutCustomer));

        expect(res.status).toBe(400);
    });
});

// ── GET /billing/status ───────────────────────────────────────────────────────

describe('GET /billing/status', () => {
    const app = makeApp();

    it('devuelve 401 sin autenticación', async () => {
        const res = await request(app).get('/billing/status');
        expect(res.status).toBe(401);
    });

    it('devuelve 200 con plan free para usuario gratuito', async () => {
        const freeUser = makeUser();
        prismaMock.user.findUnique.mockResolvedValue(freeUser);

        const res = await request(app)
            .get('/billing/status')
            .set('Cookie', makeAuthCookie(freeUser));

        expect(res.status).toBe(200);
        expect(res.body.plan).toBe('free');
        expect(res.body.hasActiveSubscription).toBe(false);
    });

    it('devuelve 200 con plan pro para usuario suscrito', async () => {
        const proUser = makeProUser();
        prismaMock.user.findUnique.mockResolvedValue(proUser);

        const res = await request(app)
            .get('/billing/status')
            .set('Cookie', makeAuthCookie(proUser));

        expect(res.status).toBe(200);
        expect(res.body.plan).toBe('pro');
        expect(res.body.hasActiveSubscription).toBe(true);
    });

    it('no expone datos sensibles (password, etc.)', async () => {
        const freeUser = makeUser();
        prismaMock.user.findUnique.mockResolvedValue(freeUser);

        const res = await request(app)
            .get('/billing/status')
            .set('Cookie', makeAuthCookie(freeUser));

        expect(res.body.password).toBeUndefined();
        expect(res.body.email).toBeUndefined();
    });
});