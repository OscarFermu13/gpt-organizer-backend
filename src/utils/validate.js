const CUID_REGEX = /^c[a-z0-9]{20,30}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function isValidId(id) {
    return typeof id === 'string' && CUID_REGEX.test(id);
}

function isValidEmail(email) {
    return typeof email === 'string' && EMAIL_REGEX.test(email.trim()) && email.length <= 254;
}

function isValidPassword(pwd) {
    return typeof pwd === 'string' && pwd.length >= 8 && pwd.length <= 72;
}

function isValidString(value, { minLength = 1, maxLength = 255 } = {}) {
    return (
        typeof value === 'string' &&
        value.trim().length >= minLength &&
        value.length <= maxLength
    );
}

function isValidChatId(chatId) {
    return typeof chatId === 'string' && chatId.trim().length > 0 && chatId.length <= 255;
}

function isValidHexColor(color) {
    return typeof color === 'string' && /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(color);
}

function isValidMessageIndex(index) {
    return Number.isInteger(index) && index >= 0;
}

module.exports = {
    isValidId,
    isValidEmail,
    isValidPassword,
    isValidString,
    isValidChatId,
    isValidHexColor,
    isValidMessageIndex,
};