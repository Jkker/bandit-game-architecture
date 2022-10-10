var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var _a, _b, _c;
const net = require("net");
const Colyseus = require("colyseus.js");
const fs = require("fs");
const unixSocketPath = (_a = process.argv[2]) !== null && _a !== void 0 ? _a : "/tmp/bandit.sock";
const serverURI = (_b = process.argv[3]) !== null && _b !== void 0 ? _b : "ws://localhost:22222";
const name = (_c = process.argv[4]) !== null && _c !== void 0 ? _c : "anonymous";
const debug = process.argv[5] && process.argv[5].toLowerCase() === "true";
try {
    fs.unlinkSync(unixSocketPath);
}
catch (e) { }
const proxyServer = net.createServer((bot) => __awaiter(this, void 0, void 0, function* () {
    const gameClient = new Colyseus.Client(serverURI);
    bot.setEncoding("utf8");
    let room = null;
    // On message from client, send to game server
    bot.on("data", (chunk) => __awaiter(this, void 0, void 0, function* () {
        const { type, data } = JSON.parse(chunk);
        if (debug)
            console.log(`PROXY received from client { type, data }`, {
                type,
                data,
            });
        if (type === "CONNECTED") {
            room = yield gameClient.joinOrCreate("bandit", {
                name,
            });
            if (debug)
                console.log("PROXY: Connected to game server");
            room.onMessage("*", (type, data) => {
                try {
                    if (debug)
                        console.log(`PROXY: received from game server`, { type, data });
                    bot.write(JSON.stringify({ type, data }));
                    if (type === "GAME_OVER") {
                        room.leave();
                        if (debug)
                            console.log("🛑 PROXY: GAME OVER");
                        process.exit(0);
                    }
                }
                catch (e) {
                    if (debug)
                        console.log("PROXY: Error sending message to client");
                }
            });
        }
        if (type !== undefined && data !== undefined)
            room.send(type, data);
    }));
    // On client disconnect, leave game server
    bot.on("end", () => {
        if (debug)
            console.log("PROXY: client disconnected");
        if (room)
            try {
                room.leave();
            }
            catch (e) { }
    });
}));
proxyServer.on("listening", () => {
    if (debug)
        console.log(`PROXY: LISTENING ON ${unixSocketPath}`);
});
proxyServer.listen(unixSocketPath);
process.on("exit", () => {
    try {
        fs.unlinkSync(unixSocketPath);
    }
    catch (e) { }
});
