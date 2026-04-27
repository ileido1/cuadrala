"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEALTH_ROUTER = void 0;
const express_1 = require("express");
const health_controller_js_1 = require("../controllers/health.controller.js");
exports.HEALTH_ROUTER = (0, express_1.Router)();
exports.HEALTH_ROUTER.get('/health', health_controller_js_1.getHealthCON);
