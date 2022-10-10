# -*- coding: UTF-8 -*-

import atexit
import socket
import json
import subprocess
import os
import time


class BanditClientInterface:
    """Bandit Game Python 3 Client Template
    """

    def __init__(self, name="python_client", debug=False) -> None:
        """Bandit Game Python 3 Client Constructor

        Args:
            name (str, optional): client name. Defaults to "python_client".
            debug (bool, optional): whether to print connection debug messages. Defaults to False.
        """
        self.sock = socket.socket(socket.AF_UNIX, socket.SOCK_STREAM)
        self.client_process = None
        self.name = name
        self.debug = debug

    def start(self,
              unix_socket_path='/tmp/bandit.sock',
              server_uri="ws://localhost:22222") -> None:
        """Start the client

        Launches the proxy server to establish a connection to the game server

        Args:
            unix_socket_path (str, optional): path to a temp file for the unix domain socket. Defaults to `/tmp/bandit.sock`. If the file already exists, a new file will be created with a random suffix.
            server_uri (str, optional): uri to the game server. Defaults to "ws://localhost:22222".
        """
        if os.path.exists(unix_socket_path):
            # os.remove(unix_socket_path)
            self.unix_socket_path = unix_socket_path + "." + str(time.time())
            if self.debug: print("unix_socket_path", self.unix_socket_path)

        else:
            self.unix_socket_path = unix_socket_path

        # Pipe stdout to /dev/null; stderr are printed to console
        # stdout is displayed if debug mode is enabled
        self.client_process = subprocess.Popen(
            [
                'node', 'clients/proxy.js', self.unix_socket_path, server_uri,
                self.name
            ],
            stdout=None if self.debug else subprocess.DEVNULL,
        )

        time.sleep(0.1)
        self.sock.connect(unix_socket_path)
        if self.debug: print('✅ Successfully connected to proxy')
        self.send('CONNECTED', self.name)

        # Register exit handler
        atexit.register(self.exit)

        while True:
            message = self.sock.recv(1024)
            if not message:
                break
            self.on_message(message)

    def on_message(self, message) -> None:
        """Invoked when a message is received from the game server.

        Please do not override this method; override `casino_action_init`, `casino_action`, and `player_action` methods to implement your game play logic.

        Args:
            message (str): message received from the game server
        """
        msg = json.loads(message)

        type = msg['type']
        data = msg['data']
        if self.debug: print('📥 RECEIVED:', type, data)

        if type == 'AWAIT_CASINO_INIT':
            slot = self.casino_action_init(data['switch_budget'],
                                           data['slot_count'],
                                           data['player_wealth'])
            self.send('SWITCH', slot)
        elif type == 'AWAIT_CASINO':
            slot = self.casino_action(data['switch_budget'],
                                      data['slot_count'],
                                      data['player_wealth'],
                                      data['player_switched'])
            self.send('SWITCH', slot)

        elif type == 'AWAIT_PLAYER':
            slot, stake = self.player_action(data['player_wealth'],
                                             data['slot_count'],
                                             data['pull_budget'])

            self.send('PULL', {"slot": slot, "stake": stake})

        elif type == 'GAME_OVER':
            print('🛑 GAME ENDED:', data)
            self.exit()
            os._exit(0)

    def send(self, type, data) -> None:
        """Sends a message to the game server; please do not override this method

        Args:
            type (string): message type
            data (any): payload to send
        """

        msg = {'type': type, 'data': data}
        if self.debug:
            print('✈️  SENT:', type, data)

        self.sock.send(json.dumps(msg).encode())

    def exit(self) -> None:
        """Exit handler for cleanup purposes; please do not override this method
        """
        if self.debug: print('Exiting Bandit Game Python 3 Client')
        self.sock.close()
        self.client_process.kill()
        if os.path.exists(self.unix_socket_path):
            os.remove(self.unix_socket_path)

    def casino_action_init(
        self,
        switch_budget: int,
        slot_count: int,
        player_wealth: int,
    ) -> int:
        """Called when the casino is initialized

        Args:
            `switch_budget` (int): number of remaining switches for the winning slot
            `slot_count` (int): total number of slots
            `player_wealth` (int): player's wealth

        Returns:
            initial winning slot number in range [1, slot_count]
        """
        raise NotImplementedError("casino_action_init not implemented",
                                  switch_budget, slot_count, player_wealth)

    def casino_action(
        self,
        switch_budget: int,
        slot_count: int,
        player_wealth: int,
        player_switched: bool,
    ) -> int:
        """Called after the player has pulled the lever of a slot machine

        Args:
            `switch_budget` (int): number of remaining switches for the winning slot
            `slot_count` (int): total number of slots
            `player_wealth` (int): player's wealth
            `player_switched` (bool): whether the player switched to a different slot machine

        Returns:
            `0` if not switching OR winning slot number in range [1, slot_count]
        """
        raise NotImplementedError("casino_action not implemented",
                                  switch_budget, slot_count, player_wealth,
                                  player_switched)

    def player_action(
        self,
        player_wealth: int,
        slot_count: int,
        pull_budget: int,
    ) -> tuple[int, int]:
        """Called when the player can pull the lever of a slot machine

        Args:
            `player_wealth` (int): player's wealth
            `slot_count` (int): total number of slots
            `pull_budget` (int): number of remaining pulls

        Returns:
            `(slot_number, bet_amount)` where `slot_number` is in range [1, slot_count] and bet_amount is in range [1, player_wealth]
        """

        raise NotImplementedError("player_action not implemented",
                                  player_wealth, slot_count, pull_budget)
