import Arena from "@colyseus/arena";
import { monitor } from "@colyseus/monitor";

/**
 * Import your Room files
 */
import { MyRoom } from "./room";
import { VsRandomPlayer } from "./vsRandomPlayer";
import { VsRandomCasino } from "./vsRandomCasino";

export default Arena({
  getId: () => "Bandit 2022",

  initializeGameServer: (gameServer) => {
    /**
     * Define your room handlers:
     */
    gameServer.define("pvp", MyRoom);
    gameServer.define("vs_random_player", VsRandomPlayer);
    gameServer.define("vs_random_casino", VsRandomCasino);
  },

  initializeExpress: (app) => {
    /**
     * Bind your custom express routes here:
     */
    app.get("/", (req, res) => {
      res.redirect("https://github.com/Jkker/bandit-game-architecture");
    });

    /**
     * Bind @colyseus/monitor
     * It is recommended to protect this route with a password.
     * Read more: https://docs.colyseus.io/tools/monitor/
     */
    app.use("/colyseus", monitor());
  },

  beforeListen: () => {
    /**
     * Before before gameServer.listen() is called.
     */
  },
});
