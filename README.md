## Getting Started

1. [**Install NodeJS**](https://nodejs.org/en/download/)
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
4. **Configure Environment Variables** (optional)

   You can edit `SLOT_COUNT (s)`, `SWITCH_BUDGET (k)`, and `PORT` in `development.env`.
    ```sh
    cp .env.example .env
    nano .env  # or vim .env
    ```
5. **Run the server**
    ```sh
    npm run start
    ```
    With environment variable overrides
    ```sh
    SLOT_COUNT=3 SWITCH_BUDGET=10 PORT=8080 npm run start
    ```


## Client Usage

Clients use IPC socket to communicate with a proxy that takes care of authentication, matchmaking, and communication with the game server. Sample clients are provided in the `clients` directory.

- [Python Client](src/clients/python/client.py)
- [Node Typescript Client](src/clients/typescript/client.ts) (no proxy required)
- [Java Client](src/clients/java/Client.java) (WIP)
- [C++ Client](src/clients/cpp/client.cpp) (WIP)


## Documentation
### Swimlane Flowchart

![Swimlane Flowchart](docs/swimlane-flowchart.png)

### WebSocket Events

| Event               | Sender | Receiver | Payload                                                                              |
| ------------------- | ------ | -------- | ------------------------------------------------------------------------------------ |
| `AWAIT_CASINO_INIT` | Server | Casino   | `{ switch_budget: int, slot_count: int, player_wealth: int }`                        |
| `AWAIT_CASINO`      | Server | Casino   | `{ switch_budget: int, slot_count: int, player_wealth: int, player_switched: bool }` |
| `SWITCH`            | Casino | Server   | `{ winning_slot: int }`                                                              |
| `AWAIT_PLAYER`      | Server | Player   | `{ player_wealth: int, slot_count: int, pull_budget: int }`                          |
| `PULL`              | Player | Server   | `{ slot: int, stake: int }`                                                          |

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

## Contact

Please add an issue if you have any questions or suggestions. You can also contact me at [jerryjia@nyu.edu](mailto:jerryjia@nyu.edu)