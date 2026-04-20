require('dotenv').config();

const required = [
    'DATABASE_URL',
    'JWT_SECRET',
    'STRIPE_SECRET_KEY',
    'STRIPE_WEBHOOK_SECRET',
    'STRIPE_PRICE_ID',
    'FRONTEND_URL',
];

const missing = required.filter((key) => !process.env[key]);
if (missing.length > 0) {
    throw new Error(
        `Missing required environment variables:\n  ${missing.join('\n  ')}\n` +
        `Check your .env file. See .env.example for reference.`
    );
}

module.exports = {
    PORT: process.env.PORT || 4000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    IS_PRODUCTION: process.env.NODE_ENV === 'production',

    DATABASE_URL: process.env.DATABASE_URL,
    JWT_SECRET: process.env.JWT_SECRET,

    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    STRIPE_PRICE_ID: process.env.STRIPE_PRICE_ID,

    FRONTEND_URL: process.env.FRONTEND_URL,
};