package clients.java;

import java.nio.ByteBuffer;
import java.nio.channels.SocketChannel;
import java.nio.file.Path;
import java.util.Optional;
import java.io.IOException;
import java.net.StandardProtocolFamily;
import java.net.UnixDomainSocketAddress;
import com.alibaba.fastjson.JSONObject;

public class Client {

  private SocketChannel channel = null;
  private UnixDomainSocketAddress address = null;
  private boolean debug = false;

  Client(String socketPath, String name, boolean debug) {
    /*
     * Bandit Game Java-17 Client
     *
     * Args:
     * socketPath (str): path to a temp file for the unix domain socket.
     * name (str, optional): client name. Defaults to "python_client".
     *
     */

    this.debug = debug;
    Path socketFile = Path
        .of(System.getProperty("user.home"))
        .resolve(socketPath);

    address = UnixDomainSocketAddress.of(socketFile);
    try {
      channel = SocketChannel
          .open(StandardProtocolFamily.UNIX);
      channel.connect(address);
      send("CONNECTED", 0);
      System.out.println("Connected to " + address);
    } catch (Exception e) {
      System.out.println(e);
    }
  }

  private void send(
      /*
       * Send a JSON message to the server
       */
      String type, JSONObject data)
      throws IOException {
    ByteBuffer buffer = ByteBuffer.allocate(1024);
    JSONObject message = new JSONObject();
    message.put("type", type);
    message.put("data", data);
    String messageString = message.toJSONString();
    if (debug) {
      System.out.println("Sending: " + messageString);
    }
    buffer.clear();
    buffer.put(messageString.getBytes());
    buffer.flip();
    while (buffer.hasRemaining()) {
      this.channel.write(buffer);
    }
  }

  private void send(
      /*
       * Send a int message to the server
       */
      String type, int data)
      throws IOException {
    ByteBuffer buffer = ByteBuffer.allocate(1024);
    JSONObject message = new JSONObject();
    message.put("type", type);
    message.put("data", data);
    String messageString = message.toJSONString();
    if (debug) {
      System.out.println("Sending: " + messageString);
    }
    buffer.clear();
    buffer.put(messageString.getBytes());
    buffer.flip();
    while (buffer.hasRemaining()) {
      this.channel.write(buffer);
    }
  }

  private Optional<String> readMessageFromSocket()
      /*
       * Read a message from the server.
       */
      throws IOException {
    ByteBuffer buffer = ByteBuffer.allocate(1024);
    int bytesRead = channel.read(buffer);
    if (bytesRead < 0)
      return Optional.empty();

    byte[] bytes = new byte[bytesRead];
    buffer.flip();
    buffer.get(bytes);
    String message = new String(bytes);
    return Optional.of(message);
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
    if (debug) {
      System.out.println("Received: " + message);
    }

    JSONObject json = JSONObject.parseObject(message);
    String type = json.getString("type");
    JSONObject data = json.getJSONObject("data");

    try {
      switch (type) {
        case "AWAIT_CASINO_INIT":
          int init_slot = this.casino_action_init(data.getInteger("switch_budget"), data.getInteger("slot_count"),
              data.getInteger("player_wealth"));
          this.send("SWITCH", init_slot);
          break;
        case "AWAIT_CASINO":
          int slot = this.casino_action(data.getInteger("switch_budget"), data.getInteger("slot_count"),
              data.getInteger("player_wealth"), data.getInteger("player_switched"));
          this.send("SWITCH", slot);
          break;
        case "AWAIT_PLAYER":
          JSONObject player_action = this.player_action(data.getInteger("player_wealth"),
              data.getInteger("slot_count"),
              data.getInteger("pull_budget"));
          this.send("PLAYER_ACTION", player_action);
          break;
        case "GAME_OVER":
          System.out.println("GAME OVER");
          // channel.close();
          // System.exit(0);
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

  public JSONObject player_action(int player_wealth, int slot_count, int pull_budget) {
    /*
     * Called when the player can pull the lever of a slot machine
     *
     * Args:
     * `player_wealth` (int): player's wealth
     * `slot_count` (int): total number of slots
     * `pull_budget` (int): number of remaining pulls
     *
     * Returns:
     * `(slot_number, bet_amount)` where `slot_number` is in range [1, slot_count]
     * and bet_amount is in range [1, player_wealth]
     */

    JSONObject data = new JSONObject();

    data.put("slot", 1);
    data.put("stake", 1);

    return data;
  }

  public static void main(String[] args) {
    Client client = new Client("/tmp/bandit.sock", "java_client", true);

    try {
      while (true) {
        client.readMessageFromSocket()
            .ifPresent(client::onMessage);
      }
    } catch (Exception e) {
      e.printStackTrace();
    }
  }
}
