import { Room, Client } from "colyseus.js";
import RandomClient from "../src/client/Random";

import {
  CasinoActionRequest,
  EndGameRequest,
  MESSAGE,
  PlayerActionRequest,
} from "../src/types";

const randomClient = new RandomClient();

const initClient = (room: any) => {
  room.onMessage(MESSAGE.AWAIT_CASINO_INIT, (data: CasinoActionRequest) => {
    console.log(MESSAGE.AWAIT_CASINO_INIT, data);
    const action = randomClient.casinoActionInit(data);
    console.log(MESSAGE.SWITCH, action);
    room.send(MESSAGE.SWITCH, action);
  });

  room.onMessage(MESSAGE.AWAIT_CASINO, (data: CasinoActionRequest) => {
    console.log(MESSAGE.AWAIT_CASINO, data);
    const action = randomClient.casinoAction(data);
    console.log(MESSAGE.SWITCH, action);
    room.send(MESSAGE.SWITCH, action);
  });

  room.onMessage(MESSAGE.AWAIT_PLAYER, (data: PlayerActionRequest) => {
    console.log(MESSAGE.AWAIT_PLAYER, data);
    const action = randomClient.playerAction(data);
    console.log(MESSAGE.PULL, action);
    room.send(MESSAGE.PULL, action);
  });

  room.onMessage(MESSAGE.END, (data: EndGameRequest) => {
    console.warn(`🛑 Game Ended`, data);
    randomClient.end(data);
  });
};

export function requestJoinOptions(this: Client, i: number) {
  return { requestNumber: i };
}

export function onJoin(this: Room) {
  console.log(this.sessionId, "joined.");
  initClient(this);
}

export function onLeave(this: Room) {
  console.log(this.sessionId, "left.");
}

export function onError(this: Room, err: any) {
  console.log(this.sessionId, "!! ERROR !!", err.message);
}

export function onStateChange(this: Room, state: any) {
  console.log(this.sessionId, "new state:", state);
}
