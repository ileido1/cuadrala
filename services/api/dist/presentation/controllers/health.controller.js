"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealthCON = getHealthCON;
function getHealthCON(_req, _res) {
    _res.status(200).json({
        status: 'ok',
        service: 'api',
        timestamp: new Date().toISOString(),
    });
}
