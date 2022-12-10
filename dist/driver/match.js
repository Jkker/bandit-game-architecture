"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
const driver_1 = require("./driver");
const quiet = true;
const verbose = false;
const serverURI = 'ws://localhost:22222';
class Match {
    constructor(p1, p2, n = 1) {
        this.p1 = p1;
        this.p2 = p2;
        this.n = n;
    }
    startCasino(team) {
        return __awaiter(this, void 0, void 0, function* () {
            const agent = new driver_1.Driver(team.casinoCmd, {
                serverURI,
                name: team.name,
                isPrivate: true,
                room: 'pvp',
                quiet,
                verbose,
            });
            const roomId = yield agent.connect();
            if (!roomId) {
                throw new Error('No room id');
            }
            yield agent.start();
            return roomId;
        });
    }
    startPlayer(team, roomId, cb) {
        return __awaiter(this, void 0, void 0, function* () {
            const agent = new driver_1.Driver(team.playerCmd, {
                serverURI,
                name: team.name,
                room: 'pvp',
                roomId,
                quiet,
                gameOverCallback: cb,
                verbose,
            });
            yield agent.connect();
            yield agent.start();
        });
    }
    match(p1, p2) {
        return new Promise((resolve, reject) => {
            this.startCasino(p1).then((roomId) => {
                this.startPlayer(p2, roomId, resolve);
            });
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            const matches = [];
            for (let i = 0; i < this.n; i++) {
                matches.push(this.match(this.p1, this.p2));
                // matches.push(this.match(this.p2, this.p1));
            }
            const startTime = Date.now();
            console.log('Starting match:', this.p1.name, 'VS', this.p2.name);
            yield Promise.all(matches);
            const endTime = Date.now();
            console.log('Finished match: ', this.p1.name, this.p2.name, `⏳ ${Math.round((endTime - startTime) / 100) / 10}s`);
            process.send('done');
        });
    }
}
const p1 = {
    name: process.env.name1,
    casinoCmd: process.env.casino1,
    playerCmd: process.env.player1,
};
const p2 = {
    name: process.env.name2,
    casinoCmd: process.env.casino2,
    playerCmd: process.env.player2,
};
const n = parseInt((_a = process.env.nGames) !== null && _a !== void 0 ? _a : '1', 10);
const match = new Match(p1, p2, n);
match.start();
