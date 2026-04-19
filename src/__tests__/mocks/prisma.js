const prismaMock = {
    user: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
    },
    chat: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    folder: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    starredMessage: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
    },
    $transaction: jest.fn(),
};

// Resetear todos los mocks antes de cada test para evitar contaminación.
beforeEach(() => {
    Object.values(prismaMock).forEach((model) => {
        if (model && typeof model === 'object') {
            Object.values(model).forEach((fn) => {
                if (typeof fn === 'function' && fn.mockReset) fn.mockReset();
            });
        }
    });

    prismaMock.$transaction.mockImplementation(() => {
        throw new Error(
            'prismaMock.$transaction fue llamado sin estar configurado. ' +
            'Anade prismaMock.$transaction.mockResolvedValue([...]) en tu test.'
        );
    });
});

module.exports = prismaMock;