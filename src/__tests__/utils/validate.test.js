const {
    isValidId,
    isValidEmail,
    isValidPassword,
    isValidString,
    isValidChatId,
    isValidHexColor,
    isValidMessageIndex,
} = require('../../utils/validate')

// ── isValidId ─────────────────────────────────────────────────────────────────

describe('isValidId', () => {
    it('acepta un cuid válido', () => {
        expect(isValidId('cluser123456789abcdefgh')).toBe(true)
    })
    it('rechaza string vacía', () => {
        expect(isValidId('')).toBe(false)
    })
    it('rechaza null', () => {
        expect(isValidId(null)).toBe(false)
    })
    it('rechaza un número', () => {
        expect(isValidId(123)).toBe(false)
    })
    it('rechaza un UUID', () => {
        expect(isValidId('550e8400-e29b-41d4-a716-446655440000')).toBe(false)
    })
    it('rechaza strings con caracteres especiales', () => {
        expect(isValidId('cluser<script>alert(1)</script>')).toBe(false)
    })
    it('rechaza strings demasiado cortas', () => {
        expect(isValidId('clab')).toBe(false)
    })
})

// ── isValidEmail ──────────────────────────────────────────────────────────────

describe('isValidEmail', () => {
    it('acepta emails válidos', () => {
        expect(isValidEmail('user@example.com')).toBe(true)
        expect(isValidEmail('user.name+tag@sub.domain.org')).toBe(true)
    })
    it('rechaza email sin @', () => {
        expect(isValidEmail('userexample.com')).toBe(false)
    })
    it('rechaza email sin dominio', () => {
        expect(isValidEmail('user@')).toBe(false)
    })
    it('rechaza email sin usuario', () => {
        expect(isValidEmail('@example.com')).toBe(false)
    })
    it('rechaza string vacía', () => {
        expect(isValidEmail('')).toBe(false)
    })
    it('rechaza null', () => {
        expect(isValidEmail(null)).toBe(false)
    })
    it('rechaza emails de más de 254 caracteres', () => {
        expect(isValidEmail('a'.repeat(250) + '@b.com')).toBe(false)
    })
})

// ── isValidPassword ───────────────────────────────────────────────────────────

describe('isValidPassword', () => {
    it('acepta contraseña de exactamente 8 caracteres', () => {
        expect(isValidPassword('12345678')).toBe(true)
    })
    it('acepta contraseña de 72 caracteres', () => {
        expect(isValidPassword('a'.repeat(72))).toBe(true)
    })
    it('rechaza contraseña de 7 caracteres', () => {
        expect(isValidPassword('1234567')).toBe(false)
    })
    it('rechaza contraseña de 73 caracteres (bcrypt trunca a 72)', () => {
        expect(isValidPassword('a'.repeat(73))).toBe(false)
    })
    it('rechaza string vacía', () => {
        expect(isValidPassword('')).toBe(false)
    })
    it('rechaza null', () => {
        expect(isValidPassword(null)).toBe(false)
    })
})

// ── isValidString ─────────────────────────────────────────────────────────────

describe('isValidString', () => {
    it('acepta un string normal', () => {
        expect(isValidString('Hola mundo')).toBe(true)
    })
    it('rechaza string vacía', () => {
        expect(isValidString('')).toBe(false)
    })
    it('rechaza string de solo espacios', () => {
        expect(isValidString('   ')).toBe(false)
    })
    it('respeta maxLength personalizado', () => {
        expect(isValidString('abc', { maxLength: 2 })).toBe(false)
        expect(isValidString('ab', { maxLength: 2 })).toBe(true)
    })
    it('respeta minLength personalizado', () => {
        expect(isValidString('hi', { minLength: 3 })).toBe(false)
        expect(isValidString('hey', { minLength: 3 })).toBe(true)
    })
    it('rechaza null', () => {
        expect(isValidString(null)).toBe(false)
    })
})

// ── isValidHexColor ───────────────────────────────────────────────────────────

describe('isValidHexColor', () => {
    it('acepta formato corto #fff', () => {
        expect(isValidHexColor('#fff')).toBe(true)
    })
    it('acepta formato largo #3b82f6', () => {
        expect(isValidHexColor('#3b82f6')).toBe(true)
    })
    it('rechaza sin #', () => {
        expect(isValidHexColor('3b82f6')).toBe(false)
    })
    it('rechaza longitud incorrecta', () => {
        expect(isValidHexColor('#3b82f')).toBe(false)
        expect(isValidHexColor('#3b82f66')).toBe(false)
    })
    it('rechaza caracteres no hexadecimales', () => {
        expect(isValidHexColor('#zzzzzz')).toBe(false)
    })
    it('rechaza null', () => {
        expect(isValidHexColor(null)).toBe(false)
    })
})

// ── isValidMessageIndex ───────────────────────────────────────────────────────

describe('isValidMessageIndex', () => {
    it('acepta 0', () => {
        expect(isValidMessageIndex(0)).toBe(true)
    })
    it('acepta enteros positivos', () => {
        expect(isValidMessageIndex(42)).toBe(true)
    })
    it('rechaza negativos', () => {
        expect(isValidMessageIndex(-1)).toBe(false)
    })
    it('rechaza decimales', () => {
        expect(isValidMessageIndex(1.5)).toBe(false)
    })
    it('rechaza strings', () => {
        expect(isValidMessageIndex('0')).toBe(false)
    })
    it('rechaza null', () => {
        expect(isValidMessageIndex(null)).toBe(false)
    })
})