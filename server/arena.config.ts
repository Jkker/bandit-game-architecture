import Arena from '@colyseus/arena';
import { monitor } from '@colyseus/monitor';

/**
 * Import your Room files
 */
import basicAuth from 'express-basic-auth';
import { MyRoom } from './room';
import { VsRandomCasino } from './vsRandomCasino';
import { VsRandomPlayer } from './vsRandomPlayer';

const basicAuthMiddleware = basicAuth({
  // list of users and passwords
  users: {
    admin: 'admin',
  },
  // sends WWW-Authenticate header, which will prompt the user to fill
  // credentials in
  challenge: true,
});

export default Arena({
  getId: () => 'Bandit Game Server v2022.10.10',

  initializeGameServer: (gameServer) => {
    /**
     * Define your room handlers:
     */
    gameServer.define('pvp', MyRoom);
    gameServer.define('vs_random_player', VsRandomPlayer);
    gameServer.define('vs_random_casino', VsRandomCasino);
  },

  initializeExpress: (app) => {
    /**
     * Bind your custom express routes here:
     */
    app.get('/', (req, res) => {
      res.redirect('https://github.com/Jkker/bandit-game-architecture');
    });

    /**
     * Bind @colyseus/monitor
     * It is recommended to protect this route with a password.
     * Read more: https://docs.colyseus.io/tools/monitor/
     */
    app.use('/colyseus', basicAuthMiddleware, monitor());
  },

  beforeListen: () => {
    /**
     * Before before gameServer.listen() is called.
     */
  },
});
