"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findCategoryByIdRepo = findCategoryByIdRepo;
const prisma_client_js_1 = require("../prisma_client.js");
async function findCategoryByIdRepo(_id) {
    return prisma_client_js_1.PRISMA.category.findUnique({ where: { id: _id } });
}
