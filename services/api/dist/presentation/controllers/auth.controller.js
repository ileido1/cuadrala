"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postRegisterCON = postRegisterCON;
exports.postLoginCON = postLoginCON;
exports.postRefreshCON = postRefreshCON;
const auth_service_js_1 = require("../../application/auth.service.js");
const auth_validation_js_1 = require("../validation/auth.validation.js");
async function postRegisterCON(_req, _res) {
    const BODY = auth_validation_js_1.REGISTER_BODY_SCHEMA.parse(_req.body);
    const RESULT = await (0, auth_service_js_1.registerUserSV)(BODY.email, BODY.password, BODY.name);
    _res.status(201).json({
        success: true,
        message: 'Cuenta creada correctamente.',
        data: {
            user: {
                id: RESULT.userId,
                email: RESULT.email,
                name: RESULT.name,
                subscriptionType: RESULT.subscriptionType,
            },
            accessToken: RESULT.accessToken,
            refreshToken: RESULT.refreshToken,
            expiresIn: RESULT.expiresIn,
        },
    });
}
async function postLoginCON(_req, _res) {
    const BODY = auth_validation_js_1.LOGIN_BODY_SCHEMA.parse(_req.body);
    const RESULT = await (0, auth_service_js_1.loginUserSV)(BODY.email, BODY.password);
    _res.status(200).json({
        success: true,
        message: 'Sesion iniciada correctamente.',
        data: {
            user: {
                id: RESULT.userId,
                email: RESULT.email,
                name: RESULT.name,
                subscriptionType: RESULT.subscriptionType,
            },
            accessToken: RESULT.accessToken,
            refreshToken: RESULT.refreshToken,
            expiresIn: RESULT.expiresIn,
        },
    });
}
async function postRefreshCON(_req, _res) {
    const BODY = auth_validation_js_1.REFRESH_BODY_SCHEMA.parse(_req.body);
    const RESULT = await (0, auth_service_js_1.refreshSessionSV)(BODY.refreshToken);
    _res.status(200).json({
        success: true,
        message: 'Tokens renovados correctamente.',
        data: {
            user: {
                id: RESULT.userId,
                email: RESULT.email,
                name: RESULT.name,
                subscriptionType: RESULT.subscriptionType,
            },
            accessToken: RESULT.accessToken,
            refreshToken: RESULT.refreshToken,
            expiresIn: RESULT.expiresIn,
        },
    });
}
