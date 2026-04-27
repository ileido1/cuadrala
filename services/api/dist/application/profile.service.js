"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProfileByUserIdSV = getProfileByUserIdSV;
exports.updateProfileByUserIdSV = updateProfileByUserIdSV;
const app_error_js_1 = require("../domain/errors/app_error.js");
const prisma_client_js_1 = require("../infrastructure/prisma_client.js");
async function getProfileByUserIdSV(_userId) {
    const USER = await prisma_client_js_1.PRISMA.user.findUnique({ where: { id: _userId } });
    if (USER === null) {
        throw new app_error_js_1.AppError('USUARIO_NO_ENCONTRADO', 'Usuario no encontrado.', 404);
    }
    return {
        id: USER.id,
        email: USER.email,
        name: USER.name,
        subscriptionType: USER.subscriptionType,
        createdAt: USER.createdAt,
        updatedAt: USER.updatedAt,
    };
}
async function updateProfileByUserIdSV(_userId, _name) {
    if (_name === undefined) {
        return getProfileByUserIdSV(_userId);
    }
    const USER = await prisma_client_js_1.PRISMA.user.update({
        where: { id: _userId },
        data: { name: _name.trim() },
    });
    return {
        id: USER.id,
        email: USER.email,
        name: USER.name,
        subscriptionType: USER.subscriptionType,
        createdAt: USER.createdAt,
        updatedAt: USER.updatedAt,
    };
}
