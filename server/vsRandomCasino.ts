import { Schema, type } from "@colyseus/schema";
import { Client, Delayed, Room } from "colyseus";

import weighted from "weighted";
import {
  INIT_PLAYER_WEALTH,
  INIT_PULL_BUDGET,
  INIT_SWITCH_BUDGET,
  SLOT_COUNT,
  TIME_LIMIT,
  WIN_RATE,
} from "./config";

import {
  CasinoActionRequest,
  CasinoActionResponse,
  MESSAGE,
  PlayerActionRequest,
  PlayerActionResponse,
  EndGameRequest,
  getRandomInt,
} from "./types";

class State extends Schema {
  @type("number") wealth: number = 0;
}

export class VsRandomCasino extends Room<State> {
  maxClients = 1;
  // SECTION Game States
  // Clients
  casino: {
    name: string;
    id: string;
    client: Client;
    timer: Delayed;
  } = null;
  player: {
    name: string;
    id: string;
    client: Client;
    timer: Delayed;
  } = null;

  // Casino Private State
  switch_budget: number = INIT_SWITCH_BUDGET; // includes initial switch
  winning_slot: number = getRandomInt(1, SLOT_COUNT);
  casino_timeout: boolean = false; // if true, casino will not be allowed to switch slots

  // Player Private State
  pull_budget: number = INIT_PULL_BUDGET; // includes initial switch
  player_wealth: number = INIT_PLAYER_WEALTH;
  prev_pull: {
    slot: number;
    stake: number;
  };
  // END_SECTION Game States

  // SECTION Lifecycle Methods
  onCreate(options: any) {
    this.setState(new State());
    this.onMessage(MESSAGE.SWITCH, this.switch.bind(this));
    this.onMessage(MESSAGE.PULL, this.pull.bind(this));
  }

  onJoin(
    client: Client,
    options: {
      role?: "P" | "C"; // force set role
      name: string; // team name
    }
  ) {
    console.log("👨 Player Joined:", options.name, client.sessionId);

    // lock this room for new users
    this.lock();

    this.player = {
      id: client.sessionId,
      name: options.name,
      client: client,
      timer: this.clock.setTimeout(
        () => this.end("Player Timed Out"),
        TIME_LIMIT
      ),
    };
    this.player.timer.pause();

    // Casino has sent initial winning slot
    this.awaitPlayerAction();
    return;
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, "left!");
    this.broadcast(MESSAGE.GAME_OVER, {
      player_wealth: this.player_wealth,
    });
  }

  onDispose() {
    console.log("room", this.roomId, "disposing...");
  }
  // END_SECTION Lifecycle Methods

  // SECTION Event Emitters
  awaitCasinoAction(player_switched: boolean) {
    const payload: CasinoActionRequest = {
      switch_budget: this.switch_budget,
      player_wealth: this.player_wealth,
      player_switched: player_switched,
      slot_count: SLOT_COUNT,
    };
    let slot = 0;
    if (payload.switch_budget === 0) slot = 0;
    // Switch winning slot to a random slots with 10% chance
    else if (getRandomInt(0, 9) === 0)
      slot = getRandomInt(1, payload.slot_count);
    this.switch(slot);
  }

  awaitPlayerAction() {
    const payload: PlayerActionRequest = {
      player_wealth: this.player_wealth,
      slot_count: SLOT_COUNT,
      pull_budget: this.pull_budget,
    };
    this.player.client.send(MESSAGE.AWAIT_PLAYER, payload);
    this.player.timer.resume();
  }

  end(reason?: string) {
    const payload: EndGameRequest = {
      player_wealth: this.player_wealth,
      reason,
    };
    console.log("🛑 GAME ENDED", payload);
    this.broadcast(MESSAGE.GAME_OVER, payload);
    this.disconnect();
  }
  // END_SECTION Event Emitters

  // SECTION Event Handlers
  // Casino Action
  switch(slot: CasinoActionResponse) {
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
    if (this.player_wealth <= 0) return this.end(`Player ran out of money`);

    // Player has connected
    if (this.player) this.awaitPlayerAction();
  }

  // Player Action
  pull(playerClient: Client, message: PlayerActionResponse) {
    this.player.timer.pause();

    // Guards
    if (playerClient.sessionId !== this.player.id)
      return playerClient.error(401, "You are not the player");

    if (message.stake > this.player_wealth)
      return playerClient.error(
        400,
        `Player pull stake ${message.stake} exceeded current wealth of ${this.player_wealth}`
      );

    if (this.pull_budget <= 0)
      return this.end(`Player ran out of pull budget of ${INIT_PULL_BUDGET}`);

    if (!message.slot || !message.stake)
      return this.end(`Player decided to stop`);

    if (message.slot > SLOT_COUNT || message.slot < 1)
      return playerClient.error(
        400,
        `Player pull slot ${message.slot} is not in range [1,${SLOT_COUNT}]`
      );

    console.log("🕹️", MESSAGE.PULL, message);

    const player_switched = this.prev_pull?.slot !== message.slot;
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
      ? [WIN_RATE.WINNING, 1 - WIN_RATE.WINNING]
      : [WIN_RATE.DEFAULT, 1 - WIN_RATE.DEFAULT];

    const outcome = weighted.select(outcomes, weights, {
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
  // END_SECTION Utils
}
