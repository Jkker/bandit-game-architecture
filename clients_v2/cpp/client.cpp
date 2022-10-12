#define EVENT_TYPE_AWAIT_CASINO_INIT 0
#define EVENT_TYPE_AWAIT_CASINO 1
#define EVENT_TYPE_AWAIT_PLAYER 2
#define EVENT_TYPE_GAME_OVER 3
#define EVENT_TYPE_PULL 4
#define EVENT_TYPE_SWITCH 5
#define COMMAND_PREFIX "command:"

#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <sys/types.h>
#include <string>
#include <iostream>

using namespace std;

class Client
{
public:
	string name;
	string room;

	~Client(){};
	Client(){};

	void start();

	int casino_action_init(int switch_budget, int slot_count, int player_wealth);
	int casino_action(int switch_budget, int slot_count, int player_wealth, int player_switched);
	pair<int, int> player_action(int player_wealth, int slot_count, int pull_budget);
};

/* Called when the casino is initialized

Args:
	-	`switch_budget` (int): number of remaining switches for the winning slot
	-	`slot_count` (int): total number of slots
	-	`player_wealth` (int): player's wealth

Returns:
	-	initial winning slot number in range [1, slot_count] */
int Client::casino_action_init(int switch_budget, int slot_count, int player_wealth)
{
	return 1;
}

/* Called after the player has pulled the lever of a slot machine

Args:
	-	`switch_budget` (int): number of remaining switches for the winning slot
	-	`slot_count` (int): total number of slots
	-	`player_wealth` (int): player's wealth
	-	`player_switched` (int): whether the player switched to a different slot machine (1 if yes, 0 if no)

Returns:
	-	`0` if not switching OR winning slot number in range [1, slot_count] */
int Client::casino_action(int switch_budget, int slot_count, int player_wealth, int player_switched)
{
	return 0;
}

/* Called when the player can pull the lever of a slot machine

Args:
	-	`player_wealth` (int) : player's wealth
	-	`slot_count` (int) : total number of slots
	-	`pull_budget` (int) : number of remaining pulls

Returns:
		`slot_number, bet_amount` where `slot_number` is in range[1, slot_count] and
															bet_amount is in range[1, player_wealth] */
pair<int, int> Client::player_action(int player_wealth, int slot_count, int pull_budget)
{
	return make_pair(0, 0);
}

void Client::start()
/*
 * Start the game loop
 */
{
	cout << "Starting game loop" << endl;

	while (1)
	{
		string message;
		getline(cin, message);
		int type = stoi(strtok(&message[0], " "));

		switch (type)
		{
		case EVENT_TYPE_AWAIT_CASINO_INIT:
		{
			int switch_budget = stoi(strtok(NULL, " "));
			int slot_count = stoi(strtok(NULL, " "));
			int player_wealth = stoi(strtok(NULL, " "));

			int action = casino_action_init(switch_budget, slot_count, player_wealth);

			cout << COMMAND_PREFIX << EVENT_TYPE_SWITCH << " " << action << endl;
			break;
		}
		case EVENT_TYPE_AWAIT_CASINO:
		{
			int switch_budget = stoi(strtok(NULL, " "));
			int slot_count = stoi(strtok(NULL, " "));
			int player_wealth = stoi(strtok(NULL, " "));
			int player_switched = stoi(strtok(NULL, " "));

			int action = casino_action(switch_budget, slot_count, player_wealth, player_switched);
			cout << COMMAND_PREFIX << EVENT_TYPE_SWITCH << " " << action << endl;
			break;
		}
		case EVENT_TYPE_AWAIT_PLAYER:
		{
			int player_wealth = stoi(strtok(NULL, " "));
			int slot_count = stoi(strtok(NULL, " "));
			int pull_budget = stoi(strtok(NULL, " "));

			pair<int, int> action = player_action(player_wealth, slot_count, pull_budget);
			cout << COMMAND_PREFIX << EVENT_TYPE_PULL << " " << action.first << " " << action.second << endl;
			break;
		}
		case EVENT_TYPE_GAME_OVER:
		{
			return;
		}
		default:
			return;
		}
	}
}

int main()
{
	Client *client = new Client();
	client->start();
	return 0;
}