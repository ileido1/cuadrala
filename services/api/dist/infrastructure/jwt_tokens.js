"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACCESS_TOKEN_EXPIRES_IN_SECONDS = void 0;
exports.signAccessTokenSV = signAccessTokenSV;
exports.signRefreshTokenSV = signRefreshTokenSV;
exports.verifyAccessTokenSV = verifyAccessTokenSV;
exports.verifyRefreshTokenSV = verifyRefreshTokenSV;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const env_js_1 = require("../config/env.js");
const ACCESS_EXPIRES_IN = '15m';
const REFRESH_EXPIRES_IN = '7d';
/** Segundos del access token (15 min) para el cliente. */
exports.ACCESS_TOKEN_EXPIRES_IN_SECONDS = 15 * 60;
function signAccessTokenSV(_userId, _email) {
    const PAYLOAD = { sub: _userId, email: _email, typ: 'access' };
    return jsonwebtoken_1.default.sign(PAYLOAD, env_js_1.ENV_CONST.JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}
function signRefreshTokenSV(_userId) {
    const PAYLOAD = { sub: _userId, typ: 'refresh' };
    return jsonwebtoken_1.default.sign(PAYLOAD, env_js_1.ENV_CONST.JWT_REFRESH_SECRET, { expiresIn: REFRESH_EXPIRES_IN });
}
function verifyAccessTokenSV(_token) {
    const DECODED = jsonwebtoken_1.default.verify(_token, env_js_1.ENV_CONST.JWT_ACCESS_SECRET);
    if (typeof DECODED === 'string' || DECODED.typ !== 'access') {
        throw new Error('TOKEN_INVALIDO');
    }
    return DECODED;
}
function verifyRefreshTokenSV(_token) {
    const DECODED = jsonwebtoken_1.default.verify(_token, env_js_1.ENV_CONST.JWT_REFRESH_SECRET);
    if (typeof DECODED === 'string' || DECODED.typ !== 'refresh') {
        throw new Error('TOKEN_INVALIDO');
    }
    return DECODED;
}
