"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AMERICANO_ROUTER = void 0;
const express_1 = require("express");
const americano_controller_js_1 = require("../controllers/americano.controller.js");
const async_handler_js_1 = require("../middleware/async_handler.js");
exports.AMERICANO_ROUTER = (0, express_1.Router)();
exports.AMERICANO_ROUTER.post('/americanos', (0, async_handler_js_1.asyncHandler)(americano_controller_js_1.postAmericanoCON));
