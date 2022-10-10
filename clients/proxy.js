const net = require("net");
const Colyseus = require("colyseus.js");
const fs = require("fs");

let debug = false;

const unixSocketPath = process.argv[2] ?? "/tmp/bandit.sock";

try {
  fs.unlinkSync(unixSocketPath);
} catch (e) {}

const proxyServer = net.createServer(async (bot) => {
  bot.setEncoding("utf8");

  let gameClient = null;
  let gameRoom = null;

  let name = "anonymous";
  let serverURI = "ws://localhost:22222";
  let roomType = "pvp";

  // On message from client, send to game server
  bot.on("data", async (chunk) => {
    const { type, data = {} } = JSON.parse(chunk);
    debug = data.debug;
    if (data.name) name = data.name;
    if (data.server_uri) serverURI = data.server_uri;
    if (data.room) roomType = data.room;

    if (debug)
      console.log(`PROXY received from client { type, data }`, {
        type,
        data,
      });
    if (type === "CONNECTED") {
      gameClient = new Colyseus.Client(serverURI);
      gameRoom = await gameClient.joinOrCreate(roomType, {
        name,
      });
      if (debug) console.log("PROXY: Connected to game server");

      gameRoom.onMessage("*", (type, data) => {
        try {
          if (debug)
            console.log(`PROXY: received from game server`, { type, data });
          bot.write(JSON.stringify({ type, data }));
          if (type === "GAME_OVER") {
            gameRoom.leave();
            if (debug) console.log("🛑 PROXY: GAME OVER");
            process.exit(0);
          }
        } catch (e) {
          if (debug) console.log("PROXY: Error sending message to client");
        }
      });
    }

    if (type !== undefined && data !== undefined) gameRoom.send(type, data);
  });

  // On client disconnect, leave game server
  bot.on("end", () => {
    if (debug) console.log("PROXY: client disconnected");
    if (gameRoom)
      try {
        gameRoom.leave();
      } catch (e) {}
  });
});

proxyServer.on("listening", () => {
  if (debug) console.log(`PROXY: LISTENING ON ${unixSocketPath}`);
});
proxyServer.listen(unixSocketPath);

process.on("exit", () => {
  try {
    fs.unlinkSync(unixSocketPath);
  } catch (e) {}
});
