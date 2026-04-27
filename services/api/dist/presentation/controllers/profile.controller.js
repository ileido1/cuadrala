"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfileCON = getProfileCON;
exports.patchProfileCON = patchProfileCON;
const profile_service_js_1 = require("../../application/profile.service.js");
const app_error_js_1 = require("../../domain/errors/app_error.js");
const profile_validation_js_1 = require("../validation/profile.validation.js");
async function getProfileCON(_req, _res) {
    const USER_ID = _req.authUser?.id;
    if (USER_ID === undefined) {
        throw new app_error_js_1.AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
    }
    const PROFILE = await (0, profile_service_js_1.getProfileByUserIdSV)(USER_ID);
    _res.status(200).json({
        success: true,
        message: 'Perfil obtenido correctamente.',
        data: { user: PROFILE },
    });
}
async function patchProfileCON(_req, _res) {
    const USER_ID = _req.authUser?.id;
    if (USER_ID === undefined) {
        throw new app_error_js_1.AppError('NO_AUTORIZADO', 'Sesion no disponible.', 401);
    }
    const BODY = profile_validation_js_1.PATCH_PROFILE_BODY_SCHEMA.parse(_req.body);
    const PROFILE = await (0, profile_service_js_1.updateProfileByUserIdSV)(USER_ID, BODY.name);
    _res.status(200).json({
        success: true,
        message: 'Perfil actualizado correctamente.',
        data: { user: PROFILE },
    });
}
