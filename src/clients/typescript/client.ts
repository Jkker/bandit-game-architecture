// Demo Typescript Client with Random Strategy

import * as Colyseus from "colyseus.js";
import {
  CasinoActionRequest,
  EndGameRequest,
  MESSAGE,
  PlayerActionRequest,
} from "../../types";

import RandomClient from "./Random";

const client = new Colyseus.Client("ws://localhost:22222");

client
  .joinOrCreate("bandit", {
    name: "Random Client",
  })
  .then((room) => {
    const randomClient = new RandomClient();

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
  })
  .catch((e) => {
    console.log("JOIN ERROR", e);
  });
