"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
/** Error de aplicación con código estable y mensaje en español para el cliente. */
class AppError extends Error {
    code;
    statusCode;
    constructor(_code, _message, _statusCode = 400) {
        super(_message);
        this.name = 'AppError';
        this.code = _code;
        this.statusCode = _statusCode;
    }
}
exports.AppError = AppError;
