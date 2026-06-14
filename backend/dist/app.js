"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const error_handler_1 = require("./middlewares/error-handler");
const not_found_handler_1 = require("./middlewares/not-found-handler");
const serialize_response_1 = require("./middlewares/serialize-response");
const security_1 = require("./middlewares/security");
const routes_1 = require("./routes");
const api_response_1 = require("./utils/api-response");
const request_context_1 = require("./utils/request-context");
function createApp() {
    const app = (0, express_1.default)();
    app.disable('x-powered-by');
    app.set('trust proxy', 1);
    app.use(security_1.securityHeaders);
    app.use(security_1.permissionsPolicy);
    app.use(security_1.corsMiddleware);
    app.use(security_1.globalRateLimiter);
    app.use(request_context_1.requestContextMiddleware);
    app.use(express_1.default.json({ limit: '10mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '10mb' }));
    app.use(serialize_response_1.serializeResponse);
    app.get('/', (_req, res) => {
        res.json((0, api_response_1.successResponse)('API operativa', {
            name: 'Semana de Ingeniería API',
            status: 'ok',
            phase: 'fase-3d-public-academic-forms',
        }));
    });
    app.use('/api', routes_1.apiRouter);
    app.use(not_found_handler_1.notFoundHandler);
    app.use(error_handler_1.errorHandler);
    return app;
}
