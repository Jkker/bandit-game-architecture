> 2022 Leaderboard can be found [here](docs/Leaderboard22.md)

## Table of Content

- [Getting Started](#getting-started)
- [Driver Usage](#driver-usage)
  - [Example: PVE](#example-pve)
  - [Example: Private PVP Room](#example-private-pvp-room)
  - [Example: Self-hosted Server & Verbose Output](#example-self-hosted-server--verbose-output)
  - [Arguments](#arguments)
- [Client Development](#client-development)
  - [Events](#events)
  - [Server → Client Messages](#server--client-messages)
    - [#0 `AWAIT_CASINO_INIT`](#0-await_casino_init)
    - [#1 `AWAIT_CASINO`](#1-await_casino)
    - [#2 `AWAIT_PLAYER`](#2-await_player)
  - [Client → Server Messages](#client--server-messages)
    - [#4 `PULL`](#4-pull)
    - [#5 `SWITCH`](#5-switch)
- [Server Usage](#server-usage)
- [Server Development](#server-development)
  - [Swimlane Flowchart](#swimlane-flowchart)
  - [WebSocket Events](#websocket-events)
  - [Specifications](#specifications)
  - [Roles](#roles)
  - [Directories](#directories)
- [Contact](#contact)

## Getting Started

1. [**Install NodeJS**](https://nodejs.org/en/download/) (LTS version)
   if you haven't already
2. **Clone this repository**
   ```sh
   git clone https://github.com/Jkker/bandit-game-architecture
   cd bandit-game-architecture
   ```
3. **Install dependencies**
   ```sh
   npm install
   ```
4. **Implement your client** in one of the supported languages (see [Client Usage](#client-usage) for the details)
    | Language | Template                                                    | Version    |
    | -------- | ----------------------------------------------------------- | ---------- |
    | `C++`    | [`clients/cpp/client.cpp`](clients/cpp/client.cpp)          | C++17      |
    | `Java`   | [`clients/java/Client.java`](clients/java/Client.java)      | Java 17    |
    | `Python` | [`clients/python/client.py`](clients/python/your_client.py) | Python 3.9 |

   You should compile it to an executable binary if needed.

5. **Use the driver to run your client**

   ```sh
    node dist/driver/driver.js "./my_client.out" -n "Player" -r vs_random_casino
   ```

   The driver will automatically connect to the public game server `wss://bandit.erry.dev` and start a game with your client.
   Please limit to 100 connections per IP address to avoid abuse.

## Driver Usage

A [stdin/stdout-based driver](clients/driver.ts) is provided to run your client. It will handle the communication with the server via websocket and proxy the messages to your client via stdin.

```sh
node dist/driver/driver.js [-h] [-n NAME] [-r {pvp,vs_random_player,vs_random_casino}] [-p] [-j ROOM_ID] [-s SERVER] [-v] command
```

### Example: PVE

```sh
node dist/driver/driver.js "java clients/java/Client.java" -n "Java Casino" -r vs_random_player
node dist/driver/driver.js "python3 clients/python/random_client.py" -n "Python Player" -r vs_random_casino
```

### Example: Private PVP Room

```sh
node dist/driver/driver.js "java clients/java/Client.java" -n "Java Casino" -p
# Output:
# 🔵 DRIVER | ✅ Created private room fORyxMB85 (use "-j fORyxMB85" to join this room)
node dist/driver/driver.js "python3 clients/python/random_client.py" -n "Python Player" -j fORyxMB85
```

### Example: Self-hosted Server & Verbose Output

```sh
node dist/driver/driver.js "./my_client.out" -n "My C++ Casino" -s ws://localhost:22222 -v
```

### Arguments

```sh
positional arguments:
  command               Command to run your client

optional arguments:
  -h, --help            show this help message and exit
  -n, --name NAME  Your client name (default: anonymous)
  -r, --room {pvp,vs_random_player,vs_random_casino}
                        Type of room to join (default: pvp)
  -s, --server SERVER   URI of the game server (default: wss://bandit.erry.dev)
  -p, --private         Create a private pvp room and get the room id (default: false)
  -j JOIN, --join JOIN  Join a private room by room id (default: undefined)
  -v, --verbose         Display client and server communication (default: false)
```

## Client Development

Client templates are provided in the `clients` directory. You can use these templates to implement your own client.

| Language | Template                                                    | Version    |
| -------- | ----------------------------------------------------------- | ---------- |
| `C++`    | [`clients/cpp/client.cpp`](clients/cpp/client.cpp)          | C++17      |
| `Java`   | [`clients/java/Client.java`](clients/java/Client.java)      | Java 17    |
| `Python` | [`clients/python/client.py`](clients/python/your_client.py) | Python 3.9 |

Sorry that no Go template is provided as I don't have any experience with Go. If you are interested in contributing, please feel free to open a PR.

### Events

Clients communicates with the driver via `stdin` and `stdout`. The driver will handle the communication with the server.

Clients will receive messages from the driver via `stdin` as a space-separated string. For example, the driver may send the following message to the client:

```sh
0 3 20 10000
```

and the client should interpret it as:

```sh
AWAIT_CASINO_INIT switch_budget=3 slot_count=20 player_wealth=10000
```

Then, the client should send a message to the driver via `stdout`. For example, the client may send the following message to the driver:

```sh
5 1
```

and the driver should interpret it as:

```sh
SWITCH slot_index=1
```

| ID  | Type                | Sender | Receiver | Data                                                     |
| --- | ------------------- | ------ | -------- | -------------------------------------------------------- |
| 0   | `AWAIT_CASINO_INIT` | Server | Casino   | `switch_budget slot_count player_wealth`                 |
| 1   | `AWAIT_CASINO`      | Server | Casino   | `switch_budget slot_count player_wealth player_switched` |
| 2   | `AWAIT_PLAYER`      | Server | Player   | `player_wealth slot_count pull_budget`                   |
| 3   | `GAME_OVER`         | Server | Player   |                                                          |
| 4   | `PULL`              | Player | Server   | `slot stake`                                             |
| 5   | `SWITCH`            | Casino | Server   | `slot`                                                   |

### Server → Client Messages

#### #0 `AWAIT_CASINO_INIT`

This event informs the client that it is the casino for this game. The server now awaits an initial winning slot number to be sent.

- `switch_budget` (int): number of remaining switches for the winning slot
- `slot_count` (int): total number of slots
- `player_wealth` (int): player's wealth

Example: `0 3 20 10000`

The client should then respond to the server with the [`SWITCH` event](#5-switch).

#### #1 `AWAIT_CASINO`

This event informs the client that it is the casino. The server now awaits an new slot number if the casino wants to switch the winning slot or 0 if not.

- `switch_budget` (int): number of remaining switches for the winning slot
- `slot_count` (int): total number of slots
- `player_wealth` (int): player's wealth
- `player_switched` (int): whether the player switched to a different slot machine (1 if yes, 0 if no)

Example: `1 2 20 10001 1`

The client should then respond to the server with the [`SWITCH` event](#5-switch).

#### #2 `AWAIT_PLAYER`

This event informs the client that it is the player for this game. The server now awaits a slot number that the player wants to play and the stake for the bet.

- `player_wealth` (int) : player's wealth
- `slot_count` (int) : total number of slots
- `pull_budget` (int) : number of remaining pulls

The client should then respond to the server with the [`PULL` event](#4-pull).

### Client → Server Messages

The client must prepend an stdout message with "command:" to indicate that it is a message. Other stdout lines will be printed to the console directly.

#### #4 `PULL`

This event informs the server that the player wants to pull the slot machine.

- `slot` (int) : slot number that the player wants to play (1-indexed); 0 if the player wants to quit the game
- `stake` (int) : stake for the bet in range [1,3]

Example: `command: 4 1 3`

#### #5 `SWITCH`

This event informs the server that the casino wants to switch the winning slot.

- `slot` (int) : slot number that the casino wants to switch to (1-indexed); 0 if the casino wants to keep the current winning slot

Example: `command: 5 2`

## Server Usage

The driver uses the public game server at `wss://bandit.erry.dev` by default. If needed, you can run your own server locally.

```sh
npm run start
```

With environment variable overrides

```sh
SLOT_COUNT=3 INIT_SWITCH_BUDGET=10 PORT=8080 npm run start
```

You can also edit [`development.env`](development.env) to edit the environment variable. They will be loaded automatically when you run `npm run start`.

## Server Development

### Swimlane Flowchart

![Swimlane Flowchart](docs/swimlane-flowchart.png)

### WebSocket Events

| Type                | Sender | Receiver | Data                                                                                 |
| ------------------- | ------ | -------- | ------------------------------------------------------------------------------------ |
| `CONNECTION`        | Client | Proxy    | `{ name: str, server_uri: str, room: str, debug: bool }`                             |
| `AWAIT_CASINO_INIT` | Proxy  | Casino   | `{ switch_budget: int, slot_count: int, player_wealth: int }`                        |
| `AWAIT_CASINO`      | Proxy  | Casino   | `{ switch_budget: int, slot_count: int, player_wealth: int, player_switched: bool }` |
| `SWITCH`            | Casino | Proxy    | `{ winning_slot: int }`                                                              |
| `AWAIT_PLAYER`      | Proxy  | Player   | `{ player_wealth: int, slot_count: int, pull_budget: int }`                          |
| `PULL`              | Player | Proxy    | `{ slot: int, stake: int }`                                                          |

### Specifications

- All numbers are 1-indexed; 0 signals `false` in most context
- Timer starts when a event is sent and pauses when a response is received
- `SWITCH` response to `AWAIT_CASINO_INIT` doesn’t decrement `switch_budget`
- `PULL` with `slot = 0` OR `stake = 0` in the payload signals that the player wants to stop playing and leave the casino
- `AWAIT_CASINO` will not be sent to **CASINO** if `switch_budget` ≤ 0
- `SWITCH` with payload 0 means with not switching

### Roles

For simplicity, your client should listen for ALL events. The server will only send events to the appropriate client. The clients will know which role they are by the event they receive.

The first client connected to the server is assigned the role of **CASINO** and will receive the `AWAIT_CASINO_INIT` event. It must respond with the `SWITCH` event to initialize the winning slot. The server will send `AWAIT_CASINO` to the casino after the player gambles at a slot. The casino must respond with the `SWITCH` event whether it wants to update the winning slot or not.

The second client connected to the server is assigned the role of **PLAYER** and will receive the `AWAIT_PLAYER` event. It must respond with the `PULL` event to start the game loop.

### Directories

- `server` - server source code
- `clients` - proxy-based client templates (discontinued)
- `clients` - stdio-based client templates
- `docs` - documentation resources
- `test` - server unit tests, integration tests, and load tests
- `dist` - transpiled code
- `arena.env` - production environment variables
- `development.env` - development environment variables

## Contact

Please add an issue if you have any questions or suggestions. You can also contact me at [jerryjia@nyu.edu](mailto:jerryjia@nyu.edu)
