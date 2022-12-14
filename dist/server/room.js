"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MyRoom = void 0;
const schema_1 = require("@colyseus/schema");
const colyseus_1 = require("colyseus");
const weighted_1 = __importDefault(require("weighted"));
const config_1 = require("./config");
const types_1 = require("./types");
const db_1 = require("./db");
const GameRecord_1 = require("./model/GameRecord");
class State extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.wealth = 0;
    }
}
__decorate([
    (0, schema_1.type)('number')
], State.prototype, "wealth", void 0);
class MyRoom extends colyseus_1.Room {
    constructor() {
        super(...arguments);
        this.maxClients = 2;
        // SECTION Game States
        // Clients
        this.casino = null;
        this.player = null;
        // Casino Private State
        this.switch_budget = config_1.INIT_SWITCH_BUDGET; // includes initial switch
        this.winning_slot = 0;
        this.casino_timeout = false; // if true, casino will not be allowed to switch slots
        // Player Private State
        this.pull_budget = config_1.INIT_PULL_BUDGET; // includes initial switch
        this.player_wealth = config_1.INIT_PLAYER_WEALTH;
        this.game_ended = false;
        // END_SECTION Utils
    }
    // END_SECTION Game States
    // SECTION Lifecycle Methods
    onCreate(options) {
        this.setState(new State());
        if (options.isPrivate) {
            this.setPrivate();
        }
        this.onMessage(types_1.MESSAGE.SWITCH, this.switch.bind(this));
        this.onMessage(types_1.MESSAGE.PULL, this.pull.bind(this));
    }
    onJoin(client, options) {
        // 1st Player
        if (!this.casino) {
            if (!config_1.PRODUCTION)
                console.log('???? Casino Joined:', options.name, client.sessionId);
            this.casino = {
                id: client.sessionId,
                name: options.name,
                client: client,
                timer: this.clock.setTimeout(() => {
                    this.casino_timeout = true;
                    this.end('Casino Timed Out');
                }, config_1.TIME_LIMIT),
            };
            const casinoInitPayload = {
                switch_budget: this.switch_budget,
                slot_count: config_1.SLOT_COUNT,
                player_wealth: this.player_wealth,
            };
            this.casino.client.send(types_1.MESSAGE.AWAIT_CASINO_INIT, casinoInitPayload);
            return;
        }
        // 2nd Player
        if (!this.player) {
            if (!config_1.PRODUCTION)
                console.log('???? Player Joined:', options.name, client.sessionId);
            // lock this room for new users
            this.lock();
            this.player = {
                id: client.sessionId,
                name: options.name,
                client: client,
                timer: this.clock.setTimeout(() => this.end('Player Timed Out'), config_1.TIME_LIMIT),
            };
            this.player.timer.pause();
            if (!config_1.PRODUCTION)
                console.log('???? Game Started: ', `${this.casino.name}(Casino)`, 'VS', `${this.player.name}(Player)`);
            // Casino has sent initial winning slot
            if (this.winning_slot !== 0) {
                this.awaitPlayerAction();
            }
            return;
        }
    }
    onLeave(client, consented) {
        if (!this.game_ended &&
            this.casino &&
            this.casino.id === client.sessionId) {
            this.end(`Casino ${this.casino.name} Left`);
        }
        if (!this.game_ended &&
            this.player &&
            this.player.id === client.sessionId) {
            this.end(`Player ${this.player.name} Left`);
        }
    }
    save() {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            const data = {
                casino: (_a = this.casino.name) !== null && _a !== void 0 ? _a : 'Unknown Casino',
                player: (_b = this.player.name) !== null && _b !== void 0 ? _b : 'Unknown Player',
                player_wealth: this.player_wealth,
                switch_budget: this.switch_budget,
                pull_budget: this.pull_budget,
                end_reason: (_c = this.end_reason) !== null && _c !== void 0 ? _c : 'Unknown',
            };
            const record = new GameRecord_1.GameRecord(data);
            yield record.save();
            console.log('???? Saved Game Record', data);
        });
    }
    onDispose() {
        var _a, _b, _c;
        return __awaiter(this, void 0, void 0, function* () {
            if (!config_1.PRODUCTION)
                console.log('room', this.roomId, 'disposing...');
            const record = {
                casino: (_a = this.casino.name) !== null && _a !== void 0 ? _a : 'Unknown Casino',
                player: (_b = this.player.name) !== null && _b !== void 0 ? _b : 'Unknown Player',
                player_wealth: this.player_wealth,
                switch_budget: this.switch_budget,
                pull_budget: this.pull_budget,
                end_reason: (_c = this.end_reason) !== null && _c !== void 0 ? _c : 'Unknown',
                timestamp: new Date().toISOString(),
            };
            (0, db_1.saveRecord)(record);
        });
    }
    // END_SECTION Lifecycle Methods
    // SECTION Event Emitters
    awaitCasinoAction(player_switched) {
        const payload = {
            switch_budget: this.switch_budget,
            player_wealth: this.player_wealth,
            player_switched: player_switched,
            slot_count: config_1.SLOT_COUNT,
        };
        this.casino.client.send(types_1.MESSAGE.AWAIT_CASINO, payload);
        this.casino.timer.resume();
    }
    awaitPlayerAction() {
        const payload = {
            player_wealth: this.player_wealth,
            slot_count: config_1.SLOT_COUNT,
            pull_budget: this.pull_budget,
        };
        this.player.client.send(types_1.MESSAGE.AWAIT_PLAYER, payload);
        this.player.timer.resume();
    }
    end(reason) {
        this.game_ended = true;
        const payload = {
            player_wealth: this.player_wealth,
            reason,
            player: this.player.name,
            casino: this.casino.name,
        };
        this.end_reason = reason;
        if (!config_1.PRODUCTION)
            console.log('???? GAME ENDED', Object.assign(Object.assign({}, payload), { player: this.player.name }));
        this.broadcast(types_1.MESSAGE.GAME_OVER, payload);
        this.disconnect();
    }
    // END_SECTION Event Emitters
    // SECTION Event Handlers
    // Casino Action
    switch(casinoClient, slot) {
        this.casino.timer.pause();
        // You are not the casino
        if (casinoClient.sessionId !== this.casino.id)
            return casinoClient.error(401, 'You are not the casino');
        // Casino exceeded max number of switches
        // if (this.switch_budget <= 0 && slot !== 0)
        // ignore this error and continue without returning
        // casinoClient.error(400, 'Casino exceeded max number of switches');
        // Check if this is the initial assignment
        if (!this.winning_slot) {
            // End game if initial assignment is invalid
            if (slot > config_1.SLOT_COUNT || slot < 1) {
                casinoClient.error(400, `Invalid casino initial winning slot assignment: ${slot} is not in range [1,${config_1.SLOT_COUNT}]`);
                this.end(`Invalid casino initial winning slot assignment: ${slot} is not in range [1,${config_1.SLOT_COUNT}]`);
            }
            this.winning_slot = slot;
            if (!config_1.PRODUCTION)
                console.log('???? Initialized Winning Slot: ', slot);
        }
        else {
            // Perform switch if slot is valid & switch_budget > 0
            if (slot !== 0 && slot !== this.winning_slot && this.switch_budget > 0) {
                if (!config_1.PRODUCTION)
                    console.log('???? ', types_1.MESSAGE.SWITCH, slot, `(${this.switch_budget} switches left)`);
                this.switch_budget -= 1;
                this.winning_slot = slot;
            }
            // Determine win / lose and update player wealth
            this.processGamble();
        }
        // Player ran out of money
        if (this.player_wealth <= 0)
            return this.end(`Player ran out of money`);
        // Player has connected
        if (this.player)
            this.awaitPlayerAction();
    }
    // Player Action
    pull(playerClient, message) {
        var _a;
        this.player.timer.pause();
        // Guards
        if (playerClient.sessionId !== this.player.id)
            return playerClient.error(401, 'You are not the player');
        if (message.stake > this.player_wealth)
            return playerClient.error(400, `Player pull stake ${message.stake} exceeded current wealth of ${this.player_wealth}`);
        if (message.stake > config_1.MAX_PULL_STAKE)
            return playerClient.error(400, `Player pull stake ${message.stake} exceeded max stake of 3`);
        if (this.pull_budget <= 0)
            return this.end(`Player ran out of pull budget of ${config_1.INIT_PULL_BUDGET}`);
        if (!message.slot || !message.stake)
            return this.end(`Player decided to stop`);
        if (message.slot > config_1.SLOT_COUNT || message.slot < 1)
            return playerClient.error(400, `Player pull slot ${message.slot} is not in range [1,${config_1.SLOT_COUNT}]`);
        if (!config_1.PRODUCTION)
            console.log('???????', types_1.MESSAGE.PULL, message);
        // Await casino switch
        this.awaitCasinoAction(((_a = this.prev_pull) === null || _a === void 0 ? void 0 : _a.slot) !== message.slot);
        // Store pull data
        this.prev_pull = {
            slot: message.slot,
            stake: message.stake,
        };
    }
    // END_SECTION Event Handlers
    // SECTION Utils
    processGamble() {
        // Update wealth
        const outcomes = [this.prev_pull.stake, -this.prev_pull.stake];
        const hit = this.prev_pull.slot === this.winning_slot;
        const weights = hit
            ? [config_1.WIN_RATE.WINNING, 1 - config_1.WIN_RATE.WINNING]
            : [config_1.WIN_RATE.DEFAULT, 1 - config_1.WIN_RATE.DEFAULT];
        const outcome = weighted_1.default.select(outcomes, weights, {
            normal: true,
        });
        this.pull_budget -= 1;
        this.player_wealth += outcome;
        if (!config_1.PRODUCTION)
            console.log('    OUTCOME', {
                outcome,
                wealth: this.player_wealth,
                pull_budget: this.pull_budget,
            });
    }
}
exports.MyRoom = MyRoom;
