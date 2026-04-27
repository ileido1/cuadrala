"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeFeeAmountSV = computeFeeAmountSV;
const client_js_1 = require("../../generated/prisma/client.js");
/** Calcula la comisión según regla activa; sin regla o inactiva => 0. */
function computeFeeAmountSV(_amountBase, _rule) {
    if (_rule === null) {
        return new client_js_1.Prisma.Decimal(0);
    }
    if (_rule.type === 'FIXED') {
        return _rule.value;
    }
    const PRODUCT = _amountBase.mul(_rule.value).div(100);
    return new client_js_1.Prisma.Decimal(Math.round(Number(PRODUCT.toString())));
}
