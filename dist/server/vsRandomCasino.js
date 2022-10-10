"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VsRandomCasino = void 0;
const schema_1 = require("@colyseus/schema");
const colyseus_1 = require("colyseus");
const weighted_1 = __importDefault(require("weighted"));
const config_1 = require("./config");
const types_1 = require("./types");
class State extends schema_1.Schema {
    constructor() {
        super(...arguments);
        this.wealth = 0;
    }
}
__decorate([
    (0, schema_1.type)("number")
], State.prototype, "wealth", void 0);
class VsRandomCasino extends colyseus_1.Room {
    constructor() {
        super(...arguments);
        this.maxClients = 1;
        // SECTION Game States
        // Clients
        this.casino = null;
        this.player = null;
        // Casino Private State
        this.switch_budget = config_1.INIT_SWITCH_BUDGET; // includes initial switch
        this.winning_slot = (0, types_1.getRandomInt)(1, config_1.SLOT_COUNT);
        this.casino_timeout = false; // if true, casino will not be allowed to switch slots
        // Player Private State
        this.pull_budget = config_1.INIT_PULL_BUDGET; // includes initial switch
        this.player_wealth = config_1.INIT_PLAYER_WEALTH;
        // END_SECTION Utils
    }
    // END_SECTION Game States
    // SECTION Lifecycle Methods
    onCreate(options) {
        this.setState(new State());
        this.onMessage(types_1.MESSAGE.SWITCH, this.switch.bind(this));
        this.onMessage(types_1.MESSAGE.PULL, this.pull.bind(this));
    }
    onJoin(client, options) {
        console.log("👨 Player Joined:", options.name, client.sessionId);
        // lock this room for new users
        this.lock();
        this.player = {
            id: client.sessionId,
            name: options.name,
            client: client,
            timer: this.clock.setTimeout(() => this.end("Player Timed Out"), config_1.TIME_LIMIT),
        };
        this.player.timer.pause();
        // Casino has sent initial winning slot
        this.awaitPlayerAction();
        return;
    }
    onLeave(client, consented) {
        console.log(client.sessionId, "left!");
        this.broadcast(types_1.MESSAGE.GAME_OVER, {
            player_wealth: this.player_wealth,
        });
    }
    onDispose() {
        console.log("room", this.roomId, "disposing...");
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
        let slot = 0;
        if (payload.switch_budget === 0)
            slot = 0;
        // Switch winning slot to a random slots with 10% chance
        else if ((0, types_1.getRandomInt)(0, 9) === 0)
            slot = (0, types_1.getRandomInt)(1, payload.slot_count);
        this.switch(slot);
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
        const payload = {
            player_wealth: this.player_wealth,
            reason,
        };
        console.log("🛑 GAME ENDED", payload);
        this.broadcast(types_1.MESSAGE.GAME_OVER, payload);
        this.disconnect();
    }
    // END_SECTION Event Emitters
    // SECTION Event Handlers
    // Casino Action
    switch(slot) {
        // Casino exceeded max number of switches
        if (this.switch_budget <= 0 && slot !== 0)
            // ignore this error and continue without returning
            console.log(400, "Casino exceeded max number of switches");
        if (this.switch_budget > 0 && slot !== 0) {
            this.switch_budget -= 1;
            this.winning_slot = slot;
        }
        // Determine win / lose and update player wealth
        this.processGamble();
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
            return playerClient.error(401, "You are not the player");
        if (message.stake > this.player_wealth)
            return playerClient.error(400, `Player pull stake ${message.stake} exceeded current wealth of ${this.player_wealth}`);
        if (this.pull_budget <= 0)
            return this.end(`Player ran out of pull budget of ${config_1.INIT_PULL_BUDGET}`);
        if (!message.slot || !message.stake)
            return this.end(`Player decided to stop`);
        if (message.slot > config_1.SLOT_COUNT || message.slot < 1)
            return playerClient.error(400, `Player pull slot ${message.slot} is not in range [1,${config_1.SLOT_COUNT}]`);
        console.log("🕹️", types_1.MESSAGE.PULL, message);
        const player_switched = ((_a = this.prev_pull) === null || _a === void 0 ? void 0 : _a.slot) !== message.slot;
        // Store pull data
        this.prev_pull = {
            slot: message.slot,
            stake: message.stake,
        };
        // Await casino switch
        this.awaitCasinoAction(player_switched);
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
        console.log("    OUTCOME", {
            outcome,
            wealth: this.player_wealth,
            pull_budget: this.pull_budget,
        });
    }
}
exports.VsRandomCasino = VsRandomCasino;
