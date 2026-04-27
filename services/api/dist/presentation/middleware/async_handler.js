"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.asyncHandler = asyncHandler;
/** Permite usar controladores async con propagación al middleware de errores. */
function asyncHandler(_fn) {
    return (_req, _res, _next) => {
        void _fn(_req, _res, _next).catch(_next);
    };
}
