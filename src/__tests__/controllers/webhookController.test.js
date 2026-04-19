jest.mock('../../lib/prisma', () => require('../mocks/prisma'));
jest.mock('../../lib/stripe');

const request = require('supertest');
const express = require('express');
const cookieParser = require('cookie-parser');
const prismaMock = require('../mocks/prisma');
const stripeMock = require('../../lib/stripe');
const { handleStripeWebhook } = require('../../controllers/webhook.controller');
const { makeUser, makeProUser } = require('../mocks/factories');

function makeApp() {
    const app = express();
    app.use(cookieParser());
    app.post('/webhook/stripe', express.raw({ type: 'application/json' }), handleStripeWebhook);
    return app;
}

function mockStripeEvent(type, data) {
    const event = { type, data: { object: data } };
    stripeMock.webhooks.constructEvent.mockReturnValue(event);
    return event;
}

function mockInvalidSignature() {
    stripeMock.webhooks.constructEvent.mockImplementation(() => {
        throw new Error('No signatures found matching the expected signature for payload');
    });
}

// ── Verificación de firma ─────────────────────────────────────────────────────

describe('POST /webhook/stripe — verificación de firma', () => {
    const app = makeApp();

    it('devuelve 400 si la firma es inválida', async () => {
        mockInvalidSignature();

        const res = await request(app)
            .post('/webhook/stripe')
            .set('stripe-signature', 'invalid-sig')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(400);
        expect(res.text).toContain('Webhook Error');
    });
});

// ── checkout.session.completed ────────────────────────────────────────────────

describe('checkout.session.completed', () => {
    const app = makeApp();
    const user = makeUser();

    it('actualiza el plan a pro usando el userId del metadata', async () => {
        mockStripeEvent('checkout.session.completed', {
            customer: 'cus_new_customer_123',
            customer_email: user.email,
            metadata: { userId: user.id },
        });
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.user.update.mockResolvedValue({ ...user, plan: 'pro', stripeCustomerId: 'cus_new_customer_123' });

        const res = await request(app)
            .post('/webhook/stripe')
            .set('stripe-signature', 'valid-sig')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(200);
        expect(prismaMock.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: user.id },
                data: expect.objectContaining({ plan: 'pro' }),
            })
        );
    });

    it('guarda el stripeCustomerId en la BD', async () => {
        mockStripeEvent('checkout.session.completed', {
            customer: 'cus_brand_new_456',
            customer_email: user.email,
            metadata: { userId: user.id },
        });
        prismaMock.user.findUnique.mockResolvedValue(user);
        prismaMock.user.update.mockResolvedValue({ ...user, plan: 'pro', stripeCustomerId: 'cus_brand_new_456' });

        await request(app)
            .post('/webhook/stripe')
            .set('stripe-signature', 'valid-sig')
            .send(Buffer.from('{}'));

        expect(prismaMock.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ stripeCustomerId: 'cus_brand_new_456' }),
            })
        );
    });

    it('no falla si no se encuentra el usuario (log silencioso)', async () => {
        mockStripeEvent('checkout.session.completed', {
            customer: 'cus_orphan',
            customer_email: 'noexiste@example.com',
            metadata: {},
        });
        prismaMock.user.findUnique.mockResolvedValue(null);

        const res = await request(app)
            .post('/webhook/stripe')
            .set('stripe-signature', 'valid-sig')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(200);
    });
});

// ── customer.subscription.created ────────────────────────────────────────────

describe('customer.subscription.created', () => {
    const app = makeApp();
    const proUser = makeProUser();

    it('actualiza el plan a pro y guarda el subscriptionId', async () => {
        mockStripeEvent('customer.subscription.created', {
            id: 'sub_test_created_123',
            customer: proUser.stripeCustomerId,
            status: 'active',
        });
        prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

        const res = await request(app)
            .post('/webhook/stripe')
            .set('stripe-signature', 'valid-sig')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(200);
        expect(prismaMock.user.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { stripeCustomerId: proUser.stripeCustomerId },
                data: expect.objectContaining({ plan: 'pro', subscriptionId: 'sub_test_created_123' }),
            })
        );
    });
});

// ── customer.subscription.updated ────────────────────────────────────────────

describe('customer.subscription.updated', () => {
    const app = makeApp();
    const proUser = makeProUser();

    it('mantiene plan pro si el estado es active', async () => {
        mockStripeEvent('customer.subscription.updated', {
            id: proUser.subscriptionId,
            customer: proUser.stripeCustomerId,
            status: 'active',
        });
        prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

        const res = await request(app)
            .post('/webhook/stripe')
            .set('stripe-signature', 'valid-sig')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(200);
        expect(prismaMock.user.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ plan: 'pro' }),
            })
        );
    });

    it('degrada a free si el estado NO es active (ej: past_due)', async () => {
        mockStripeEvent('customer.subscription.updated', {
            id: proUser.subscriptionId,
            customer: proUser.stripeCustomerId,
            status: 'past_due',
        });
        prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

        const res = await request(app)
            .post('/webhook/stripe')
            .set('stripe-signature', 'valid-sig')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(200);
        expect(prismaMock.user.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                data: expect.objectContaining({ plan: 'free' }),
            })
        );
    });
});

// ── customer.subscription.deleted ────────────────────────────────────────────

describe('customer.subscription.deleted', () => {
    const app = makeApp();
    const proUser = makeProUser();

    it('degrada el plan a free y elimina el subscriptionId', async () => {
        mockStripeEvent('customer.subscription.deleted', {
            id: proUser.subscriptionId,
            customer: proUser.stripeCustomerId,
        });
        prismaMock.user.updateMany.mockResolvedValue({ count: 1 });

        const res = await request(app)
            .post('/webhook/stripe')
            .set('stripe-signature', 'valid-sig')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(200);
        expect(prismaMock.user.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { stripeCustomerId: proUser.stripeCustomerId },
                data: expect.objectContaining({ plan: 'free', subscriptionId: null }),
            })
        );
    });
});

// ── Evento desconocido ────────────────────────────────────────────────────────

describe('evento Stripe desconocido', () => {
    const app = makeApp();

    it('devuelve 200 sin errores para eventos no manejados', async () => {
        mockStripeEvent('payment_intent.created', { id: 'pi_test_123' });

        const res = await request(app)
            .post('/webhook/stripe')
            .set('stripe-signature', 'valid-sig')
            .send(Buffer.from('{}'));

        expect(res.status).toBe(200);
        expect(res.body.received).toBe(true);
    });
});