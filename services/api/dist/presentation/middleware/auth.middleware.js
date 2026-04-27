"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAuth = requireAuth;
const jsonwebtoken_1 = require("jsonwebtoken");
const app_error_js_1 = require("../../domain/errors/app_error.js");
const jwt_tokens_js_1 = require("../../infrastructure/jwt_tokens.js");
function requireAuth(_req, _res, _next) {
    try {
        const HEADER = _req.headers.authorization;
        if (HEADER === undefined || !HEADER.startsWith('Bearer ')) {
            throw new app_error_js_1.AppError('NO_AUTORIZADO', 'Se requiere un token de acceso.', 401);
        }
        const TOKEN = HEADER.slice(7);
        const PAYLOAD = (0, jwt_tokens_js_1.verifyAccessTokenSV)(TOKEN);
        _req.authUser = { id: PAYLOAD.sub, email: PAYLOAD.email };
        _next();
    }
    catch (_error) {
        if (_error instanceof app_error_js_1.AppError) {
            _next(_error);
            return;
        }
        if (_error instanceof jsonwebtoken_1.JsonWebTokenError) {
            _next(new app_error_js_1.AppError('TOKEN_INVALIDO', 'Token invalido o expirado.', 401));
            return;
        }
        if (_error instanceof Error && _error.message === 'TOKEN_INVALIDO') {
            _next(new app_error_js_1.AppError('TOKEN_INVALIDO', 'Token invalido o expirado.', 401));
            return;
        }
        _next(_error);
    }
}
