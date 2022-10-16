"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveRecord = void 0;
const fs_1 = __importDefault(require("fs"));
const teams_1 = __importDefault(require("../driver/teams"));
const config_1 = require("./config");
const path_1 = __importDefault(require("path"));
const data = [];
const nTeams = teams_1.default.length;
const games = Object.fromEntries(teams_1.default.map((t) => [t.name, 0]));
const addData = (d) => {
    // console.log('📝 Saved Game Record', d);
    data.push(d);
    // games[d.player] += 1;
    // console.log(
    //   '📝 Saved Game Record',
    //   Object.fromEntries(
    //     Object.entries(games).map(([k, v]) => [k, `${v}/${nTeams - 1}`])
    //   )
    // );
};
exports.saveRecord = addData;
const filePath = path_1.default.join(process.cwd(), 'logs', `${config_1.SLOT_COUNT}_${config_1.INIT_SWITCH_BUDGET}_${new Date().toISOString()}.json`);
const onExit = () => {
    fs_1.default.writeFileSync(filePath, JSON.stringify(data));
    console.log(`⚡ SERVER | 📝 Tournament log saved to ${filePath}`);
    process.exit(0);
};
process.on('SIGINT', onExit);
process.on('SIGTERM', onExit);
process.on('exit', onExit);
