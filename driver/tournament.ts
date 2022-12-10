import { ChildProcessWithoutNullStreams, fork, spawn } from 'child_process';
import { createInterface } from 'readline';
import { EndGameRequest as Result } from '../server/types';
import teams, { getCmd, Team } from './teams';

class Tournament {
  teams: Team[] = [];
  config: {
    slots: number;
    switches: number;
    port: number;
    serverURI: string;
    nGames: number;
  };
  results: Result[] = [];

  server: ChildProcessWithoutNullStreams;
  debug: boolean;

  constructor(
    teams: Team[],
    { slots = 14, switches = 2, port = 22222, nGames = 2, debug = false }
  ) {
    this.teams = teams;
    this.config = {
      slots,
      switches,
      port,
      serverURI: 'ws://localhost:' + port,
      nGames,
    };
    this.debug = debug;
  }
  async startServer(): Promise<
    [ChildProcessWithoutNullStreams, Error | undefined]
  > {
    return new Promise((resolve, reject) => {
      this.server = spawn('node', ['./dist/server/index.js'], {
        env: {
          ...process.env,
          SLOT_COUNT: this.config.slots.toString(),
          INIT_SWITCH_BUDGET: this.config.switches.toString(),
          PORT: this.config.port.toString(),
          NODE_ENV: 'production',
        },
      });
      const outFeed = createInterface({ input: this.server.stdout });
      const errFeed = createInterface({ input: this.server.stderr });

      outFeed.on('line', (line) => {
        console.log(line);
        if (line.includes('⚔️  Listening on ')) {
          resolve([this.server, undefined]);
        }
      });
      errFeed.on('line', (line) => {
        console.error(line);
        reject([undefined, new Error(line)]);
      });
    });
  }
  getPairings() {
    // Generate the round robin pairings
    const pairings: Array<Array<number>> = [];
    for (let i = 0; i < this.teams.length; i++) {
      for (let j = 0; j < this.teams.length; j++) {
        if (i !== j) pairings.push([i, j]);
      }
    }
    return pairings;
  }

  runMatch(p1: number, p2: number) {
    const team1 = this.teams[p1];
    const team2 = this.teams[p2];
    const cmd1 = getCmd(team1);
    const cmd2 = getCmd(team2);

    const env = {
      name1: team1.name,
      name2: team2.name,
      casino1: cmd1.casino,
      casino2: cmd2.casino,
      player1: cmd1.player,
      player2: cmd2.player,
      nGames: this.config.nGames.toString(),
    };
    fork('./dist/driver/match.js', {
      env,
    });
  }

  async start() {
    console.log('🥇 Starting Tournament', '|', {
      ...this.config,
      teams: this.teams.length,
    });
    const [server, error] = await T.startServer();
    if (error) {
      console.error('🚨 Error starting server', error);
      process.exit(1);
    }
    const onExit = () => {
      server.kill();
      console.log('⚡ Exiting...');
      process.exit(0);
    };

    process.on('SIGINT', onExit);
    process.on('SIGTERM', onExit);

    const pairings = this.getPairings();

    for (const [p1, p2] of pairings) {
      this.runMatch(p1, p2);
    }
  }
}

const slots = process.argv[2] ? parseInt(process.argv[2]) : 14;
const switches = process.argv[3] ? parseInt(process.argv[3]) : 2;

const T = new Tournament(teams, {
  slots,
  switches,
  port: 22222,
  debug: false,
  nGames: 1,
});

T.start();
