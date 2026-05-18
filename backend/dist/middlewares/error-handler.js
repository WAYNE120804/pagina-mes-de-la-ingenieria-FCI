"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = errorHandler;
const logger_1 = require("../lib/logger");
const api_response_1 = require("../utils/api-response");
function errorHandler(error, _req, res, _next) {
    logger_1.logger.error('Unhandled error', error);
    const statusCode = error.statusCode || error.status || 500;
    const isPayloadTooLarge = statusCode === 413 || error.type === 'entity.too.large';
    const message = isPayloadTooLarge
        ? 'La imagen es demasiado pesada. Intenta con un logo mas liviano.'
        : statusCode >= 500
            ? 'Error interno del servidor'
            : error.message;
    res
        .status(statusCode)
        .json((0, api_response_1.errorResponse)(message, error.errorCode, error.details));
}
