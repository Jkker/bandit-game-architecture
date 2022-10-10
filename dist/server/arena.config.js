"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const arena_1 = __importDefault(require("@colyseus/arena"));
const monitor_1 = require("@colyseus/monitor");
/**
 * Import your Room files
 */
const room_1 = require("./room");
const vsRandomPlayer_1 = require("./vsRandomPlayer");
const vsRandomCasino_1 = require("./vsRandomCasino");
exports.default = (0, arena_1.default)({
    getId: () => "Bandit 2022",
    initializeGameServer: (gameServer) => {
        /**
         * Define your room handlers:
         */
        gameServer.define("pvp", room_1.MyRoom);
        gameServer.define("vs_random_player", vsRandomPlayer_1.VsRandomPlayer);
        gameServer.define("vs_random_casino", vsRandomCasino_1.VsRandomCasino);
    },
    initializeExpress: (app) => {
        /**
         * Bind your custom express routes here:
         */
        app.get("/", (req, res) => {
            res.send("It's time to kick ass and chew bubblegum!");
        });
        /**
         * Bind @colyseus/monitor
         * It is recommended to protect this route with a password.
         * Read more: https://docs.colyseus.io/tools/monitor/
         */
        app.use("/colyseus", (0, monitor_1.monitor)());
    },
    beforeListen: () => {
        /**
         * Before before gameServer.listen() is called.
         */
    },
});
