const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-jest';

// ── Usuarios ─────────────────────────────────────────────────────────────────

function makeUser(overrides = {}) {
  return {
    id: 'cluser123456789abcdefgh',
    email: 'test@example.com',
    password: '$2b$10$hashedpasswordfortest1234567890',
    plan: 'free',
    trialEndsAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // trial activo
    subscriptionId: null,
    stripeCustomerId: null,
    createdAt: new Date('2024-01-01T00:00:00Z'),
    ...overrides,
  };
}

function makeProUser(overrides = {}) {
  return makeUser({
    plan: 'pro',
    trialEndsAt: null,
    stripeCustomerId: 'cus_test_1234567890',
    subscriptionId: 'sub_test_1234567890',
    ...overrides,
  });
}

function makeExpiredTrialUser(overrides = {}) {
  return makeUser({
    plan: 'free',
    trialEndsAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // ayer
    ...overrides,
  });
}

// ── Chats ─────────────────────────────────────────────────────────────────────

function makeChat(overrides = {}) {
  return {
    id: 'clchat123456789abcdefgh',
    userId: 'cluser123456789abcdefgh',
    chatId: 'chatgpt-conversation-id-123',
    title: 'Test Chat',
    favorite: false,
    archived: false,
    folderId: null,
    folder: null,
    ...overrides,
  };
}

// ── Carpetas ──────────────────────────────────────────────────────────────────

function makeFolder(overrides = {}) {
  return {
    id: 'clfolder12345678abcdefgh',
    userId: 'cluser123456789abcdefgh',
    name: 'Test Folder',
    color: '#3b82f6',
    parentId: null,
    children: [],
    chats: [],
    ...overrides,
  };
}

// ── Starred Messages ──────────────────────────────────────────────────────────

function makeStarredMessage(overrides = {}) {
  return {
    id: 'clmsg1234567890abcdefgh',
    userId: 'cluser123456789abcdefgh',
    chatId: 'chatgpt-conversation-id-123',
    messageIndex: 0,
    text: 'This is a starred message for testing.',
    ...overrides,
  };
}

// ── Auth helpers ──────────────────────────────────────────────────────────────

function makeAuthCookie(user) {
  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
  return `token=${token}`;
}

function makeJwt(user) {
  return jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
}

module.exports = {
  makeUser,
  makeProUser,
  makeExpiredTrialUser,
  makeChat,
  makeFolder,
  makeStarredMessage,
  makeAuthCookie,
  makeJwt,
};