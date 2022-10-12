import { ArgumentDefaultsHelpFormatter, ArgumentParser } from 'argparse';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as Colyseus from 'colyseus.js';
import { createInterface, Interface } from 'readline';
import { MESSAGE, MESSAGE_INT } from '../server/types';

const log = (message: string, data?: any, isError: boolean = false) => {
  if (isError) {
    if (data) console.error(`⚠️  DRIVER | ${message}: ${JSON.stringify(data)}`);
    else console.error(`⚠️  DRIVER | ${message}`);
  } else {
    if (data) console.log(`🔵 DRIVER | ${message}: ${JSON.stringify(data)}`);
    else console.log(`🔵 DRIVER | ${message}`);
  }
};

class Driver {
  name: string = 'stdio_driver';

  // Game Server
  server: Colyseus.Room;
  roomType: string;
  serverURI: string;

  // Client Process
  client: ChildProcessWithoutNullStreams;
  outFeed: Interface;
  errFeed: Interface;
  executable: string;
  args: string[];

  verbose: boolean;

  constructor(
    command: string,
    {
      serverURI,
      name,
      room,
      verbose,
    }: {
      serverURI?: string;
      name?: string;
      room?: string;
      verbose?: boolean;
    }
  ) {
    const cmdList = command.split(' ');
    const executable = cmdList[0];
    const cmdArgs = cmdList.slice(1);

    this.name = name;
    this.serverURI = serverURI;
    this.roomType = room;
    this.verbose = verbose;
    this.executable = executable;
    this.args = cmdArgs;
  }
  async connect() {
    try {
      const client = new Colyseus.Client(this.serverURI);
      this.server = await client.joinOrCreate(this.roomType, {
        name: this.name,
      });
      if (this.verbose) log(`✅ connected to game server`);
    } catch (e) {
      log('error connecting to the game server', e, true);
      process.exit(1);
    }
  }

  async writeToClient(data) {
    return new Promise<void>((resolve, reject) =>
      this.client.stdin.write(data + '\n', (err) => {
        if (this.verbose) log(`sent to client`, data);
        if (err) return reject(err);
        return resolve();
      })
    );
  }

  async start() {
    await this.connect();

    this.client = spawn(this.executable, this.args);
    this.outFeed = createInterface({ input: this.client.stdout });
    this.errFeed = createInterface({ input: this.client.stderr });

    this.outFeed.on('line', (line) => {
      // if (this.verbose) log(`received from client`, line);
      if (!line.startsWith('command:')) {
        console.log(`💡 CLIENT: ${line}`);
        return;
      }

      try {
        const arr = line
          .slice(8) // replace 'command:' with ''
          .split(' ')
          .map((s) => parseInt(s, 10));
        const type = arr[0];
        switch (type) {
          case MESSAGE_INT.SWITCH:
            this.server.send(MESSAGE.SWITCH, arr[1]);
            if (this.verbose)
              log(`sent to server`, `${MESSAGE.SWITCH} ${arr[1]}`);
            break;
          case MESSAGE_INT.PULL:
            this.server.send(MESSAGE.PULL, {
              slot: arr[1],
              stake: arr[2],
            });
            if (this.verbose)
              log(
                `sent to server`,
                `${MESSAGE.PULL} ${JSON.stringify({
                  slot: arr[1],
                  stake: arr[2],
                })}`
              );
            break;
        }
      } catch (e) {
        log('error parsing client output', e, true);
      }
    });
    this.errFeed.on('line', (line) => {
      if (this.verbose) log(`received from client`, line, true);
    });

    this.client.on('close', (code, signal) => {
      if (this.verbose) log(`client exited with signal ${signal}`);
    });

    this.server.onMessage('*', async (type, data) => {
      try {
        if (this.verbose) log(`received from server`, { type, data });
        switch (type) {
          case MESSAGE.AWAIT_CASINO_INIT: {
            await this.writeToClient(
              [0, data.switch_budget, data.slot_count, data.player_wealth].join(
                ' '
              )
            );
            break;
          }
          case MESSAGE.AWAIT_CASINO: {
            await this.writeToClient(
              [
                1,
                data.switch_budget,
                data.slot_count,
                data.player_wealth,
                data.player_switched ? 1 : 0,
              ].join(' ')
            );
            break;
          }
          case MESSAGE.AWAIT_PLAYER: {
            await this.writeToClient(
              [2, data.player_wealth, data.slot_count, data.pull_budget].join(
                ' '
              )
            );
            break;
          }
          case MESSAGE.GAME_OVER: {
            await this.writeToClient([3, data.player_wealth].join(' '));
            this.server.leave();
            console.log('🛑 GAME OVER', data);
            process.exit(0);
          }
        }

        // await this.writeToClient(JSON.stringify({ type, data }));
      } catch (e) {
        if (this.verbose) log('error sending message to client');
      }
    });
  }
}
const parser = new ArgumentParser({
  description: 'STDIO-based driver for Bandit Game Clients',
  formatter_class: ArgumentDefaultsHelpFormatter,
  add_help: true,
});

parser.add_argument('command', {
  help: 'Command to run your client (e.g. python3 my_client.py)',
  nargs: 1,
});

parser.add_argument('-n', '--name', {
  help: 'Your client name',
  default: 'anonymous',
});
parser.add_argument('-r', '--room', {
  help: 'Type of room to join',
  choices: ['pvp', 'vs_random_player', 'vs_random_casino'],
  default: 'pvp',
});
parser.add_argument('-s', '--server', {
  help: 'URI of the game server',
  default: 'wss://bandit.erry.dev',
});
parser.add_argument('-v', '--verbose', {
  help: 'Display client and server communication',
  action: 'store_true',
});

const args = parser.parse_args();

log(`launching client`, args);

const driver = new Driver(args.command[0], {
  serverURI: args.server,
  name: args.name,
  room: args.room,
  verbose: args.verbose,
  // verbose: true,
});

driver.start();
