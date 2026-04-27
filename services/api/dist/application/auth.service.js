"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerUserSV = registerUserSV;
exports.loginUserSV = loginUserSV;
exports.refreshSessionSV = refreshSessionSV;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const app_error_js_1 = require("../domain/errors/app_error.js");
const prisma_client_js_1 = require("../infrastructure/prisma_client.js");
const jwt_tokens_js_1 = require("../infrastructure/jwt_tokens.js");
const BCRYPT_ROUNDS = 10;
async function registerUserSV(_email, _password, _name) {
    const EXISTING = await prisma_client_js_1.PRISMA.user.findUnique({ where: { email: _email.toLowerCase() } });
    if (EXISTING !== null) {
        throw new app_error_js_1.AppError('EMAIL_YA_REGISTRADO', 'Ya existe una cuenta con este correo.', 409);
    }
    const HASH = await bcryptjs_1.default.hash(_password, BCRYPT_ROUNDS);
    const USER = await prisma_client_js_1.PRISMA.user.create({
        data: {
            email: _email.toLowerCase(),
            name: _name.trim(),
            passwordHash: HASH,
        },
    });
    const ACCESS = (0, jwt_tokens_js_1.signAccessTokenSV)(USER.id, USER.email);
    const REFRESH = (0, jwt_tokens_js_1.signRefreshTokenSV)(USER.id);
    return {
        userId: USER.id,
        email: USER.email,
        name: USER.name,
        subscriptionType: USER.subscriptionType,
        accessToken: ACCESS,
        refreshToken: REFRESH,
        expiresIn: jwt_tokens_js_1.ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    };
}
async function loginUserSV(_email, _password) {
    const USER = await prisma_client_js_1.PRISMA.user.findUnique({ where: { email: _email.toLowerCase() } });
    if (USER === null || USER.passwordHash === null) {
        throw new app_error_js_1.AppError('CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.', 401);
    }
    const MATCH = await bcryptjs_1.default.compare(_password, USER.passwordHash);
    if (!MATCH) {
        throw new app_error_js_1.AppError('CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos.', 401);
    }
    const ACCESS = (0, jwt_tokens_js_1.signAccessTokenSV)(USER.id, USER.email);
    const REFRESH = (0, jwt_tokens_js_1.signRefreshTokenSV)(USER.id);
    return {
        userId: USER.id,
        email: USER.email,
        name: USER.name,
        subscriptionType: USER.subscriptionType,
        accessToken: ACCESS,
        refreshToken: REFRESH,
        expiresIn: jwt_tokens_js_1.ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    };
}
async function refreshSessionSV(_refreshToken) {
    let PAYLOAD;
    try {
        PAYLOAD = (0, jwt_tokens_js_1.verifyRefreshTokenSV)(_refreshToken);
    }
    catch {
        throw new app_error_js_1.AppError('TOKEN_INVALIDO', 'Sesión inválida o expirada.', 401);
    }
    const USER = await prisma_client_js_1.PRISMA.user.findUnique({ where: { id: PAYLOAD.sub } });
    if (USER === null) {
        throw new app_error_js_1.AppError('TOKEN_INVALIDO', 'Sesión inválida o expirada.', 401);
    }
    const ACCESS = (0, jwt_tokens_js_1.signAccessTokenSV)(USER.id, USER.email);
    const REFRESH = (0, jwt_tokens_js_1.signRefreshTokenSV)(USER.id);
    return {
        userId: USER.id,
        email: USER.email,
        name: USER.name,
        subscriptionType: USER.subscriptionType,
        accessToken: ACCESS,
        refreshToken: REFRESH,
        expiresIn: jwt_tokens_js_1.ACCESS_TOKEN_EXPIRES_IN_SECONDS,
    };
}
