process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-for-jest';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.STRIPE_SECRET_KEY = 'sk_test_fake_key_for_jest';
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_fake_secret_for_jest';
process.env.STRIPE_PRICE_ID = 'price_test_fake_id_for_jest';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.PORT = '4000';