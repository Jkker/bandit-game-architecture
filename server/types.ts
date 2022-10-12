export enum MESSAGE {
  AWAIT_CASINO_INIT = 'AWAIT_CASINO_INIT', // 0
  AWAIT_CASINO = 'AWAIT_CASINO', // 1
  AWAIT_PLAYER = 'AWAIT_PLAYER', // 2

  GAME_OVER = 'GAME_OVER', // 3

  PULL = 'PULL', // 4
  SWITCH = 'SWITCH', // 5
}

export enum MESSAGE_INT {
  AWAIT_CASINO_INIT, // 0
  AWAIT_CASINO, // 1
  AWAIT_PLAYER, // 2

  GAME_OVER, // 3

  PULL, // 4
  SWITCH, // 5
}

// Server -> Client
export interface PlayerActionRequest {
  player_wealth: number;
  slot_count: number;
  pull_budget: number;
}
// Client -> Server
export interface PlayerActionResponse {
  slot: number;
  stake: number;
}
export interface CasinoActionRequest {
  switch_budget: number;
  slot_count: number;
  player_wealth: number;
  player_switched?: boolean;
}

export type CasinoActionResponse = number;

export interface EndGameRequest {
  player_wealth: number;
  reason?: string;
}

// Both min and max are inclusive
export function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max + 1 - min) + min);
}
