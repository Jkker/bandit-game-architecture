import { Schema, type } from '@colyseus/schema';
import { Client, Delayed, Room } from 'colyseus';

import weighted from 'weighted';
import {
  INIT_PLAYER_WEALTH,
  INIT_PULL_BUDGET,
  INIT_SWITCH_BUDGET,
  SLOT_COUNT,
  TIME_LIMIT,
  WIN_RATE,
} from './config';

import {
  CasinoActionRequest,
  CasinoActionResponse,
  EndGameRequest,
  getRandomInt,
  MESSAGE,
  PlayerActionRequest,
  PlayerActionResponse,
} from './types';

class State extends Schema {
  @type('number') wealth: number = 0;
}

export class VsRandomPlayer extends Room<State> {
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
  winning_slot: number = 0;
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
      role?: 'P' | 'C'; // force set role
      name: string; // team name
    }
  ) {
    // 1st Player
    if (!this.casino) {
      console.log('🏦 Casino Joined:', options.name, client.sessionId);
      this.casino = {
        id: client.sessionId,
        name: options.name,
        client: client,
        timer: this.clock.setTimeout(() => {
          this.casino_timeout = true;
          this.end('Casino Timed Out');
        }, TIME_LIMIT),
      };

      const casinoInitPayload: CasinoActionRequest = {
        switch_budget: this.switch_budget,
        slot_count: SLOT_COUNT,
        player_wealth: this.player_wealth,
      };

      this.casino.client.send(MESSAGE.AWAIT_CASINO_INIT, casinoInitPayload);
      this.lock();
      return;
    }
  }

  onLeave(client: Client, consented: boolean) {
    console.log(client.sessionId, 'left!');
    this.broadcast(MESSAGE.GAME_OVER, {
      player_wealth: this.player_wealth,
    });
  }

  onDispose() {
    console.log('room', this.roomId, 'disposing...');
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
    this.casino.client.send(MESSAGE.AWAIT_CASINO, payload);

    this.casino.timer.resume();
  }

  awaitPlayerAction() {
    const payload: PlayerActionRequest = {
      player_wealth: this.player_wealth,
      slot_count: SLOT_COUNT,
      pull_budget: this.pull_budget,
    };
    this.pull({
      slot: getRandomInt(
        0,
        Math.min(payload.slot_count, payload.player_wealth)
      ),
      stake: getRandomInt(1, 3),
    });
  }

  end(reason?: string) {
    const payload: EndGameRequest = {
      player_wealth: this.player_wealth,
      reason,
      player: this.player.name,
      casino: this.casino.name,
    };
    console.log('🛑 GAME ENDED', payload);
    this.broadcast(MESSAGE.GAME_OVER, payload);
    this.disconnect();
  }
  // END_SECTION Event Emitters

  // SECTION Event Handlers
  // Casino Action
  switch(casinoClient: Client, slot: CasinoActionResponse) {
    this.casino.timer.pause();

    // You are not the casino
    if (casinoClient.sessionId !== this.casino.id)
      return casinoClient.error(401, 'You are not the casino');

    // Casino exceeded max number of switches
    if (this.switch_budget <= 0 && slot !== 0)
      // ignore this error and continue without returning
      casinoClient.error(400, 'Casino exceeded max number of switches');

    // Check if this is the initial assignment
    if (!this.winning_slot) {
      // End game if initial assignment is invalid
      if (slot > SLOT_COUNT || slot < 1) {
        casinoClient.error(
          400,
          `Invalid casino initial winning slot assignment: ${slot} is not in range [1,${SLOT_COUNT}]`
        );
        this.end(
          `Invalid casino initial winning slot assignment: ${slot} is not in range [1,${SLOT_COUNT}]`
        );
      }
      this.winning_slot = slot;
      console.log('🏦 Initialized Winning Slot: ', slot);
    } else {
      // Perform switch if slot is valid & switch_budget > 0
      if (slot !== 0 && slot !== this.winning_slot && this.switch_budget > 0) {
        console.log(
          '🏦 ',
          MESSAGE.SWITCH,
          slot,
          `(${this.switch_budget} switches left)`
        );

        this.switch_budget -= 1;
        this.winning_slot = slot;
      }
      // Determine win / lose and update player wealth
      this.processGamble();
    }

    // Player ran out of money
    if (this.player_wealth <= 0) return this.end(`Player ran out of money`);

    // Player has connected
    this.awaitPlayerAction();
  }

  // Player Action
  pull(message: PlayerActionResponse) {
    // this.player.timer.pause();

    // Guards
    // if (playerClient.sessionId !== this.player.id)
    // return playerClient.error(401, "You are not the player");

    if (message.stake > this.player_wealth) return;

    if (this.pull_budget <= 0)
      return this.end(`Player ran out of pull budget of ${INIT_PULL_BUDGET}`);

    if (!message.slot || !message.stake)
      return this.end(`Player decided to stop`);

    if (message.slot > SLOT_COUNT || message.slot < 1) return;

    console.log('🕹️', MESSAGE.PULL, message);

    // Await casino switch
    this.awaitCasinoAction(this.prev_pull?.slot !== message.slot);
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
      ? [WIN_RATE.WINNING, 1 - WIN_RATE.WINNING]
      : [WIN_RATE.DEFAULT, 1 - WIN_RATE.DEFAULT];

    const outcome = weighted.select(outcomes, weights, {
      normal: true,
    });

    this.pull_budget -= 1;
    this.player_wealth += outcome;
    console.log('    OUTCOME', {
      outcome,
      wealth: this.player_wealth,
      pull_budget: this.pull_budget,
    });
  }
  // END_SECTION Utils
}
