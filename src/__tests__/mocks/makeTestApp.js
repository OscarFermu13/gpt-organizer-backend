const express = require('express');
const cookieParser = require('cookie-parser');

function makeTestApp(routerSetup) {
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    routerSetup(app);
    return app;
}

module.exports = { makeTestApp };