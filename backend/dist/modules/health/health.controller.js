"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealth = getHealth;
const prisma_1 = require("../../lib/prisma");
const api_response_1 = require("../../utils/api-response");
async function getHealth(_req, res, next) {
    try {
        const prisma = (0, prisma_1.getPrisma)();
        let databaseStatus = 'not-configured';
        let databaseLatencyMs = null;
        if (prisma) {
            const startedAt = Date.now();
            await prisma.$queryRaw `SELECT 1`;
            databaseLatencyMs = Date.now() - startedAt;
            databaseStatus = 'ok';
        }
        res.json((0, api_response_1.successResponse)('Servicio disponible', {
            status: 'ok',
            timestamp: new Date().toISOString(),
            phase: 'fase-3d-public-academic-forms',
            checks: {
                api: 'ok',
                database: databaseStatus,
                databaseLatencyMs,
            },
        }));
    }
    catch (error) {
        next(error);
    }
}
