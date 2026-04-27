"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listSportsRepo = listSportsRepo;
exports.findSportByIdRepo = findSportByIdRepo;
exports.findSportByCodeRepo = findSportByCodeRepo;
const prisma_client_js_1 = require("../prisma_client.js");
async function listSportsRepo() {
    return prisma_client_js_1.PRISMA.sport.findMany({
        orderBy: { code: 'asc' },
    });
}
async function findSportByIdRepo(_id) {
    return prisma_client_js_1.PRISMA.sport.findUnique({ where: { id: _id } });
}
async function findSportByCodeRepo(_code) {
    return prisma_client_js_1.PRISMA.sport.findUnique({ where: { code: _code } });
}
