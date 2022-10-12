package clients_v2.java;

import java.io.IOException;
import java.util.Arrays;
import java.util.Scanner;

public class Client {

  private boolean debug = false;
  private Scanner scanner = new Scanner(System.in);

  private static final int AWAIT_CASINO_INIT = 0;
  private static final int AWAIT_CASINO = 1;
  private static final int AWAIT_PLAYER = 2;
  private static final int GAME_OVER = 3;
  private static final int PULL = 4;
  private static final int SWITCH = 5;
  private static final String COMMAND_PREFIX = "command:";

  Client(boolean debug) {
    /*
     * Bandit Game Java-17 Client
     *
     * Args:
     * debug (boolean): If true, print debug messages.
     */

    this.debug = debug;
  }

  public void start() {
    while (true) {
      String message = scanner.nextLine();
      message.split(" ", 0);
      onMessage(message);
    }
  }

  public void stop() {
    scanner.close();
    System.exit(0);
  }

  private void send(
      /*
       * Send a JSON message to the server
       */
      int type,
      int data[])
      throws IOException {
    System.out.println(COMMAND_PREFIX + Integer
        .toString(type) + " " + Integer.toString(data[0]) + " " + Integer.toString(data[1]));
  }

  private void send(
      /*
       * Send a JSON message to the server
       */
      int type, int data)
      throws IOException {
    System.out.println(COMMAND_PREFIX + Integer.toString(type) + " " + Integer.toString(data));
  }

  private void onMessage(String message) {
    /*
     * Invoked when a message is received from the game server.
     *
     * Please do not override or edit this method; override or edit
     * `casino_action_init`, `casino_action`, and `player_action` methods to
     * implement your game play logic.
     *
     * Args:
     * message (str): message received from the game server
     */
    if (debug)
      System.out.println("received: " + message);

    int[] args = Arrays.stream(message.split(" ", 0)).mapToInt(Integer::parseInt).toArray();
    int type = args[0];

    try {
      switch (type) {
        case AWAIT_CASINO_INIT:

          int init_slot = this.casino_action_init(args[1], args[2], args[3]);
          this.send(SWITCH, init_slot);
          break;
        case AWAIT_CASINO:
          int slot = this.casino_action(args[1], args[2], args[3], args[4]);
          this.send(SWITCH, slot);
          break;
        case AWAIT_PLAYER:
          int[] player_action = this.player_action(args[1], args[2], args[3]);
          this.send(PULL, player_action);
          break;
        case GAME_OVER:
          if (debug)
            System.out.println("GAME OVER");
          this.stop();
          break;
        default:
          break;
      }
    } catch (Exception e) {
      e.printStackTrace();
    }

  }

  public int casino_action_init(int switch_budget, int slot_count, int player_wealth) {
    /*
     * Called when the casino is initialized
     *
     * Args:
     * `switch_budget` (int): number of remaining switches for the winning slot
     * `slot_count` (int): total number of slots
     * `player_wealth` (int): player's wealth
     *
     * Returns:
     * initial winning slot number in range [1, slot_count]
     */

    return 1;
  }

  public int casino_action(int switch_budget, int slot_count, int player_wealth, int player_switched) {
    /*
     * Called after the player has pulled the lever of a slot machine
     *
     * Args:
     * `switch_budget` (int): number of remaining switches for the winning slot
     * `slot_count` (int): total number of slots
     * `player_wealth` (int): player's wealth
     * `player_switched` (bool): whether the player switched to a different slot
     * machine
     *
     * Returns:
     * `0` if not switching OR winning slot number in range [1, slot_count]
     */

    return 0;
  }

  public int[] player_action(int player_wealth, int slot_count, int pull_budget) {
    /*
     * Called when the player can pull the lever of a slot machine
     *
     * Args:
     * `player_wealth` (int): player's wealth
     * `slot_count` (int): total number of slots
     * `pull_budget` (int): number of remaining pulls
     *
     * Returns:
     * `[slot_number, bet_amount]` where `slot_number` is in range [1, slot_count]
     * and bet_amount is in range [1, player_wealth]
     */
    int[] action = new int[2];
    action[0] = 1;
    action[1] = 1;

    return action;
  }

  public static void main(String[] args) {
    Client client = new Client(false);
    client.start();
  }
}
