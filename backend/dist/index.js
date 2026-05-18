"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const logger_1 = require("./lib/logger");
async function start() {
    const app = (0, app_1.createApp)();
    app.listen(env_1.env.port, () => {
        logger_1.logger.info(`Servidor backend escuchando en http://localhost:${env_1.env.port}`);
    });
}
start().catch((error) => {
    logger_1.logger.error('No fue posible iniciar el backend.', error);
    process.exit(1);
});
