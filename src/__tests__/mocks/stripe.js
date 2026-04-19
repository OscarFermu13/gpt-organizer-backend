const stripeMock = {
    webhooks: {
        constructEvent: jest.fn(),
    },
    checkout: {
        sessions: {
            create: jest.fn(),
        },
    },
    billingPortal: {
        sessions: {
            create: jest.fn(),
        },
    },
    customers: {
        list: jest.fn(),
    },
};

beforeEach(() => {
    Object.values(stripeMock.webhooks).forEach((fn) => fn.mockReset && fn.mockReset());
    Object.values(stripeMock.checkout.sessions).forEach((fn) => fn.mockReset && fn.mockReset());
    Object.values(stripeMock.billingPortal.sessions).forEach((fn) => fn.mockReset && fn.mockReset());
    Object.values(stripeMock.customers).forEach((fn) => fn.mockReset && fn.mockReset());
});

module.exports = stripeMock;