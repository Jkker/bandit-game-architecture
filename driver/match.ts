import { EndGameRequest as Result } from '../server/types';
import { Driver } from './driver';

type ExecArg = {
  name: string;
  casinoCmd: string;
  playerCmd: string;
};

const quiet = true;
const verbose = false;

const serverURI = 'ws://localhost:22222';

class Match {
  p1: ExecArg;
  p2: ExecArg;
  n: number;
  constructor(p1: ExecArg, p2: ExecArg, n: number = 1) {
    this.p1 = p1;
    this.p2 = p2;
    this.n = n;
  }

  async startCasino(team: ExecArg) {
    const agent = new Driver(team.casinoCmd, {
      serverURI,
      name: team.name,
      isPrivate: true,
      room: 'pvp',
      quiet,
      verbose,
    });
    const roomId = await agent.connect();
    if (!roomId) {
      throw new Error('No room id');
    }
    await agent.start();
    return roomId;
  }

  async startPlayer(team: ExecArg, roomId: string, cb: any) {
    const agent = new Driver(team.playerCmd, {
      serverURI,
      name: team.name,
      room: 'pvp',
      roomId,
      quiet,
      gameOverCallback: cb,
      verbose,
    });
    await agent.connect();
    await agent.start();
  }
  match(p1, p2): Promise<Result> {
    return new Promise((resolve, reject) => {
      this.startCasino(p1).then((roomId) => {
        this.startPlayer(p2, roomId, resolve);
      });
    });
  }
  async start() {
    const matches = [];

    for (let i = 0; i < this.n; i++) {
      matches.push(this.match(this.p1, this.p2));
      // matches.push(this.match(this.p2, this.p1));
    }
    const startTime = Date.now();
    console.log('Starting match:', this.p1.name, "VS", this.p2.name);
    await Promise.all(matches);
    const endTime = Date.now();
    console.log(
      'Finished match: ',
      this.p1.name,
      this.p2.name,
      `⏳ ${Math.round((endTime - startTime) / 100) / 10}s`
    );
    process.send('done');
  }
}

const p1: ExecArg = {
  name: process.env.name1,
  casinoCmd: process.env.casino1,
  playerCmd: process.env.player1,
};

const p2: ExecArg = {
  name: process.env.name2,
  casinoCmd: process.env.casino2,
  playerCmd: process.env.player2,
};

const n = parseInt(process.env.nGames ?? '1', 10);

const match = new Match(p1, p2, n);

match.start();
