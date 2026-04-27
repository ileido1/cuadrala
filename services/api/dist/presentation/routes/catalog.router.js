"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CATALOG_ROUTER = void 0;
const express_1 = require("express");
const catalog_controller_js_1 = require("../controllers/catalog.controller.js");
const async_handler_js_1 = require("../middleware/async_handler.js");
exports.CATALOG_ROUTER = (0, express_1.Router)();
exports.CATALOG_ROUTER.get('/sports', (0, async_handler_js_1.asyncHandler)(catalog_controller_js_1.getSportsCON));
exports.CATALOG_ROUTER.get('/sports/:sportId/tournament-format-presets', (0, async_handler_js_1.asyncHandler)(catalog_controller_js_1.getTournamentFormatPresetsBySportCON));
