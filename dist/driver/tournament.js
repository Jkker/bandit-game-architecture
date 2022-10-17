"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const readline_1 = require("readline");
const teams_1 = __importStar(require("./teams"));
class Tournament {
    constructor(teams, { slots = 14, switches = 2, port = 22222, nGames = 2, debug = false }) {
        this.teams = [];
        this.results = [];
        this.teams = teams;
        this.config = {
            slots,
            switches,
            port,
            serverURI: 'ws://localhost:' + port,
            nGames,
        };
        this.debug = debug;
    }
    startServer() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                this.server = (0, child_process_1.spawn)('node', ['./dist/server/index.js'], {
                    env: Object.assign(Object.assign({}, process.env), { SLOT_COUNT: this.config.slots.toString(), INIT_SWITCH_BUDGET: this.config.switches.toString(), PORT: this.config.port.toString(), NODE_ENV: 'production' }),
                });
                const outFeed = (0, readline_1.createInterface)({ input: this.server.stdout });
                const errFeed = (0, readline_1.createInterface)({ input: this.server.stderr });
                outFeed.on('line', (line) => {
                    console.log(line);
                    if (line.includes('⚔️  Listening on ')) {
                        resolve([this.server, undefined]);
                    }
                });
                errFeed.on('line', (line) => {
                    console.error(line);
                    reject([undefined, new Error(line)]);
                });
            });
        });
    }
    getPairings() {
        // Generate the round robin pairings
        const pairings = [];
        for (let i = 0; i < this.teams.length; i++) {
            for (let j = 0; j < this.teams.length; j++) {
                if (i !== j)
                    pairings.push([i, j]);
            }
        }
        return pairings;
    }
    runMatch(p1, p2) {
        const team1 = this.teams[p1];
        const team2 = this.teams[p2];
        const cmd1 = (0, teams_1.getCmd)(team1);
        const cmd2 = (0, teams_1.getCmd)(team2);
        const env = {
            name1: team1.name,
            name2: team2.name,
            casino1: cmd1.casino,
            casino2: cmd2.casino,
            player1: cmd1.player,
            player2: cmd2.player,
            nGames: this.config.nGames.toString(),
        };
        (0, child_process_1.fork)('./dist/driver/match.js', {
            env,
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            console.log('🥇 Starting Tournament', '|', Object.assign(Object.assign({}, this.config), { teams: this.teams.length }));
            const [server, error] = yield T.startServer();
            if (error) {
                console.error('🚨 Error starting server', error);
                process.exit(1);
            }
            const onExit = () => {
                server.kill();
                console.log('⚡ Exiting...');
                process.exit(0);
            };
            process.on('SIGINT', onExit);
            process.on('SIGTERM', onExit);
            const pairings = this.getPairings();
            for (const [p1, p2] of pairings) {
                this.runMatch(p1, p2);
            }
            // onExit();
        });
    }
}
const slots = process.argv[2] ? parseInt(process.argv[2]) : 14;
const switches = process.argv[3] ? parseInt(process.argv[3]) : 2;
const T = new Tournament(teams_1.default, {
    slots,
    switches,
    port: 22222,
    debug: false,
    nGames: 1,
});
T.start();
