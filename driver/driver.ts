import { ArgumentDefaultsHelpFormatter, ArgumentParser } from 'argparse';
import { ChildProcessWithoutNullStreams, spawn } from 'child_process';
import * as Colyseus from 'colyseus.js';
import { createInterface, Interface } from 'readline';
import { EndGameRequest, MESSAGE, MESSAGE_INT } from '../server/types';

export class Driver {
  name: string = 'stdio_driver';

  // Game Server
  server: Colyseus.Room;
  roomType: string;
  serverURI: string;
  isPrivate: boolean;
  roomId: string;

  // Client Process
  client: ChildProcessWithoutNullStreams;
  outFeed: Interface;
  errFeed: Interface;
  executable: string;
  args: string[];

  verbose: boolean;
  quiet: boolean;
  isCli: boolean;

  gameOverCallback: (data: EndGameRequest) => void;

  constructor(
    command: string,
    {
      serverURI,
      name,
      room,
      roomId,
      isPrivate = false,
      verbose = false,
      quiet = false,
      gameOverCallback = () => {},
      cli = false,
    }: {
      serverURI?: string;
      name?: string;
      room?: string;
      verbose?: boolean;
      isPrivate?: boolean;
      roomId?: string;
      quiet?: boolean;
      gameOverCallback?: (data: EndGameRequest) => void;
      cli?: boolean;
    }
  ) {
    const cmdList = command.split(' ');
    const executable = cmdList[0];
    const cmdArgs = cmdList.slice(1);

    this.name = name;
    this.serverURI = serverURI;
    this.roomType = room;
    this.isPrivate = isPrivate;
    this.roomId = roomId;
    this.verbose = verbose;
    this.executable = executable;
    this.args = cmdArgs;
    this.gameOverCallback = gameOverCallback;
    this.quiet = quiet;
    this.isCli = cli;
  }

  log(message: string, data?: any, isError: boolean = false) {
    if (this.quiet) return;
    if (isError) {
      if (data)
        console.error(`⚠️  DRIVER | ${message}: ${JSON.stringify(data)}`);
      else console.error(`⚠️  DRIVER | ${message}`);
    } else {
      if (data) console.log(`🔵 DRIVER | ${message}: ${JSON.stringify(data)}`);
      else console.log(`🔵 DRIVER | ${message}`);
    }
  }
  async connect() {
    try {
      const client = new Colyseus.Client(this.serverURI);
      if (this.isPrivate) {
        this.server = await client.create(this.roomType, {
          name: this.name,
          isPrivate: true,
        });
        this.log(
          `✅ Created private room ${this.server.id} (use "-j ${this.server.id}" to join this room)`
        );
        return this.server.id;
      }
      if (this.roomId) {
        try {
          this.server = await client.joinById(this.roomId, {
            name: this.name,
          });
          this.log(`✅ Joined private room ${this.server.id}`);
        } catch (e) {
          this.log(
            `Failed to join private room ${this.roomId}. Does this room ID exit?`,
            e,
            true
          );
          process.exit(1);
        }
        return;
      }
      this.server = await client.joinOrCreate(this.roomType, {
        name: this.name,
        isPrivate: this.isPrivate,
      });
      if (this.verbose) this.log(`✅ connected to game server`);
    } catch (e) {
      this.log('error connecting to the game server', e, true);
      process.exit(1);
    }
  }

  async writeToClient(data) {
    return new Promise<void>((resolve, reject) =>
      this.client.stdin.write(data + '\n', (err) => {
        if (this.verbose) this.log(`sent to client`, data);
        if (err) return reject(err);
        return resolve();
      })
    );
  }

  async start() {
    this.client = spawn(this.executable, this.args);
    this.outFeed = createInterface({ input: this.client.stdout });
    this.errFeed = createInterface({ input: this.client.stderr });

    this.outFeed.on('line', (line) => {
      const trimmed = line.trim();

      if (!trimmed.startsWith('command:')) {
        if (!this.quiet) console.log(`💡 CLIENT: ${line}`);
        return;
      }

      try {
        const arr = trimmed
          .slice(8) // replace 'command:' with ''
          .trim()
          .split(' ')
          .map((s) => parseInt(s, 10));
        const type = arr[0];

        switch (type) {
          case MESSAGE_INT.SWITCH:
            this.server.send(MESSAGE.SWITCH, arr[1]);
            if (this.verbose)
              this.log(`sent to server`, `${MESSAGE.SWITCH} ${arr[1]}`);
            break;
          case MESSAGE_INT.PULL:
            this.server.send(MESSAGE.PULL, {
              slot: arr[1],
              stake: arr[2],
            });
            if (this.verbose)
              this.log(
                `sent to server`,
                `${MESSAGE.PULL} ${JSON.stringify({
                  slot: arr[1],
                  stake: arr[2],
                })}`
              );
            break;
        }
      } catch (e) {
        this.log('error parsing client output', e, true);
      }
    });
    this.errFeed.on('line', (line) => {
      this.log(`Client Error`, line, true);
    });

    this.client.on('close', (code, signal) => {
      if (this.verbose) this.log(`client exited with signal ${signal}`);
    });

    this.server.onMessage('*', async (type, data) => {
      try {
        if (this.verbose) this.log(`received from server`, { type, data });
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
            if (!this.quiet) console.log('🛑 GAME OVER', data);
            this.gameOverCallback(data);
            this.client.kill();
            if (this.isCli) process.exit(0);
          }
        }

        // await this.writeToClient(JSON.stringify({ type, data }));
      } catch (e) {
        if (this.verbose) this.log('error sending message to client');
      }
    });
  }
}

const getArgs = () => {
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
  parser.add_argument('-p', '--private', {
    help: 'Create a private pvp room and get the room id',
    action: 'store_true',
  });
  parser.add_argument('-j', '--join', {
    help: 'Join a private room by room id',
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
  if (args.private && args.room !== 'pvp') {
    console.error('Only pvp rooms can be set to private');
    process.exit(1);
  }

  return args;
};

if (require.main === module) {
  const args = getArgs();
  console.log(`🔵 DRIVER | launching client`, args);

  const driver = new Driver(args.command[0], {
    serverURI: args.server,
    name: args.name,
    room: args.room,
    verbose: args.verbose,
    isPrivate: args.private,
    roomId: args.join,
    cli: true,
    // verbose: true,
  });

  (async () => {
    await driver.connect();
    await driver.start();
  })();
}
