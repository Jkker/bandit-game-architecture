"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveRecord = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const config_1 = require("./config");
const data = [];
const addData = (d) => {
    data.push(d);
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
