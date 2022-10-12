"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MONGODB_URI = exports.PRODUCTION = exports.MAX_PULL_STAKE = exports.PORT = exports.TIME_LIMIT = exports.INIT_PULL_BUDGET = exports.INIT_PLAYER_WEALTH = exports.WIN_RATE = exports.INIT_SWITCH_BUDGET = exports.SLOT_COUNT = void 0;
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)();
const PORT = parseInt(process.env.PORT, 10) || 22222;
exports.PORT = PORT;
const INIT_SWITCH_BUDGET = parseInt(process.env.INIT_SWITCH_BUDGET, 10) || 3; // s <= 100
exports.INIT_SWITCH_BUDGET = INIT_SWITCH_BUDGET;
const SLOT_COUNT = parseInt(process.env.SLOT_COUNT, 10) || 20; // k <= s/7 <= 14
exports.SLOT_COUNT = SLOT_COUNT;
const INIT_PLAYER_WEALTH = SLOT_COUNT * 500;
exports.INIT_PLAYER_WEALTH = INIT_PLAYER_WEALTH;
const INIT_PULL_BUDGET = SLOT_COUNT * 500;
exports.INIT_PULL_BUDGET = INIT_PULL_BUDGET;
const MAX_PULL_STAKE = 3;
exports.MAX_PULL_STAKE = MAX_PULL_STAKE;
const TIME_LIMIT = 2 * 60 * 1000; // 2 minutes
exports.TIME_LIMIT = TIME_LIMIT;
// const TIME_LIMIT = 2 * 1000;
const WIN_RATE = {
    DEFAULT: 0.47,
    WINNING: 0.6,
};
exports.WIN_RATE = WIN_RATE;
const PRODUCTION = process.env.NODE_ENV === 'production';
exports.PRODUCTION = PRODUCTION;
const MONGODB_URI = process.env.MONGODB_URI;
exports.MONGODB_URI = MONGODB_URI;
