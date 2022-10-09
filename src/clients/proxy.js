const net = require("net");
const Colyseus = require("colyseus.js");

const unixSocketPath = process.argv[2] ?? "/tmp/bandit.sock";
const serverURI = process.argv[3] ?? "ws://localhost:2567";
console.log(`🚀 ~ file: ipc.js ~ line 7 ~ serverURI`, serverURI);

// if (fs.existsSync(unixSocketPath)) {
//   console.log("Removing existing socket file");
//   fs.unlinkSync(unixSocketPath);
// }

var ipcServer = net.createServer((sock) => {
  const client = new Colyseus.Client(serverURI);

  const send = (type, data = {}) => sock.write(JSON.stringify({ type, data }));

  sock.setEncoding("utf8");

  client
    .joinOrCreate("bandit", {
      name: "Random Client",
    })
    .then((room) => {
      // sock.write(JSON.stringify({ type: "connected" }));
      send("server connected");

      room.onMessage("*", (type, data) => {
        sock.write(JSON.stringify({ type, data }));
      });
    })
    .catch((e) => {
      console.log("ERROR", e);
      sock.write(JSON.stringify({ type: "error", data: e }));
    });

  sock.on("end", () => {
    console.log("client disconnected");
  });

  sock.on("data", (chunk) => {
    sock.write(chunk);
  });
});

ipcServer.on("listening", () => {
  console.log(`CLIENT LAUNCHED`);
});
ipcServer.listen(unixSocketPath);
