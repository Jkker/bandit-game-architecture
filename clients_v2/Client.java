//package clients_v2.java;

import java.io.IOException;
import java.util.Arrays;
import java.util.Random;
import java.util.Scanner;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.*;

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
  private Casino casino;

  private static int playerTurns = 0;
  private Player player;

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


    System.out.println("INITIALED WITH BUDGET "+ switch_budget);
    System.out.println("*********");
    casino = new Casino(switch_budget, slot_count, player_wealth);
    int slotPicked = casino.pickASpecialSlot();

    casino.setWinProbability(slot_count);
    casino.incrementTurn();

    System.out.println("INITIALLY SLOT PICKED :: "+slotPicked);
    return slotPicked;
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

    casino.setPlayerWinLoss(player_wealth);
    casino.setPlayerSwitch(player_switched);
    int k = casino.pickASpecialSlot();
    casino.incrementTurn();


//    Random rand = new Random();
//    int a = 1 + rand.nextInt(slot_count);
//    System.out.println("SLOT MACHINES .... "+slot_count);
//    return a;
    System.out.println(" SLOT PICKED :: "+k);

    return k;
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
    if(playerTurns == 0) {
      player = new Player(player_wealth, slot_count, pull_budget);
    }
    int []action = new int[2];
    int []res = player.getNextSlotAndBetAmt(player_wealth, slot_count, pull_budget);
    action[0] = res[0];
    action[1] = res[1];

    playerTurns++;
    if(action[0] == 0){
      System.out.println("Player has stopped the game");
      return action;
    } else {
      System.out.println("Player is betting "+action[1]+" amt on slot machine "+action[0]);
    }

    return action;
//    return new int[]{1,2};
  }

  public static void main(String[] args) {
    Client client = new Client(false);
    client.start();
  }
}


class Casino {
  private int switchBudget;
  private Map<Integer,Integer> playerWinPerTurn;
  private Map<Integer,Integer> playerSwitchPerTurn;
  private int currentWealthOfPlayer;
  private int totalSlotMachines;
  int turn;
  int specialSlot;
  int totalWins;
  double winProbability;
  int totalSwitches;
  private Random rand ;


  public Casino(int switchBud, int numberOfSlotMachines, int initalWealth) {
    switchBudget = switchBud;
    currentWealthOfPlayer = initalWealth;
    totalSlotMachines = numberOfSlotMachines;
    turn = 0;
    specialSlot = -1;
    playerWinPerTurn = new HashMap<>();
    playerSwitchPerTurn = new HashMap<>();
    totalWins = 0;
    totalSwitches = 0;
    winProbability = 0;

    rand = new Random();
  }

  public void setPlayerWinLoss(int newPlayerWealth) {
    int winOrLoss = currentWealthOfPlayer - newPlayerWealth;
    playerWinPerTurn.put(turn, winOrLoss);
    currentWealthOfPlayer = newPlayerWealth;

    if(winOrLoss > 0) {
      totalWins++;
    }

    System.out.println("THIS is turn:"+turn+" Win/LOSS == "+winOrLoss);
  }

  public int getPlayerSwitchPercentage() {
    int numberOfSwitchesPer7 = 0;
    for(int i = turn; i >= turn-6; i--) {
      if(playerSwitchPerTurn.get(i) == 1) {
        numberOfSwitchesPer7 ++;
      }
    }

    numberOfSwitchesPer7 = numberOfSwitchesPer7/7;
    return numberOfSwitchesPer7;
  }

  public void setWinProbability(int totalSlotMachines) {

    winProbability = (0.6 + (totalSlotMachines-1)*0.47)/totalSlotMachines;
    System.out.println(" *** Win Probabiliy: "+ winProbability);
  }

  public void setPlayerSwitch(int playerSwitch) {
    playerSwitchPerTurn.put(turn, playerSwitch);

    if(playerSwitch == 1) {
      totalSwitches++;
    }
  }

  public boolean decreaseSwitchBudget() {
    if(switchBudget>0) {
      switchBudget--;
      return true;
    } else {
      System.out.println(" SWITCH NOT POSSIBLE!!!!");
      return false;
    }
  }

  public int switchSlotAndUpdateBudget() {
    specialSlot = 1 + rand.nextInt(totalSlotMachines);

    return specialSlot;
  }

  public int pickASpecialSlot() {
    if (turn==0) {
      return switchSlotAndUpdateBudget();
    }

    if(turn >= 1000 && (turn % (25 * totalSlotMachines)) == 0) {
      // check number of wins
      // if greater than 50% and switching > 50% , then switchSpecialSlot
      System.out.println(" ******* WINS @" + turn +": "+totalWins);
      System.out.println(" ******* SWITCHES @" + turn +": "+totalSwitches);
      if(totalWins > 0.55*turn && totalSwitches < 0.70*turn &&  totalSwitches > 0.30*turn) {
        if(decreaseSwitchBudget())
          return switchSlotAndUpdateBudget();
      }
    }
    return 0;
  }

  public void incrementTurn() {
    turn++;
  }
}


class Player {
  ArrayList<SlotMachine> slotMachines;

  int initial_tokens;
  int total_pulls;

  int pullsSoFar;
  ArrayList<Pull> pulls;

  int cur_tokens;
  SlotMachine cur_slot;
  int cur_bet;

  double loss_threshold;
  double profit_threshold;

  int allSlotsIterations ;

  HashSet<SlotMachine> usedSlotMachines;

  public Player(int player_wealth, int slot_count, int pull_budget) {
    slotMachines = new ArrayList<>();
    for(int i =1; i <= slot_count; i++) {
      SlotMachine slotMachine = new SlotMachine(i);
      slotMachines.add(slotMachine);
    }

    initial_tokens = player_wealth;
    total_pulls = pull_budget;
    pullsSoFar = 0;
    pulls = new ArrayList<>();
    usedSlotMachines = new HashSet<>();

    cur_tokens = initial_tokens;
    loss_threshold = player_wealth * 0.96;
    profit_threshold = player_wealth * 1.2;
    cur_bet = 0;
    cur_slot = null;

    allSlotsIterations = 0;
  }

  public int[] getNextSlotAndBetAmt(int remaining_player_wealth, int slot_count, int remaining_pulls) {
    int []res = new int[2];
    System.out.println("REMAINING PLAYER WEALTH --- "+remaining_player_wealth);
    System.out.println("LOSS THRESHOLD -----"+loss_threshold);
    System.out.println("WIN THRESHOLD ----" + profit_threshold);
    if(remaining_pulls == 0 || remaining_player_wealth <= loss_threshold || remaining_player_wealth >= profit_threshold) {
      return res;
    }
    if(pullsSoFar == 0) {
      SlotMachine sm = slotMachines.get(getRandomNumber(slotMachines.size()));
      cur_bet = 1;
      cur_slot = sm;
      res[0] = cur_slot.slotNum;
      res[1] = cur_bet;
      pullsSoFar++;
      Pull p = new Pull(pullsSoFar, cur_slot.slotNum, Integer.MAX_VALUE);
      pulls.add(p);
      cur_slot.playerHistory.put(pullsSoFar, Integer.MAX_VALUE);
      return res;

    } else {
      int proloss = remaining_player_wealth - cur_tokens;
      //cur_token = remaining_player_wealth;
      cur_tokens = remaining_player_wealth;

      //update pulls arrayList
      for(int i = 0 ;i < pulls.size(); i++) {
        if(pulls.get(i).pullNum == pullsSoFar){
          pulls.get(i).winOrLossAmt = proloss;
        }
      }

      //update slot's player_history hashmap
      cur_slot.playerHistory.put(pullsSoFar, proloss);

      if(proloss > 0) {

        //get current_bet = Min(cur_bet+1, 3);
        if(remaining_player_wealth >= 3) {
          if(cur_bet < 3){
            cur_bet++;
          } else {
            cur_bet = 3;
          }
        } else {
          cur_bet = remaining_player_wealth;
        }

        //populate res
        res[0] = cur_slot.slotNum;
        res[1] = cur_bet;

      }
      else if(proloss < 0){

        //put the slot machine in used hashset
        this.usedSlotMachines.add(cur_slot);

        //get new random slot machine
        boolean flag = true;
        SlotMachine sm_fresh = null;
        SlotMachine sm_max_wins = null;
        SlotMachine sm = null;
        if(this.usedSlotMachines.size() == slotMachines.size()) {
          this.usedSlotMachines.clear();
          allSlotsIterations++;
        }
        while(flag) {
          sm_fresh = slotMachines.get(getRandomNumber(slotMachines.size()));
          if(!this.usedSlotMachines.contains(sm_fresh))
            flag = false;
        }
        sm_max_wins = getRandomSlotMachineWithMaxWins();


        if(allSlotsIterations < 50) {
          sm = chooseSlotMachineWithProbability(sm_fresh, 100, sm_max_wins, 0);
        } else if(allSlotsIterations >= 50 && allSlotsIterations < 100) {
          sm = chooseSlotMachineWithProbability(sm_fresh, 75, sm_max_wins, 25);
        } else if(allSlotsIterations >= 100 && allSlotsIterations < 150) {
          sm = chooseSlotMachineWithProbability(sm_fresh, 50, sm_max_wins, 50);
        } else if(allSlotsIterations >= 150 && allSlotsIterations < 200) {
          sm = chooseSlotMachineWithProbability(sm_fresh, 25, sm_max_wins, 75);
        } else {
          sm = chooseSlotMachineWithProbability(sm_fresh, 0, sm_max_wins, 100);
        }

        //cur_slot
        //cur_bet = 1
        //populate res
        cur_bet = 1;
        cur_slot = sm;
        res[0] = cur_slot.slotNum;
        res[1] = cur_bet;

      }
      //pullsSoFar++;
      pullsSoFar++;

      //Create new pull
      Pull p = new Pull(pullsSoFar, cur_slot.slotNum, Integer.MAX_VALUE);
      pulls.add(p);

      //Add entry in new slot machine's hashmap
      cur_slot.playerHistory.put(pullsSoFar, Integer.MAX_VALUE);

      return res;

    }
  }

  public int getRandomNumber(int bound) {
    Random rand = new Random();
    int a = rand.nextInt(bound);
    return a;
  }

  public SlotMachine chooseSlotMachineWithProbability(SlotMachine sm_fresh, int fresh_probability, SlotMachine sm_max_wins, int used_probability) {
    int randomNum = getRandomNumber(101);
    if(randomNum <= fresh_probability) {
      return sm_fresh;
    } else {
      return sm_max_wins;
    }
  }

  public ArrayList<SlotMachine> varianceOfTop5Wins() {
    Map<SlotMachine, Integer> slotWins = new HashMap<>();
    ArrayList<SlotMachine> machinesToConsider = new ArrayList<>();

    double variance = 0;
    double mean = 0;
    for(int i=0;i<5;i++) {
      for(Map.Entry<Integer, Integer> entry: slotMachines.get(i).playerHistory.entrySet()) {
        if(entry.getValue() > 0) {
          if(slotWins.containsKey(slotMachines.get(i))) {
            int wins = slotWins.get(slotMachines.get(i));
            wins++;
            slotWins.put(slotMachines.get(i), wins);
          } else {
            slotWins.put(slotMachines.get(i), 1);
          }
        }

      }
    }

    for(Map.Entry<SlotMachine, Integer> entry: slotWins.entrySet()) {
      mean += entry.getValue();
    }

    mean = mean/5;

    for(Map.Entry<SlotMachine, Integer> entry: slotWins.entrySet()) {
      variance += Math.pow(entry.getValue() - mean, 2);
    }

    variance = variance / 4;
    double standard_deviation = Math.sqrt(variance);


    if(standard_deviation < 10) {
      for(Map.Entry<SlotMachine, Integer> entry: slotWins.entrySet()) {
        machinesToConsider.add(entry.getKey());
      }

    } else {
      for(Map.Entry<SlotMachine, Integer> entry: slotWins.entrySet()) {
        if(entry.getValue() > mean) {
          machinesToConsider.add(entry.getKey());
        }
      }

    }

    return machinesToConsider;

  }

  public SlotMachine getRandomSlotMachineWithMaxWins() {
    SlotMachine sm ;
    Collections.sort(slotMachines, new Comparator<SlotMachine>() {
      @Override
      public int compare(SlotMachine a, SlotMachine b) {
        int awins = 0;
        int bwins = 0;
        for(Map.Entry<Integer, Integer> entry: a.playerHistory.entrySet()) {
          if(entry.getValue() > 0)
            awins++;
        }
        for(Map.Entry<Integer, Integer> entry: b.playerHistory.entrySet()) {
          if(entry.getValue() > 0)
            bwins++;
        }
        return bwins-awins;
      }
    });
    int numSlotMachinesToBeConsidered = 3;
    ArrayList<SlotMachine> machinesToConsider = varianceOfTop5Wins();
    System.out.println("CONSIDERING MACHINES ----- ");
    for(int i=0;i<machinesToConsider.size();i++) {
      System.out.print("SLOT MACHINE SNUMBER *** "+ machinesToConsider.get(i).getSlotNo() + " ");
    }
    System.out.println();
    sm = machinesToConsider.get(getRandomNumber(machinesToConsider.size()));
    return sm;
  }


}



class SlotMachine {
  private int slotNo;
  private ArrayList<Integer> winTurns;
  private ArrayList<Integer> lossTurns;
  private HashMap<Integer, Integer> playerTurnAndMoney;
  private boolean isWinningSlot;

  int slotNum;
  HashMap<Integer, Integer> playerHistory;

  public SlotMachine(int slotNumber) {
    slotNo = slotNumber;
    winTurns = new ArrayList<>();
    lossTurns = new ArrayList<>();
    playerTurnAndMoney = new HashMap<>();
    isWinningSlot = false;

    slotNum = slotNumber;
    playerHistory = new HashMap<Integer, Integer>();
  }

  public int getSlotNo() {
    return slotNo;
  }

  public ArrayList<Integer> getWinTurns() {
    return winTurns;
  }

  public void addWinTurns(int turn) {
    winTurns.add(turn);
  }

  public ArrayList<Integer> getLossTurns() {
    return lossTurns;
  }

  public void addLossTurn(int turn) {
    lossTurns.add(turn);
  }

  public int getMoneyForPlayerTurn(int turn) {
    return playerTurnAndMoney.get(turn);
  }

  public void insertPlayerTurnAndMoney(int turn, int money) {
    this.playerTurnAndMoney.put(turn, money);
  }

  public boolean isWinningSlot() {
    return isWinningSlot;
  }

  public void setWinningSlot(boolean winningSlot) {
    isWinningSlot = winningSlot;
  }
}



class Pull {
  int pullNum;
  int slotNum;
  int winOrLossAmt;

  public Pull(int pullNum, int slotNum, int proloss) {
    this.pullNum = pullNum;
    this.slotNum = slotNum;
    this.winOrLossAmt = proloss;
  }
}