"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const cors_1 = __importDefault(require("cors"));
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const error_middleware_js_1 = require("./presentation/middleware/error.middleware.js");
const api_v1_router_js_1 = require("./presentation/routes/api.v1.router.js");
/** Aplicación HTTP sin escuchar puerto (útil para tests con Supertest). */
function createApp() {
    const APP = (0, express_1.default)();
    APP.use((0, helmet_1.default)());
    APP.use((0, cors_1.default)());
    APP.use(express_1.default.json());
    APP.use((0, morgan_1.default)('dev'));
    APP.use('/api/v1', api_v1_router_js_1.API_V1_ROUTER);
    APP.use(error_middleware_js_1.errorMiddleware);
    return APP;
}
