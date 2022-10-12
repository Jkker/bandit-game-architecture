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
const argparse_1 = require("argparse");
const child_process_1 = require("child_process");
const Colyseus = __importStar(require("colyseus.js"));
const readline_1 = require("readline");
const types_1 = require("../server/types");
const log = (message, data, isError = false) => {
    if (isError) {
        if (data)
            console.error(`⚠️  DRIVER | ${message}: ${JSON.stringify(data)}`);
        else
            console.error(`⚠️  DRIVER | ${message}`);
    }
    else {
        if (data)
            console.log(`🔵 DRIVER | ${message}: ${JSON.stringify(data)}`);
        else
            console.log(`🔵 DRIVER | ${message}`);
    }
};
class Driver {
    constructor(command, { serverURI, name, room, verbose, isPrivate, roomId, }) {
        this.name = 'stdio_driver';
        const cmdList = command.split(' ');
        const executable = cmdList[0];
        const cmdArgs = cmdList.slice(1);
        this.name = name;
        this.serverURI = serverURI;
        this.roomType = room;
        this.isPrivate = isPrivate;
        this.roomId = roomId;
        this.verbose = verbose;
        this.executable = executable;
        this.args = cmdArgs;
    }
    connect() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const client = new Colyseus.Client(this.serverURI);
                if (this.isPrivate) {
                    this.server = yield client.create(this.roomType, {
                        name: this.name,
                        isPrivate: true,
                    });
                    log(`✅ Created private room ${this.server.id} (use "-j ${this.server.id}" to join this room)`);
                    return;
                }
                if (this.roomId) {
                    try {
                        this.server = yield client.joinById(this.roomId, {
                            name: this.name,
                        });
                        log(`✅ Joined private room ${this.server.id}`);
                    }
                    catch (e) {
                        log(`Failed to join private room ${this.roomId}. Does this room ID exit?`, e, true);
                        process.exit(1);
                    }
                    return;
                }
                this.server = yield client.joinOrCreate(this.roomType, {
                    name: this.name,
                    isPrivate: this.isPrivate,
                });
                if (this.verbose)
                    log(`✅ connected to game server`);
            }
            catch (e) {
                log('error connecting to the game server', e, true);
                process.exit(1);
            }
        });
    }
    writeToClient(data) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => this.client.stdin.write(data + '\n', (err) => {
                if (this.verbose)
                    log(`sent to client`, data);
                if (err)
                    return reject(err);
                return resolve();
            }));
        });
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.connect();
            this.client = (0, child_process_1.spawn)(this.executable, this.args);
            this.outFeed = (0, readline_1.createInterface)({ input: this.client.stdout });
            this.errFeed = (0, readline_1.createInterface)({ input: this.client.stderr });
            this.outFeed.on('line', (line) => {
                // if (this.verbose) log(`received from client`, line);
                const trimmed = line.trim();
                if (!trimmed.startsWith('command:')) {
                    console.log(`💡 CLIENT: ${line}`);
                    return;
                }
                try {
                    const arr = trimmed
                        .slice(8) // replace 'command:' with ''
                        .trim()
                        .split(' ')
                        .map((s) => parseInt(s, 10));
                    const type = arr[0];
                    switch (type) {
                        case types_1.MESSAGE_INT.SWITCH:
                            this.server.send(types_1.MESSAGE.SWITCH, arr[1]);
                            if (this.verbose)
                                log(`sent to server`, `${types_1.MESSAGE.SWITCH} ${arr[1]}`);
                            break;
                        case types_1.MESSAGE_INT.PULL:
                            this.server.send(types_1.MESSAGE.PULL, {
                                slot: arr[1],
                                stake: arr[2],
                            });
                            if (this.verbose)
                                log(`sent to server`, `${types_1.MESSAGE.PULL} ${JSON.stringify({
                                    slot: arr[1],
                                    stake: arr[2],
                                })}`);
                            break;
                    }
                }
                catch (e) {
                    log('error parsing client output', e, true);
                }
            });
            this.errFeed.on('line', (line) => {
                if (this.verbose)
                    log(`received from client`, line, true);
            });
            this.client.on('close', (code, signal) => {
                if (this.verbose)
                    log(`client exited with signal ${signal}`);
            });
            this.server.onMessage('*', (type, data) => __awaiter(this, void 0, void 0, function* () {
                try {
                    if (this.verbose)
                        log(`received from server`, { type, data });
                    switch (type) {
                        case types_1.MESSAGE.AWAIT_CASINO_INIT: {
                            yield this.writeToClient([0, data.switch_budget, data.slot_count, data.player_wealth].join(' '));
                            break;
                        }
                        case types_1.MESSAGE.AWAIT_CASINO: {
                            yield this.writeToClient([
                                1,
                                data.switch_budget,
                                data.slot_count,
                                data.player_wealth,
                                data.player_switched ? 1 : 0,
                            ].join(' '));
                            break;
                        }
                        case types_1.MESSAGE.AWAIT_PLAYER: {
                            yield this.writeToClient([2, data.player_wealth, data.slot_count, data.pull_budget].join(' '));
                            break;
                        }
                        case types_1.MESSAGE.GAME_OVER: {
                            yield this.writeToClient([3, data.player_wealth].join(' '));
                            this.server.leave();
                            console.log('🛑 GAME OVER', data);
                            process.exit(0);
                        }
                    }
                    // await this.writeToClient(JSON.stringify({ type, data }));
                }
                catch (e) {
                    if (this.verbose)
                        log('error sending message to client');
                }
            }));
        });
    }
}
const parser = new argparse_1.ArgumentParser({
    description: 'STDIO-based driver for Bandit Game Clients',
    formatter_class: argparse_1.ArgumentDefaultsHelpFormatter,
    add_help: true,
});
parser.add_argument('command', {
    help: 'Command to run your client (e.g. python3 my_client.py)',
    nargs: 1,
});
parser.add_argument('-n', '--name', {
    help: 'Your client name',
    default: 'anonymous',
});
parser.add_argument('-r', '--room', {
    help: 'Type of room to join',
    choices: ['pvp', 'vs_random_player', 'vs_random_casino'],
    default: 'pvp',
});
parser.add_argument('-p', '--private', {
    help: 'Create a private pvp room and get the room id',
    action: 'store_true',
});
parser.add_argument('-j', '--join', {
    help: 'Join a private room by room id',
});
parser.add_argument('-s', '--server', {
    help: 'URI of the game server',
    default: 'wss://bandit.erry.dev',
});
parser.add_argument('-v', '--verbose', {
    help: 'Display client and server communication',
    action: 'store_true',
});
const args = parser.parse_args();
if (args.private && args.room !== 'pvp') {
    console.error('Only pvp rooms can be set to private');
    process.exit(1);
}
log(`launching client`, args);
const driver = new Driver(args.command[0], {
    serverURI: args.server,
    name: args.name,
    room: args.room,
    verbose: args.verbose,
    isPrivate: args.private,
    roomId: args.join,
    // verbose: true,
});
driver.start();
