"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findCourtByIdRepo = findCourtByIdRepo;
const prisma_client_js_1 = require("../prisma_client.js");
async function findCourtByIdRepo(_id) {
    return prisma_client_js_1.PRISMA.court.findUnique({ where: { id: _id } });
}
