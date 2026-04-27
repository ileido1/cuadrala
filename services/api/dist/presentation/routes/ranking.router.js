"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RANKING_ROUTER = void 0;
const express_1 = require("express");
const ranking_controller_js_1 = require("../controllers/ranking.controller.js");
const async_handler_js_1 = require("../middleware/async_handler.js");
exports.RANKING_ROUTER = (0, express_1.Router)();
exports.RANKING_ROUTER.post('/ranking/recalculate/:categoryId', (0, async_handler_js_1.asyncHandler)(ranking_controller_js_1.postRecalculateRankingCON));
