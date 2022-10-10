import appConfig from "../server/arena.config";
import RandomClient from "../clients/typescript/Random";
import {
  CasinoActionRequest,
  EndGameRequest,
  MESSAGE,
  PlayerActionRequest,
} from "../server/types";
import { boot, ColyseusTestServer } from "@colyseus/testing";

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

  room.onMessage(MESSAGE.GAME_OVER, (data: EndGameRequest) => {
    console.warn(`🛑 Game Ended`, data);
    randomClient.end(data);
  });
};

describe("Random Client Unit Test", () => {
  let colyseus: ColyseusTestServer;
  before(async () => (colyseus = await boot(appConfig)));
  after(async () => colyseus.shutdown());

  beforeEach(async () => await colyseus.cleanup());

  it("Run Game", async () => {
    // `room` is the server-side Room instance reference.
    const room = await colyseus.createRoom("bandit", {});

    // `client1` is the client-side `Room` instance reference (same as JavaScript SDK)
    const casino = await colyseus.connectTo(room, { name: "P1" });
    initClient(casino);
    const player = await colyseus.connectTo(room, { name: "P2" });
    initClient(player);

    await Promise.race([
      casino.waitForMessage(MESSAGE.GAME_OVER),
      player.waitForMessage(MESSAGE.GAME_OVER),
    ]);
  });
});
