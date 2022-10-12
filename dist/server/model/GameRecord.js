"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameRecord = exports.GameRecordSchema = void 0;
const mongoose_1 = require("mongoose");
exports.GameRecordSchema = new mongoose_1.Schema({
    casino: { type: String, required: true },
    player: { type: String, required: true },
    player_wealth: { type: Number, required: true },
    end_reason: { type: String, required: true },
}, { timestamps: true });
exports.GameRecord = (0, mongoose_1.model)('GameRecord', exports.GameRecordSchema);
