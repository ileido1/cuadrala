"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MATCHMAKING_ROUTER = void 0;
const express_1 = require("express");
const matchmaking_controller_js_1 = require("../controllers/matchmaking.controller.js");
const async_handler_js_1 = require("../middleware/async_handler.js");
exports.MATCHMAKING_ROUTER = (0, express_1.Router)();
exports.MATCHMAKING_ROUTER.get('/matchmaking/:matchId/suggestions', (0, async_handler_js_1.asyncHandler)(matchmaking_controller_js_1.getMatchmakingSuggestionsCON));
