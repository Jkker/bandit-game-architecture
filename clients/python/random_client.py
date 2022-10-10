# -*- coding: UTF-8 -*-

from client_interface import BanditClientInterface
from random import randint


class RandomClient(BanditClientInterface):

    def __init__(self, name="python_random_client", debug=False) -> None:
        super().__init__(name, debug)

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
            random winning slot number in range [1, slot_count]
        """
        return randint(1, slot_count)

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
            Random winning slot number in range [1, slot_count] at 10% probability
        """
        # Switch winning slot to a random slots with 10% chance
        if switch_budget > 0 and randint(0, 9) == 0:
            return randint(1, slot_count)

        # return 0 to indicate no switch
        return 0

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
            `(slot_number, bet_amount)`: Pull a random slot with a random bet amount
        """
        slot_number = randint(0, slot_count)  # 0 to indicate stop playing
        bet_amount = randint(1, min(
            3, player_wealth))  # no greater than player's wealth
        return (slot_number, bet_amount)


if __name__ == '__main__':
    client = RandomClient(debug=True)

	# Room Types: "pvp", "vs_random_player", "vs_random_casino"
    client.start(room="vs_random_player")