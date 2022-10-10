const net = require("net");
const Colyseus = require("colyseus.js");
const fs = require("fs");

const unixSocketPath = process.argv[2] ?? "/tmp/bandit.sock";
const serverURI = process.argv[3] ?? "ws://localhost:22222";
const name = process.argv[4] ?? "anonymous";
const debug = process.argv[5] && process.argv[5].toLowerCase() === "true";

try {
  fs.unlinkSync(unixSocketPath);
} catch (e) {}

const proxyServer = net.createServer(async (bot) => {
  const gameClient = new Colyseus.Client(serverURI);

  bot.setEncoding("utf8");

  let room = null;

  // On message from client, send to game server
  bot.on("data", async (chunk) => {
    const { type, data } = JSON.parse(chunk);
    if (debug)
      console.log(`PROXY received from client { type, data }`, {
        type,
        data,
      });
    if (type === "CONNECTED") {
      room = await gameClient.joinOrCreate("bandit", {
        name,
      });
      if (debug) console.log("PROXY: Connected to game server");

      room.onMessage("*", (type, data) => {
        try {
          if (debug)
            console.log(`PROXY: received from game server`, { type, data });
          bot.write(JSON.stringify({ type, data }));
          if (type === "GAME_OVER") {
            room.leave();
            if (debug) console.log("🛑 PROXY: GAME OVER");
            process.exit(0);
          }
        } catch (e) {
          if (debug) console.log("PROXY: Error sending message to client");
        }
      });
    }

    if (type !== undefined && data !== undefined) room.send(type, data);
  });

  // On client disconnect, leave game server
  bot.on("end", () => {
    if (debug) console.log("PROXY: client disconnected");
    if (room)
      try {
        room.leave();
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
