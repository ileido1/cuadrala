"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorMiddleware = errorMiddleware;
const zod_1 = require("zod");
const app_error_js_1 = require("../../domain/errors/app_error.js");
function errorMiddleware(_err, _req, _res, _next) {
    if (_res.headersSent) {
        _next(_err);
        return;
    }
    if (_err instanceof app_error_js_1.AppError) {
        _res.status(_err.statusCode).json({
            success: false,
            code: _err.code,
            message: _err.message,
        });
        return;
    }
    if (_err instanceof zod_1.ZodError) {
        _res.status(400).json({
            success: false,
            code: 'VALIDACION_FALLIDA',
            message: 'Los datos enviados no son validos.',
            details: _err.flatten(),
        });
        return;
    }
    console.error(_err);
    _res.status(500).json({
        success: false,
        code: 'ERROR_INTERNO',
        message: 'Ocurrió un error interno. Intente nuevamente más tarde.',
    });
}
