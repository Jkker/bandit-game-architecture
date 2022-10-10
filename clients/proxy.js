const net = require("net");
const Colyseus = require("colyseus.js");

const unixSocketPath = process.argv[2] ?? "/tmp/bandit.sock";
const serverURI = process.argv[3] ?? "ws://localhost:22222";
const name = process.argv[4] ?? "anonymous";

const proxyServer = net.createServer((ipcSock) => {
  const gameClient = new Colyseus.Client(serverURI);

  ipcSock.setEncoding("utf8");

  gameClient
    .joinOrCreate("bandit", {
      name,
    })
    .then((room) => {
      // On message from game server, send to client
      room.onMessage("*", (type, data) => {
        ipcSock.write(JSON.stringify({ type, data }));
      });

      // On message from client, send to game server
      ipcSock.on("data", (chunk) => {
        const { type, data } = JSON.parse(chunk);
        room.send(type, data);
      });

      // On client disconnect, leave game server
      ipcSock.on("end", () => {
        console.log("PROXY: client disconnected");
        room.leave();
      });
    })
    .catch((e) => {
      console.log("PROXY ERROR", e);
      ipcSock.write(JSON.stringify({ type: "error", data: e }));
    });
});

proxyServer.on("listening", () => {
  console.log(`PROXY LISTENING ON ${unixSocketPath}`);
});
proxyServer.listen(unixSocketPath);
