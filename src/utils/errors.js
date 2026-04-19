const ERROR_CODES = {
    // Auth
    NO_TOKEN: 'NO_TOKEN',
    INVALID_TOKEN: 'INVALID_TOKEN',
    UNAUTHORIZED: 'UNAUTHORIZED',

    // Recursos
    NOT_FOUND: 'NOT_FOUND',
    CONFLICT: 'CONFLICT',
    ACCESS_DENIED: 'ACCESS_DENIED',

    // Validación
    INVALID_PAYLOAD: 'INVALID_PAYLOAD',

    // Plan
    UPGRADE_REQUIRED: 'UPGRADE_REQUIRED',

    // Stripe / Billing
    ALREADY_SUBSCRIBED: 'ALREADY_SUBSCRIBED',
    NO_STRIPE_CUSTOMER: 'NO_STRIPE_CUSTOMER',

    // Servidor
    INTERNAL_ERROR: 'INTERNAL_ERROR',
};


function sendError(res, status, code, message) {
    return res.status(status).json({ error: message, code });
}

module.exports = { sendError, ERROR_CODES };