#include <stdio.h>
#include <stdlib.h>
#include <unistd.h>
#include <sys/socket.h>
#include <sys/un.h>
#include <sys/types.h>
#include <string>

// json library for modern cpp
#include "json.hpp"

using namespace std;
using json = nlohmann::json;

// static const char *socket_path = "/tmp/bandit.sock";
static const unsigned int s_recv_len = 4096;
static const unsigned int s_send_len = 4096;

class Client
{
public:
	string socket_path;
	string name;
	string room;
	int sock = 0;
	int data_len = 0;
	struct sockaddr_un remote;
	char recv_msg[s_recv_len];

	~Client();
	Client(string name, string socket_path, string server_uri, string room);

	void start();
	void send_data(string msg);

	// TODO: User Defined Game Play Logic
	int casino_action_init(int switch_budget, int slot_count, int player_wealth) { return 1; }
	int casino_action(int switch_budget, int slot_count, int player_wealth, int player_switched) { return 0; }
	pair<int, int> player_action(int player_wealth, int slot_count, int pull_budget) { return make_pair(0, 0); }
};

Client::Client(string name, string socket_path, string server_uri, string room)

/*
 * Bandit Game C++ Client
 *
 * Args:
 * socket_path (str): path to a temp file for the unix domain socket.
 * name (str, optional): client name. Defaults to "python_client".
 * server_uri (str, optional): server uri.
 * room (str, optional): room type ("pvp", "vs_random_player", "vs_random_casino").
 *
 */
{
	this->name = name;
	this->room = room;
	this->socket_path = socket_path;

	memset(recv_msg, 0, s_recv_len * sizeof(char));

	if ((sock = socket(AF_UNIX, SOCK_STREAM, 0)) == -1)
	{
		printf("CLIENT: Error on socket() call \n");
		return;
	}

	remote.sun_family = AF_UNIX;
	strcpy(remote.sun_path, this->socket_path.c_str());
	data_len = strlen(remote.sun_path) + sizeof(remote.sun_family);

	printf("CLIENT: Trying to connect... \n");
	if (connect(sock, (struct sockaddr *)&remote, data_len) == -1)
	{
		printf("CLIENT: Error on connect call \n");
		return;
	}

	printf("CLIENT: Connected \n");

	this->send_data(json({{"type", "CONNECTED"}, {"data", {{"name", this->name}, {"server_uri", server_uri}, {"room", room}, {"debug", true}}}}).dump());
}

Client::~Client()
{
	close(sock);
}
void Client::send_data(string msg)
{
	printf("CLIENT: Sending data %s \n", msg.c_str());
	if (send(sock, msg.c_str(), strlen(msg.c_str()) * sizeof(char), 0) == -1)
	{
		printf("CLIENT: Error on send() call \n");
	}
	printf("CLIENT: Sent!\n");

	return;
}

void Client::start()
/*
 * Start the game loop
 */
{
	json response;

	while (true)
	{
		memset(recv_msg, 0, s_recv_len * sizeof(char));

		if ((data_len = recv(sock, recv_msg, s_recv_len, 0)) > 0)
		{
			printf("CLIENT: Data received: %s \n", recv_msg);

			response = json::parse(recv_msg);
			string type = response["type"];
			json data = response["data"];

			if (response["type"] == "AWAIT_CASINO_INIT")
			{
				int init_slot = this->casino_action_init(data["switch_budget"], data["slot_count"], data["player_wealth"]);
				this->send_data(json({{"type", "SWITCH"}, {"data", init_slot}}).dump());
			}
			else if (response["type"] == "AWAIT_CASINO")
			{
				int switch_slot = this->casino_action(data["switch_budget"], data["slot_count"], data["player_wealth"], data["player_switched"]);
				this->send_data(json({{"type", "SWITCH"}, {"data", switch_slot}}).dump());
			}
			else if (response["type"] == "AWAIT_PLAYER")
			{
				pair<int, int> pull = this->player_action(data["player_wealth"], data["slot_count"], data["pull_budget"]);
				this->send_data(json({{"type", "PULL"}, {"data", {
																														 {"slot", pull.first},
																														 {"stake", pull.second},
																												 }}})
														.dump());
			}
			else if (response["type"] == "GAME_OVER")
			{
				printf("CLIENT: GAME OVER \n");
				// exit(0);
				break;
			}
		}
		else
		{
			if (data_len < 0)
			{
				printf("CLIENT: Error on recv() call \n");
			}
			else
			{
				printf("CLIENT: Proxy Server socket closed \n");
				close(sock);
				break;
			}
		}
	}
}

int main()
{
	string name = "client";
	string socket_path = "/tmp/bandit.sock";
	string server_uri = "ws://localhost:22222";

	// Room Types: "pvp", "vs_random_player", "vs_random_casino"
	Client client(name, socket_path, server_uri, "vs_random_player");
	client.start();

	return 0;
}