"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recalculateRankingSV = recalculateRankingSV;
const app_error_js_1 = require("../domain/errors/app_error.js");
const category_repository_js_1 = require("../infrastructure/repositories/category.repository.js");
const ranking_repository_js_1 = require("../infrastructure/repositories/ranking.repository.js");
async function recalculateRankingSV(_categoryId) {
    const CATEGORY = await (0, category_repository_js_1.findCategoryByIdRepo)(_categoryId);
    if (!CATEGORY) {
        throw new app_error_js_1.AppError('CATEGORIA_NO_ENCONTRADA', 'La categoría indicada no existe.', 404);
    }
    const AGG = await (0, ranking_repository_js_1.aggregateScoresByCategoryRepo)(_categoryId);
    await (0, ranking_repository_js_1.replaceRankingForCategoryRepo)(_categoryId, AGG);
    return {
        categoryId: _categoryId,
        entriesUpdated: AGG.length,
    };
}
