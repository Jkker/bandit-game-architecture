# -*- coding: UTF-8 -*-

from client_interface import BanditClientInterface


class YourClient(BanditClientInterface):

    def __init__(self, name="your_team_name", debug=False) -> None:
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


if __name__ == '__main__':
    client = YourClient(debug=True)
    client.start()