"use strict";
// Demo Typescript Client with Random Strategy
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Colyseus = __importStar(require("colyseus.js"));
const types_1 = require("../../types");
const Random_1 = __importDefault(require("./Random"));
const client = new Colyseus.Client("ws://localhost:22222");
client
    .joinOrCreate("bandit", {
    name: "Random Client",
})
    .then((room) => {
    const randomClient = new Random_1.default();
    room.onMessage(types_1.MESSAGE.AWAIT_CASINO_INIT, (data) => {
        console.log(types_1.MESSAGE.AWAIT_CASINO_INIT, data);
        const action = randomClient.casinoActionInit(data);
        console.log(types_1.MESSAGE.SWITCH, action);
        room.send(types_1.MESSAGE.SWITCH, action);
    });
    room.onMessage(types_1.MESSAGE.AWAIT_CASINO, (data) => {
        console.log(types_1.MESSAGE.AWAIT_CASINO, data);
        const action = randomClient.casinoAction(data);
        console.log(types_1.MESSAGE.SWITCH, action);
        room.send(types_1.MESSAGE.SWITCH, action);
    });
    room.onMessage(types_1.MESSAGE.AWAIT_PLAYER, (data) => {
        console.log(types_1.MESSAGE.AWAIT_PLAYER, data);
        const action = randomClient.playerAction(data);
        console.log(types_1.MESSAGE.PULL, action);
        room.send(types_1.MESSAGE.PULL, action);
    });
    room.onMessage(types_1.MESSAGE.END, (data) => {
        console.warn(`🛑 Game Ended`, data);
        randomClient.end(data);
    });
})
    .catch((e) => {
    console.log("JOIN ERROR", e);
});
