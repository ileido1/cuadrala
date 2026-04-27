"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const app_js_1 = require("./app.js");
const env_js_1 = require("./config/env.js");
const APP = (0, app_js_1.createApp)();
APP.listen(env_js_1.ENV_CONST.PORT, () => {
    // Mensaje simple para confirmar bootstrap local.
    console.log(`API activa en puerto ${env_js_1.ENV_CONST.PORT}`);
});
