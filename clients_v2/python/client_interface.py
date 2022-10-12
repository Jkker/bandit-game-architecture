# -*- coding: UTF-8 -*-

import os


class EVENT_TYPE:
    """Event & Action types"""
    AWAIT_CASINO_INIT = 0
    AWAIT_CASINO = 1
    AWAIT_PLAYER = 2
    GAME_OVER = 3
    PULL = 4
    SWITCH = 5
    COMMAND_PREFIX = "command:"


class BanditClientInterface:
    """Bandit Game Python 3 Client Template
    """

    def __init__(self, debug=False) -> None:
        """Bandit Game Python 3 Client Constructor
        """
        self.debug = debug

    def start(self) -> None:
        """Start the client
        """
        while True:
            message = input()
            self.on_message(message)

    def on_message(self, message) -> None:
        """Invoked when a message is received from the game server.

        Please do not override this method; override `casino_action_init`, `casino_action`, and `player_action` methods to implement your game play logic.

        Args:
            message (str): message received from the game server
        """
        type = int(message[0])

        if self.debug: print('received:', type, message[2:])

        if type == EVENT_TYPE.AWAIT_CASINO_INIT:
            switch_budget, slot_count, player_wealth = map(
                int, message[2:].split(" "))

            slot = self.casino_action_init(switch_budget, slot_count,
                                           player_wealth)
            self.send(EVENT_TYPE.SWITCH, slot)
        elif type == EVENT_TYPE.AWAIT_CASINO:
            switch_budget, slot_count, player_wealth, player_switched = map(
                int, message[2:].split(" "))

            slot = self.casino_action(switch_budget, slot_count, player_wealth,
                                      player_switched)
            self.send(EVENT_TYPE.SWITCH, slot)

        elif type == EVENT_TYPE.AWAIT_PLAYER:

            player_wealth, slot_count, pull_budget = map(
                int, message[2:].split(" "))
            slot, stake = self.player_action(player_wealth, slot_count,
                                             pull_budget)

            self.send(EVENT_TYPE.PULL, slot, stake)

        elif type == EVENT_TYPE.GAME_OVER:
            if self.debug: print('🛑 GAME ENDED')
            self.exit()
            os._exit(0)

    def send(self, type, *data) -> None:
        """Sends a message to the game server; please do not override this method

        Args:
            type (string): message type
            data (any): payload to send
        """

        if self.debug:
            print('sending:',
                  EVENT_TYPE.COMMAND_PREFIX,
                  type,
                  *data,
                  sep=' ',
                  end='\n')
        print(EVENT_TYPE.COMMAND_PREFIX, type, *data, sep=' ', end='\n')

    def exit(self) -> None:
        """Exit handler for cleanup purposes; please do not override this method
        """
        if self.debug: print('Exiting Bandit Game Python 3 Client')

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
