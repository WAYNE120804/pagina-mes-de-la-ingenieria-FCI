"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFoundHandler = notFoundHandler;
const api_response_1 = require("../utils/api-response");
function notFoundHandler(req, res) {
    res
        .status(404)
        .json((0, api_response_1.errorResponse)(`Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}
