import { Schema, type } from '@colyseus/schema';
import { Client, Delayed, Room } from 'colyseus';

import weighted from 'weighted';
import {
  INIT_PLAYER_WEALTH,
  INIT_PULL_BUDGET,
  INIT_SWITCH_BUDGET,
  MAX_PULL_STAKE,
  PRODUCTION,
  SLOT_COUNT,
  TIME_LIMIT,
  WIN_RATE,
} from './config';

import {
  CasinoActionRequest,
  CasinoActionResponse,
  EndGameRequest,
  MESSAGE,
  PlayerActionRequest,
  PlayerActionResponse,
} from './types';

import { GameRecord } from './model/GameRecord';

class State extends Schema {
  @type('number') wealth: number = 0;
}

export class MyRoom extends Room<State> {
  maxClients = 2;
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
  end_reason?: string;
  game_ended?: boolean = false;

  // END_SECTION Game States

  // SECTION Lifecycle Methods
  onCreate(options: any) {
    this.setState(new State());
    if (options.isPrivate) {
      this.setPrivate();
    }
    this.onMessage(MESSAGE.SWITCH, this.switch.bind(this));
    this.onMessage(MESSAGE.PULL, this.pull.bind(this));
  }

  onJoin(
    client: Client,
    options: {
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
      return;
    }
    // 2nd Player
    if (!this.player) {
      console.log('👨 Player Joined:', options.name, client.sessionId);

      // lock this room for new users
      this.lock();

      this.player = {
        id: client.sessionId,
        name: options.name,
        client: client,
        timer: this.clock.setTimeout(
          () => this.end('Player Timed Out'),
          TIME_LIMIT
        ),
      };
      this.player.timer.pause();

      // Casino has sent initial winning slot
      if (this.winning_slot !== 0) {
        this.awaitPlayerAction();
      }
      return;
    }
  }

  onLeave(client: Client, consented: boolean) {
    if (
      !this.game_ended &&
      this.casino &&
      this.casino.id === client.sessionId
    ) {
      this.end(`Casino ${this.casino.name} Left`);
    }
    if (
      !this.game_ended &&
      this.player &&
      this.player.id === client.sessionId
    ) {
      this.end(`Player ${this.player.name} Left`);
    }
  }

  async save() {
    const log = new GameRecord({
      casino: this.casino.name ?? 'Unknown Casino',
      player: this.player.name ?? 'Unknown Player',
      player_wealth: this.player_wealth,
      switch_budget: this.switch_budget,
      pull_budget: this.pull_budget,
      end_reason: this.end_reason ?? 'Unknown',
    });
    await log.save();
    console.log('📝 Saved Game Record', log.toObject());
  }

  async onDispose() {
    console.log('room', this.roomId, 'disposing...');
    if (PRODUCTION) await this.save();
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
    this.player.client.send(MESSAGE.AWAIT_PLAYER, payload);
    this.player.timer.resume();
  }

  end(reason?: string) {
    this.game_ended = true;
    const payload: EndGameRequest = {
      player_wealth: this.player_wealth,
      reason,
    };
    this.end_reason = reason;
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
    if (this.player) this.awaitPlayerAction();
  }

  // Player Action
  pull(playerClient: Client, message: PlayerActionResponse) {
    this.player.timer.pause();

    // Guards
    if (playerClient.sessionId !== this.player.id)
      return playerClient.error(401, 'You are not the player');

    if (message.stake > this.player_wealth)
      return playerClient.error(
        400,
        `Player pull stake ${message.stake} exceeded current wealth of ${this.player_wealth}`
      );

    if (message.stake > MAX_PULL_STAKE)
      return playerClient.error(
        400,
        `Player pull stake ${message.stake} exceeded max stake of 3`
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
