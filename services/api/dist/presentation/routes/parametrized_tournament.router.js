"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PARAMETRIZED_TOURNAMENT_ROUTER = void 0;
const express_1 = require("express");
const parametrized_tournament_controller_js_1 = require("../controllers/parametrized_tournament.controller.js");
const async_handler_js_1 = require("../middleware/async_handler.js");
exports.PARAMETRIZED_TOURNAMENT_ROUTER = (0, express_1.Router)();
exports.PARAMETRIZED_TOURNAMENT_ROUTER.post('/tournaments', (0, async_handler_js_1.asyncHandler)(parametrized_tournament_controller_js_1.postParametrizedTournamentCON));
