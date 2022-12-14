import { config } from 'dotenv';

config();

const PORT = parseInt(process.env.PORT, 10) || 22222;

const INIT_SWITCH_BUDGET = parseInt(process.env.INIT_SWITCH_BUDGET, 10) || 3; // s <= 100

const SLOT_COUNT = parseInt(process.env.SLOT_COUNT, 10) || 20; // k <= s/7 <= 14

const INIT_PLAYER_WEALTH = SLOT_COUNT * 500;
const INIT_PULL_BUDGET = SLOT_COUNT * 500;

const MAX_PULL_STAKE = 3;

const TIME_LIMIT = 20 * 60 * 1000; // 2 minutes
// const TIME_LIMIT = 2 * 1000;

const WIN_RATE = {
  DEFAULT: 0.47,
  WINNING: 0.6,
};

const PRODUCTION = process.env.NODE_ENV === 'production';

const MONGODB_URI = process.env.MONGODB_URI;

export {
  SLOT_COUNT,
  INIT_SWITCH_BUDGET,
  WIN_RATE,
  INIT_PLAYER_WEALTH,
  INIT_PULL_BUDGET,
  TIME_LIMIT,
  PORT,
  MAX_PULL_STAKE,
  PRODUCTION,
  MONGODB_URI,
};
