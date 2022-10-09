import {
  CasinoActionRequest,
  CasinoActionResponse,
  EndGameRequest,
  PlayerActionRequest,
  PlayerActionResponse,
} from "../../src/types";

// Both min and max are inclusive
function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max + 1 - min) + min);
}

export default class RandomClient {
  casinoActionInit(data: CasinoActionRequest): CasinoActionResponse {
    // Set winning slot to a random slot
    return getRandomInt(1, data.slot_count);
  }
  casinoAction(data: CasinoActionRequest): CasinoActionResponse {
    // Ran out of switch budget
    if (data.switch_budget === 0) return 0;

    // Switch winning slot to a random slots with 10% chance
    if (getRandomInt(0, 9) === 0) return getRandomInt(1, data.slot_count);
    // Send 0 if not switching
    else return 0;
  }
  playerAction(data: PlayerActionRequest): PlayerActionResponse {
    return {
      // 1 / SLOT_COUNT chance to stop playing if slot=0 is sent
      slot: getRandomInt(0, data.slot_count),
      stake: getRandomInt(1, 3),
    };
  }
  end(data: EndGameRequest) {
    return;
  }
}
